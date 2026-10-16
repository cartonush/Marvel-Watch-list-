import { vapidPublicKey } from './push-config.js';

let currentUid = null;
let notice;
const mobileApple = /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function message(value) { const target = notice?.querySelector('[data-push-message]'); if (target) target.textContent = value; }
function deviceId() {
  const key = 'marvel_push_device';
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
}
function keyBytes(value) {
  const bytes = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(bytes, char => char.charCodeAt(0));
}
async function registration() { return navigator.serviceWorker.register('push-worker.js', { scope: './' }); }

async function enable() {
  const api = window.MarvelAccess;
  if (!api?.account || !api.auth.currentUser || !supported) return;
  const button = notice?.querySelector('[data-push-enable]');
  if (button) button.disabled = true;
  try {
    // iOS requires this call inside the button's user activation.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { message('Notifications were not allowed. Change this in your device settings to try again.'); return; }
    const worker = await registration();
    const subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) });
    if (!api.account || api.auth.currentUser?.uid !== currentUid) return;
    await api.firestore.setDoc(api.firestore.doc(api.db, 'pushSubscriptions', currentUid, 'devices', deviceId()), {
      subscription: subscription.toJSON(), updatedAt: api.firestore.serverTimestamp()
    });
    message('Notifications enabled on this device. Alerts will arrive when the sender is connected.');
    notice?.querySelector('[data-push-enable]')?.setAttribute('hidden', '');
  } catch (error) {
    console.error('Push registration failed', error);
    message(error?.code === 'permission-denied' ? 'Publish the latest Firestore rules to enable notifications.' : 'Could not enable notifications. Try again after setup is complete.');
  } finally { if (button) button.disabled = false; }
}

async function show(force = false) {
  const api = window.MarvelAccess;
  if (!api?.account || !api.auth.currentUser) { notice?.remove(); notice = null; currentUid = null; return; }
  currentUid = api.auth.currentUser.uid;
  if (!force && sessionStorage.getItem('marvel_push_dismissed')) return;
  if (!notice) {
    notice = document.createElement('aside');
    notice.className = 'push-opt-in';
    notice.setAttribute('aria-label', 'Notifications');
    document.body.append(notice);
  }
  const unavailable = !supported ? 'This browser does not support Web Push.' : mobileApple && !standalone ? 'On iPhone, first use Share → Add to Home Screen, then open Marvel List from its icon.' : '';
  if (!unavailable) registration().catch(() => {});
  let already = false;
  if (supported && !unavailable && Notification.permission === 'granted') {
    try { already = !!(await (await registration()).pushManager.getSubscription()); } catch { /* The visible action can retry. */ }
  }
  if (currentUid !== api.auth.currentUser?.uid) return;
  notice.innerHTML = `<button type="button" class="push-dismiss" aria-label="Dismiss notification setup">×</button><strong>Registration alerts</strong><p data-push-message></p><button type="button" class="primary" data-push-enable>Enable notifications</button>`;
  message(unavailable || (Notification.permission === 'denied' ? 'Notifications are blocked in this device’s settings.' : already ? 'Notifications are enabled on this device.' : 'Get alerts for your account, messages and Marvel List updates.'));
  notice.querySelector('[data-push-enable]').hidden = !!unavailable || already || Notification.permission === 'denied';
  notice.querySelector('[data-push-enable]').addEventListener('click', enable);
  notice.querySelector('.push-dismiss').addEventListener('click', () => { sessionStorage.setItem('marvel_push_dismissed', '1'); notice.remove(); notice = null; });
}

window.addEventListener('marvel-access-change', () => void show());
document.addEventListener('click', event => {
  if (!event.target.closest('[data-open-notifications]')) return;
  document.getElementById('account-actions')?.setAttribute('hidden', '');
  sessionStorage.removeItem('marvel_push_dismissed');
  void show(true);
});
void show();
