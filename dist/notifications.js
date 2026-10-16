import './access.js?v=1.6.5';
const api=window.MarvelAccess,$=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={registration:'Registration requests',titleRequest:'Title suggestions',release:'App updates',message:'Messages',search:'Search engines',role:'Access changes',deletion:'Removal requests',titleAdded:'New titles',friend:'Friends'};
const category=type=>({titleRequestResolved:'titleRequest',titleRemoved:'deletion',deletionRequest:'deletion',deletionResolved:'deletion',friendRequest:'friend',friendAccepted:'friend'})[type]||type;
let rows=[],prefs={},settingsRef,unsub;
const safeLink=raw=>{try{const u=new URL(raw,location.href);return u.origin===location.origin&&u.pathname.startsWith(new URL('./',location.href).pathname)?u.href:'notifications.html'}catch{return'notifications.html'}};
function render(){
 const unread=rows.filter(x=>!x.readAt).length;
 $('#notification-status').textContent=`${unread} unread · ${rows.length} recent notifications`;
 $('#notification-list').innerHTML=rows.length?rows.map(n=>`<article class="notification-item ${n.readAt?'':'unread'}"><div><small>${escape(types[category(n.type)]||'Update')} · ${escape(n.createdAt?.toDate?.()?.toLocaleString()||'')}</small><h2>${escape(n.title)}</h2><p>${escape(n.body)}</p></div><div class="list-buttons"><a class="secondary" href="${escape(safeLink(n.url))}" data-open-alert="${escape(n.id)}">Open ↗</a>${n.readAt?'':`<button class="text-button" data-read="${escape(n.id)}">Mark read</button>`}</div></article>`).join(''):'<p class="subtle">No notifications yet.</p>';
 $('#mark-all-read').disabled=!unread;
}
function renderPrefs(){
 $('#notification-preferences').innerHTML=Object.entries(types).map(([key,label])=>`<label class="notification-pref"><span>${escape(label)}</span><input type="checkbox" data-pref="${key}" ${prefs[key]===false?'':'checked'}></label>`).join('');
}
document.addEventListener('click',async e=>{
 const link=e.target.closest('[data-open-alert]');if(link)e.preventDefault();
 const id=e.target.closest('[data-read]')?.dataset.read||link?.dataset.openAlert;
 if(id&&rows.some(x=>x.id===id&&!x.readAt)){
  try{await api.firestore.updateDoc(api.firestore.doc(api.db,'notifications',api.auth.currentUser.uid,'items',id),{readAt:api.firestore.serverTimestamp()})}catch{ /* The link still opens. */ }
 }
 if(link)location.assign(link.href);
});
$('#mark-all-read').onclick=async()=>{const uid=api.auth.currentUser?.uid;if(!uid)return;$('#mark-all-read').disabled=true;try{await Promise.all(rows.filter(x=>!x.readAt).map(x=>api.firestore.updateDoc(api.firestore.doc(api.db,'notifications',uid,'items',x.id),{readAt:api.firestore.serverTimestamp()})))}catch{$('#notification-status').textContent='Could not mark every alert read.'}};
$('#push-manage').onclick=()=>{sessionStorage.removeItem('marvel_push_dismissed');window.dispatchEvent(new Event('marvel-access-change'))};
$('#notification-preferences').onchange=async e=>{const key=e.target.dataset.pref;if(!Object.hasOwn(types,key))return;const next={...prefs,[key]:e.target.checked};e.target.disabled=true;try{await api.firestore.setDoc(settingsRef,{types:next,updatedAt:api.firestore.serverTimestamp()});prefs=next;$('#preference-status').textContent='Saved.'}catch{$('#preference-status').textContent='Could not save your preferences.';e.target.checked=!e.target.checked}finally{e.target.disabled=false}};
try{
 await api.ready;const uid=api.auth.currentUser.uid,f=api.firestore;
 settingsRef=f.doc(api.db,'notificationSettings',uid);
 const settings=await f.getDoc(settingsRef);prefs=settings.data()?.types||{};renderPrefs();
 unsub=f.onSnapshot(f.collection(api.db,'notifications',uid,'items'),snap=>{
  rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,100);render();
 },error=>{$('#notification-status').textContent=error?.code==='permission-denied'?'Publish the latest Firestore rules to open notifications.':'Could not load notifications.'});
}catch{$('#notification-status').textContent='Could not open notifications.'}
window.addEventListener('pagehide',()=>unsub?.());
