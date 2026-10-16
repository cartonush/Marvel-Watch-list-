import {readFileSync} from 'node:fs';
import {initializeApp,cert} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import webPush from 'web-push';
import {rank,recipients} from './notification-policy.mjs';

const encoded=process.env.MARVEL_FIREBASE_SERVICE_ACCOUNT_B64;
const privateKey=process.env.MARVEL_VAPID_PRIVATE_KEY;
if(!encoded||!privateKey)throw Error('Missing sender secrets. See backend/README.md.');
const credentials=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
if(credentials.project_id!=='marvel-list-database')throw Error('Unexpected Firebase project.');
initializeApp({credential:cert(credentials)});
const db=getFirestore();
webPush.setVapidDetails('https://cartonush.github.io/Marvel-Watch-list-/',
 'BEOtvbBWZ0pgbHNywsagZCfvrrjIF8vnrONY84txRMUG7-39vgFqgKx4wkrvfy5B2sFpY_aAQNhC4QHPbf3b1HI',privateKey);
const owner=(await db.doc('system/owner').get()).data()?.uid;
if(!owner)throw Error('Owner account has not been bootstrapped.');
const stateRef=db.doc('notificationStates/system');
const cursor=(await stateRef.get()).data()?.lastScan||Timestamp.fromMillis(Date.now()-10*60_000);
const until=Timestamp.now();
const staticTitles=new Map(JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8')).items.map(x=>[x.id,x.title]));
let usersCache,created=0,pushed=0;
const devicesCache=new Map(),preferencesCache=new Map();
async function users(){
 if(!usersCache){const docs=await db.collection('users').get();usersCache=Object.fromEntries(docs.docs.map(x=>[x.id,x.data()]));}
 return usersCache;
}
const stamp=t=>t?`${t.seconds}_${t.nanoseconds}`:'unknown';
const slug=s=>String(s||'').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,120);
const username=(all,uid)=>String(all[uid]?.username||'a member').slice(0,24);
const titleName=id=>staticTitles.get(id)||'a title';
const plain=s=>String(s||'').replace(/[\r\n\t]/g,' ').slice(0,150);
const preferenceType=type=>({titleRequestResolved:'titleRequest',titleRemoved:'deletion',deletionRequest:'deletion',deletionResolved:'deletion',friendRequest:'friend',friendAccepted:'friend'})[type]||type;
async function alert(type,eventKey,data,title,body,url,when){
 const eventId=slug(eventKey),marker=db.doc(`notificationEvents/${eventId}`);
 if((await marker.get()).exists)return;
 const all=await users(),targets=recipients(type,data,all,owner);
 for(const uid of targets){
  const inbox=db.doc(`notifications/${uid}/items/${eventId}`);
  const content={type,title:plain(title),body:plain(body),url,readAt:null,createdAt:when||until};
  try{await inbox.create(content);created++}catch(error){if(error.code!==6)throw error}
  const existing=(await inbox.get()).data();
  if(existing?.pushedAt)continue;
  if(!preferencesCache.has(uid))preferencesCache.set(uid,(await db.doc(`notificationSettings/${uid}`).get()).data()?.types||{});
  if(preferencesCache.get(uid)[preferenceType(type)]===false){await inbox.update({pushedAt:until});continue}
  if(!devicesCache.has(uid))devicesCache.set(uid,(await db.collection('pushSubscriptions').doc(uid).collection('devices').get()).docs);
  const payload=JSON.stringify({title,body,url,tag:eventId});
  for(const device of devicesCache.get(uid)){
   try{await webPush.sendNotification(device.data().subscription,payload,{TTL:3600});pushed++}
   catch(error){if([404,410].includes(error.statusCode))await device.ref.delete();else console.error(`Push delivery failed for a device: ${error.statusCode||error.message}`)}
  }
  await inbox.update({pushedAt:until});
 }
 await marker.create({type,createdAt:until});
}
async function changed(collection,field,handle){
 const snapshot=await db.collection(collection).where(field,'>',cursor).where(field,'<=',until).get();
 for(const doc of snapshot.docs)await handle(doc.id,doc.data());
}
await changed('users','updatedAt',async(uid,u)=>{
 const all=await users();all[uid]=u;
 const key=`user_${uid}_${stamp(u.updatedAt)}`;
 if(u.status==='pending')await alert('registration',key,{uid},'New registration request',`@${username(all,uid)} is waiting for approval.`,'index.html?manage=1',u.updatedAt);
 else{
  const roleState=db.doc(`notificationStates/user_${slug(uid)}`),previous=(await roleState.get()).data();
  const previousRank=previous?.rank??0;
  const role=u.status==='disabled'?'access removed':uid===owner?'owner':u.Fmanage?'senior manager':u.manage?'manager':'viewer';
  await alert('role',key,{uid,previousRank},'Access updated',`@${username(all,uid)} now has ${role} access.`,uid===owner?'notifications.html':'index.html?manage=1',u.updatedAt);
 }
 await db.doc(`notificationStates/user_${slug(uid)}`).set({rank:rank(uid,u,owner),status:u.status,updatedAt:until});
});
await changed('titleRequests','updatedAt',async(id,r)=>{
 const type=r.status==='pending'?'titleRequest':'titleRequestResolved';
 await alert(type,`title_request_${id}_${stamp(r.updatedAt)}`,r,
  r.status==='pending'?'New title suggestion':'Title suggestion reviewed',
  r.status==='pending'?`${plain(r.title)} was suggested for the collection.`:`Your suggestion for ${plain(r.title)} was ${r.status}.`,
  r.status==='pending'?'index.html?manage=1':'notifications.html',r.updatedAt);
});
await changed('deletionRequests','updatedAt',async(id,r)=>{
 const type=r.status==='pending'?'deletionRequest':r.status==='approved'?'titleRemoved':'deletionResolved';
 await alert(type,`deletion_${id}_${stamp(r.updatedAt)}`,r,
  r.status==='pending'?'Title removal requested':r.status==='approved'?'Title removed':'Removal request rejected',
  r.status==='pending'?`${titleName(r.titleId)} was requested for removal.`:r.status==='approved'?`${titleName(r.titleId)} was archived by the owner.`:`The request to remove ${titleName(r.titleId)} was rejected.`,
  r.status==='pending'?'index.html?manage=1':'notifications.html',r.updatedAt);
});
await changed('searchEngines','updatedAt',async(id,r)=>alert('search',`search_${id}_${stamp(r.updatedAt)}`,r,
 'Search sources updated',`${plain(r.name)} now searches ${r.sites?.length||0} sites.`,'search.html',r.updatedAt));
