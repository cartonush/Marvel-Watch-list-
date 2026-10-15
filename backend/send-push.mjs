import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webPush from 'web-push';

const encoded = process.env.MARVEL_FIREBASE_SERVICE_ACCOUNT_B64;
const privateKey = process.env.MARVEL_VAPID_PRIVATE_KEY;
if (!encoded || !privateKey) throw Error('Missing push sender secrets. See backend/README.md.');
const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
if (credentials.project_id !== 'marvel-list-database') throw Error('Unexpected Firebase project.');
initializeApp({ credential: cert(credentials) });
const db = getFirestore();
webPush.setVapidDetails('https://cartonush.github.io/Marvel-Watch-list-/',
  'BEOtvbBWZ0pgbHNywsagZCfvrrjIF8vnrONY84txRMUG7-39vgFqgKx4wkrvfy5B2sFpY_aAQNhC4QHPbf3b1HI', privateKey);

const owner = (await db.doc('system/owner').get()).data()?.uid;
if (!owner) throw Error('Owner account has not been bootstrapped.');
const devices = await db.collection('pushSubscriptions').doc(owner).collection('devices').get();
if (devices.empty) { console.log('No owner devices subscribed.'); process.exit(0); }

const pending = await db.collection('users').where('status', '==', 'pending').get();
let sent = 0;
for (const account of pending.docs) {
  if (account.id === owner || !(account.data().createdAt?.toMillis?.())) continue;
  const marker = db.doc(`pushDelivered/${account.id}`);
  if ((await marker.get()).exists) continue;
  const username = String(account.data().username || 'a new user').replace(/[^a-z0-9_]/g, '').slice(0, 24);
  const payload = JSON.stringify({ title: 'New registration request', body: `@${username} is waiting for approval.`, tag: `signup-${account.id}` });
  let delivered = false;
  for (const device of devices.docs) {
    try {
      await webPush.sendNotification(device.data().subscription, payload, { TTL: 3600 });
      delivered = true;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await device.ref.delete();
      else console.error('Push delivery failed', error.statusCode || error.message);
    }
  }
  if (delivered) { await marker.create({ deliveredAt: new Date(), type: 'registration', uid: account.id }); sent++; }
}
console.log(`Sent ${sent} registration alerts.`);
