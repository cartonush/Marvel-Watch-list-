import './access.js?v=1.5.15';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api,uid,rows=[],catalog=[];
const cacheKey=()=>`marvel_friends_${uid}`;
const loadingDone=()=>{$('#friends-loading').hidden=true};
const message=s=>$('#friend-message').textContent=s;
const pair=(a,b)=>[a,b].sort().join('_');
const friendId=r=>r.a===uid?r.b:r.a;
const friendName=r=>r.a===uid?r.bName:r.aName;
const panel=(id,html)=>$(id).innerHTML=html||'<p class="subtle">Nothing here yet.</p>';
const errorText=e=>e?.code==='permission-denied'?'Friend access is blocked. Ask the owner to publish the version 1.5.3 Firestore rules.':'Could not complete this request. Please try again.';
function loadProgress(){
 if(!catalog.length)return;
 const accepted=rows.filter(r=>r.status==='accepted');
 void Promise.all(accepted.map(showProgress));
}
function renderRows(){
 const incoming=rows.filter(r=>r.status==='pending'&&r.requestedBy!==uid),outgoing=rows.filter(r=>r.status==='pending'&&r.requestedBy===uid),accepted=rows.filter(r=>r.status==='accepted');
 panel('#pending-requests',incoming.map(r=>`<div class="friend-entry"><div><strong>@${esc(friendName(r))}</strong><small>Wants to compare journeys</small></div><div class="list-buttons"><button class="primary" data-accept="${esc(r.id)}">Accept</button><button class="secondary" data-remove="${esc(r.id)}">Decline</button></div></div>`).join(''));
 panel('#sent-requests',outgoing.map(r=>`<div class="friend-entry"><div><strong>@${esc(friendName(r))}</strong><small>Waiting for approval</small></div><button class="secondary" data-remove="${esc(r.id)}">Cancel</button></div>`).join(''));
 panel('#accepted-friends',accepted.map(r=>`<div class="friend-entry"><div><strong>@${esc(friendName(r))}</strong><small id="progress-${esc(r.id)}">Loading progress…</small></div><button class="text-button" data-remove="${esc(r.id)}">Remove friend</button></div>`).join(''));
 loadingDone();loadProgress();
}
function showCachedFriends(){
 try{
  const saved=JSON.parse(sessionStorage.getItem(cacheKey())||'null');
  if(saved&&Date.now()-saved.time<600000&&Array.isArray(saved.rows)){
   rows=saved.rows.filter(r=>r&&typeof r.id==='string'&&['pending','accepted'].includes(r.status));
   renderRows();message('Refreshing friends…');
  }
 }catch{ /* Cache is optional. */ }
}
async function refresh(){
 const f=api.firestore,c=f.collection(api.db,'friendships');
 try{
  const [first,second]=await Promise.all([f.getDocs(f.query(c,f.where('a','==',uid))),f.getDocs(f.query(c,f.where('b','==',uid)))]);
  rows=[...new Map([...first.docs,...second.docs].map(d=>[d.id,{id:d.id,...d.data()}])).values()];
  try{sessionStorage.setItem(cacheKey(),JSON.stringify({time:Date.now(),rows:rows.map(({id,a,b,aName,bName,requestedBy,status})=>({id,a,b,aName,bName,requestedBy,status}))}));}catch{ /* Storage may be unavailable. */ }
  renderRows();message('');
 }catch(e){loadingDone();message(errorText(e));if(!rows.length)for(const id of ['#pending-requests','#sent-requests','#accepted-friends'])panel(id,'<p class="subtle">Could not load friends.</p>')}
}
async function showProgress(r){
 const f=api.firestore,el=document.getElementById('progress-'+r.id);if(!el)return;
 try{
  const snap=await f.getDoc(f.doc(api.db,'friendProgress',friendId(r)));
  if(!snap.exists()){el.textContent='No watch progress shared yet. Open the watchlist to share it.';return}
  const watched=snap.data().watched||{},all=catalog.filter(x=>!x.catalogAdded&&!x.archived);
  const finished=all.filter(x=>(watched[x.id]||0)>=x.episodes).length;
  const my=window.MarvelCookies?.read('marvel_watch_v1')?.p||[];
  const suggestion=all.filter(x=>x.kind==='movie'&&x.url?.startsWith('https://')).sort((a,b)=>Number(a.group==='extra')-Number(b.group==='extra')||a.order-b.order).find(x=>(watched[x.id]||0)<x.episodes&&(my[catalog.indexOf(x)]||0)<x.episodes);
  el.innerHTML=`${finished} / ${all.length} titles watched${suggestion?` · Movie night: <a href="${esc(suggestion.url)}" target="_blank" rel="noopener noreferrer">${esc(suggestion.title)} ↗</a>`:''}`;
 }catch{el.textContent='Progress unavailable right now.'}
}
$('#send-request').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),name=form.elements.namedItem('username').value.trim().toLowerCase();
 if(!/^[a-z][a-z0-9_]{2,23}$/.test(name)){message('Enter a valid username.');return}
 button.disabled=true;message('Sending request…');
 try{
  if(name===api.account.username)throw Error('You cannot add yourself.');
  const f=api.firestore,handle=await f.getDoc(f.doc(api.db,'handles',name));
  if(!handle.exists())throw Error('Username not found. That person may need to open the updated site first.');
  const target=handle.data().uid,id=pair(uid,target),ref=f.doc(api.db,'friendships',id),row=rows.find(r=>r.id===id);
  if(row){
   if(row.status==='accepted')throw Error('You are already friends.');
   if(row.requestedBy===uid)throw Error('Your request is already pending.');
   await f.updateDoc(ref,{status:'accepted',updatedAt:f.serverTimestamp()});message(`You and @${name} are now friends.`);
  }else{
   const mine=api.account.username,a=uid<target?uid:target;
   await f.setDoc(ref,{a,b:a===uid?target:uid,aName:a===uid?mine:name,bName:a===uid?name:mine,requestedBy:uid,status:'pending',createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()});
   message(`Request sent to @${name}.`);
  }
  form.reset();await refresh();
 }catch(err){message(err.message?.startsWith('You ')||err.message?.startsWith('Username ')?err.message:errorText(err))}finally{button.disabled=false}
};
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-accept],[data-remove]');if(!button)return;
 const id=button.dataset.accept||button.dataset.remove,row=rows.find(r=>r.id===id);if(!row)return;
 button.disabled=true;
 try{const f=api.firestore,ref=f.doc(api.db,'friendships',id);if(button.dataset.accept){if(row.requestedBy===uid)throw Error('Only the recipient can accept.');await f.updateDoc(ref,{status:'accepted',updatedAt:f.serverTimestamp()});message(`You and @${friendName(row)} are now friends.`)}else{await f.deleteDoc(ref);message('Request or friendship removed.')}await refresh()}catch(err){message(errorText(err));button.disabled=false}
});
$('#refresh-friends').onclick=refresh;
try{
 api=globalThis.MarvelAccess;
 // Load the local catalog independently so the friends list can render as soon as Firestore responds.
 const baseCatalog=fetch('data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('catalog');return r.json()});
 await api.ready;uid=api.auth.currentUser.uid;
 showCachedFriends();
 await refresh();
 catalog=(await baseCatalog).items;loadProgress();
}catch(e){loadingDone();message('Could not load friends. Please reload the page.')}