await changed('friendships','updatedAt',async(id,r)=>{
 const type=r.status==='pending'?'friendRequest':r.status==='accepted'?'friendAccepted':null;
 if(type)await alert(type,`friend_${id}_${stamp(r.updatedAt)}`,r,
  type==='friendRequest'?'New friend request':'Friend request accepted',
  type==='friendRequest'?'A Marvel fan wants to connect with you.':'You can now compare watchlists and exchange messages.','friends.html',r.updatedAt);
});
await changed('titles','createdAt',async(id,r)=>alert('titleAdded',`title_${id}_${stamp(r.createdAt)}`,r,
 'New Marvel title',`${plain(r.title)} was added to the collection.`,'index.html',r.createdAt));
await changed('messages','createdAt',async(id,r)=>{
 const all=await users();await alert('message',`message_${id}_${stamp(r.createdAt)}`,r,
  `Message from @${username(all,r.from)}`,'Open Marvel List to read your message.',`messages.html?friend=${encodeURIComponent(r.from)}`,r.createdAt);
});
const home=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const version=/Site version ([0-9.]+)/.exec(home)?.[1];
if(version)await alert('release',`release_${version}`,{},'Marvel List updated',`Version ${version} is ready. See what\'s new.`,'index.html',until);
await stateRef.set({lastScan:until,updatedAt:Timestamp.now()});
console.log(`Created ${created} inbox alerts and delivered ${pushed} device alerts.`);
