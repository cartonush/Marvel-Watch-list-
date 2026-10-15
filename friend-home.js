import './access.js?v=1.6.2';
import {cleanDoc} from './sync-core.mjs';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routeNames={mcu:'All MCU (based on Wikipedia)',marvel:'All Marvel',personal:'My personal list',all:'Full collection · MCU first',focused:'Road · 15-title speedrun',expanded:'Road · main route',optional:'Road · side quests',roadAll:'Road · including side quests'};
const phaseNames={1:'Phase 1',2:'Phase 2',3:'Phase 3',4:'Phase 4',5:'Phase 5',6:'Phase 6',7:'Phase 7',extra:'Road to Doomsday',legacy:'Marvel Television',shorts:'MCU short films',bonus:'MCU companion content',future:'Announced',nonmcu:'Marvel films',live:'Marvel television',animation:'Marvel animation',web:'Marvel digital series',imprints:'Marvel imprints'};
const main=$('main'),api=globalThis.MarvelAccess;
let catalog,items=[],doc,username='',filter='all',term='',targetUid='',friendUnsub,watchUnsub,lastSync=null;
document.body.classList.add('friend-home-page');
document.getElementById('modal')?.remove();
document.getElementById('admin-modal')?.remove();
main.innerHTML='<section class="saved-list friend-home-loading" role="status">Opening your friend’s watchlist…</section>';
const errorPage=message=>{doc=null;main.innerHTML=`<section class="saved-list friend-home-loading"><h1>Friend’s watchlist unavailable</h1><p>${esc(message)}</p><a class="secondary" href="friends.html">← Back to friends</a></section>`};
const pair=(a,b)=>[a,b].sort().join('_');
const safePoster=value=>{
 if(/^assets\/[a-zA-Z0-9_-]+\.webp$/.test(value||''))return value;
 if(/^imdb:tt\d{7,10}$/.test(value||''))return `https://images.metahub.space/poster/medium/${value.slice(5)}/img`;
 try{const u=new URL(value);if(u.protocol==='https:'&&u.hostname==='m.media-amazon.com'&&u.pathname.startsWith('/images/')&&!u.username&&!u.password)return u.href}catch{}
 return '';
};
const dateValue=s=>{if(/^\d{4}$/.test(s||''))return Date.UTC(+s,11,31);const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s||'');return m?Date.UTC(+m[3],+m[2]-1,+m[1]):Infinity};
const formatTime=n=>{if(n==null)return 'Runtime unknown';const h=Math.floor(n/3600),m=Math.floor(n%3600/60);return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m`};
function selectedRoute(){
 const route=Object.hasOwn(routeNames,doc.settings.route)?doc.settings.route:'all';
 const list=doc.lists[doc.activeList],activeList=list&&!list.deleted?list:null;
 const matches=x=>!x.archived&&(route==='mcu'?x.collections?.includes('mcu'):
  route==='marvel'?true:route==='personal'?!!activeList?.ids.includes(x.id):
  route==='all'?!x.catalogAdded:route==='focused'?catalog.roadSpeedrun.includes(x.id):
  route==='expanded'?['req','core'].includes(x.roadTier):route==='optional'?x.roadTier==='opt':x.roadTier!=='unlisted');
 const rows=items.filter(matches);
 if(route==='personal')rows.sort((a,b)=>dateValue(a.date)-dateValue(b.date)||a.order-b.order);
 else if(route==='mcu'||route==='marvel')rows.sort((a,b)=>route==='mcu'?(String(a.wikiGroup||a.group).localeCompare(String(b.wikiGroup||b.group),undefined,{numeric:true})||dateValue(a.date)-dateValue(b.date)||a.order-b.order):dateValue(a.date)-dateValue(b.date)||a.order-b.order);
 else if(route==='all')rows.sort((a,b)=>Number(a.group==='extra')-Number(b.group==='extra')||a.order-b.order);
 else rows.sort((a,b)=>(a.roadOrder??999)-(b.roadOrder??999)||a.order-b.order);
 return {route,rows,label:route==='personal'?(activeList?.name||'Personal list unavailable'):routeNames[route]};
}
function nextItem(route,rows){
 if(['expanded','optional','roadAll'].includes(route)){
  for(const step of catalog.roadSteps||[]){const x=rows.find(x=>x.id===step.id);if(x&&(doc.progress[x.id]||0)<step.target&&!doc.skipped[x.id])return x}
 }
 return rows.find(x=>x.releaseStatus!=='upcoming'&&(doc.progress[x.id]||0)<x.episodes&&!doc.skipped[x.id]);
}
const itemGroup=(x,route)=>['mcu','marvel'].includes(route)?x.wikiGroup||x.group:x.group;
function card(x){
 const n=doc.progress[x.id]||0,done=n===x.episodes,skipped=!!doc.skipped[x.id],poster=safePoster(x.poster);
 return `<article class="card ${done?'done':skipped?'skipped':''}"><div class="poster"><div class="poster-placeholder"><small>MARVEL WATCH</small><b>${esc(x.title)}</b></div>${poster?`<img src="${esc(poster)}" alt="Poster for ${esc(x.title)}" loading="lazy" decoding="async">`:''}<span class="poster-label">${done?'✓ Watched':skipped?'↷ Skipped':n?`${n} / ${x.episodes} episodes watched`:'Not watched'}</span></div><div class="card-info"><h4>${esc(x.title)}</h4><div class="card-meta"><span>${esc(x.date||'Date TBA')}</span><span>${formatTime(x.seconds)}</span></div><div class="friend-item-progress"><i style="width:${Math.round(n/x.episodes*100)}%"></i></div><div class="card-actions"><button class="secondary" data-friend-title="${esc(x.id)}">${x.episodes>1?'View episodes':'View details'}</button></div></div></article>`;
}
function render(){
 if(!doc)return;
 const {route,rows,label}=selectedRoute(),next=nextItem(route,rows),done=rows.filter(x=>(doc.progress[x.id]||0)===x.episodes).length;
 const episodes=rows.reduce((n,x)=>n+(doc.progress[x.id]||0),0),totalEpisodes=rows.reduce((n,x)=>n+x.episodes,0);
 const watchedSeconds=rows.reduce((n,x)=>n+(x.seconds||0)*(doc.progress[x.id]||0)/x.episodes,0),totalSeconds=rows.reduce((n,x)=>n+(x.seconds||0),0);
 const unknown=rows.filter(x=>x.seconds==null&&(doc.progress[x.id]||0)<x.episodes).length;
 const poster=next&&safePoster(next.poster),n=next?doc.progress[next.id]||0:0;
 const visible=rows.filter(x=>(!term||x.title.toLowerCase().includes(term))&&(filter==='all'||filter==='done'&&(doc.progress[x.id]||0)===x.episodes||filter==='started'&&(doc.progress[x.id]||0)>0&&(doc.progress[x.id]||0)<x.episodes||filter==='todo'&&(doc.progress[x.id]||0)===0&&!doc.skipped[x.id]||filter==='skipped'&&doc.skipped[x.id]));
 const groups=[];for(const x of visible){const g=itemGroup(x,route);if(!groups.includes(g))groups.push(g)}
 document.documentElement.dataset.theme=doc.settings.theme==='light'?'light':doc.settings.theme==='system'&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
 document.documentElement.dataset.accent=['red','purple','gold'].includes(doc.settings.accent)?doc.settings.accent:'red';
 const syncedAt=lastSync?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jerusalem'}).format(lastSync):'Not available';
 main.innerHTML=`<div class="friend-home-top"><a href="friends.html" class="secondary">← Back to friends</a><span class="friend-readonly">READ ONLY · LAST SYNCED ${esc(syncedAt)}</span></div>
 <section class="doomsday-countdown" aria-labelledby="friend-deadline"><div class="eyebrow small">THE COUNTDOWN IS ON</div><h2 id="friend-deadline">Time until Doomsday releases</h2><p class="deadline-date">December 18, 2026 · 20:00 Israel time</p><div class="countdown-clock" role="timer" aria-live="off"><div><strong id="friend-days">--</strong><span>Days</span></div><div><strong id="friend-hours">--</strong><span>Hours</span></div><div><strong id="friend-minutes">--</strong><span>Minutes</span></div><div><strong id="friend-seconds">--</strong><span>Seconds</span></div></div><div class="daily-pace"><strong id="friend-pace">— h/d</strong><span>Daily viewing to finish this route</span></div><p class="deadline-note">${unknown?`Excludes ${unknown} titles with unknown runtime.`:'Based on known runtimes.'}</p></section>
 <section class="route-summary friend-route"><div><div class="eyebrow small">@${esc(username)}’S JOURNEY</div><h1>${esc(doc.name)}</h1><strong>${esc(label)}</strong><span>${done} / ${rows.length} titles completed · ${episodes} / ${totalEpisodes} movies & episodes</span></div><a class="secondary" href="index.html">My watchlist ↗</a></section>
 <section class="next-watch next-watch-hero" aria-labelledby="friend-next-title">${next?`${poster?`<img class="next-backdrop" src="${esc(poster)}" alt="">`:''}<div class="next-poster poster">${poster?`<img src="${esc(poster)}" alt="Poster for ${esc(next.title)}">`:''}</div><div class="next-copy"><div class="eyebrow small">@${esc(username)}’S NEXT CHAPTER</div><h2 id="friend-next-title">Next to watch</h2><h2 class="next-title">${esc(next.title)}</h2><div class="detail-meta"><span class="pill">${esc(phaseNames[itemGroup(next,route)]||'Marvel')}</span><span class="pill">${n} / ${next.episodes} watched</span><span class="pill">${formatTime(next.seconds)}</span></div><p>This is the first unwatched title in your friend’s selected route.</p></div>`:`<div class="next-copy"><div class="eyebrow small">@${esc(username)}’S NEXT CHAPTER</div><h2 id="friend-next-title">${rows.length?'All caught up or waiting for a release':'No titles in this route'}</h2><p>Open the complete collection below to see their progress.</p></div>`}</section>
 <div class="stats"><div class="stat"><span class="stat-icon">◉</span><div class="stat-label">Journey completed</div><div class="stat-value">${rows.length?Math.round(done/rows.length*100):0}%</div><div class="stat-note">${done} of ${rows.length} titles</div></div><div class="stat"><span class="stat-icon">✓</span><div class="stat-label">Movies & episodes watched</div><div class="stat-value">${episodes} <small>/ ${totalEpisodes}</small></div></div><div class="stat"><span class="stat-icon">◷</span><div class="stat-label">Time watched</div><div class="stat-value friend-time">${formatTime(watchedSeconds)}</div></div><div class="stat"><span class="stat-icon">⌛</span><div class="stat-label">Still to watch</div><div class="stat-value friend-time">${formatTime(totalSeconds-watchedSeconds)}</div></div></div>
 <section class="collection"><div class="collection-heading"><div><div class="eyebrow small">THE COMPLETE COLLECTION</div><h2>${esc(label)} <span>${rows.length} titles</span></h2></div></div><div class="filter-row"><label class="search"><span>⌕</span><input id="friend-search" type="search" value="${esc(term)}" placeholder="Search your friend’s titles…" aria-label="Search titles"></label></div><div class="status-row"><div class="tabs" role="group" aria-label="Watch status">${[['all','All'],['todo','Not watched'],['started','In progress'],['done','Watched'],['skipped','Skipped']].map(([id,label])=>`<button type="button" data-friend-filter="${id}" class="${filter===id?'selected':''}">${label}</button>`).join('')}</div><span id="results-label">${visible.length} results</span></div><div id="friend-catalog">${visible.length?groups.map(g=>{const list=visible.filter(x=>itemGroup(x,route)===g);return `<section><div class="phase-heading"><span class="phase-number">${/^\d+$/.test(g)?String(g).padStart(2,'0'):'✧'}</span><div><h3>${esc(phaseNames[g]||g)}</h3></div><span class="phase-line"></span><span class="phase-progress">${rows.filter(x=>itemGroup(x,route)===g&&(doc.progress[x.id]||0)===x.episodes).length} / ${rows.filter(x=>itemGroup(x,route)===g).length} complete</span></div><div class="cards">${list.map(card).join('')}</div></section>`}).join(''):'<div class="empty">No titles match this view.</div>'}</div></section>
 <dialog id="friend-detail" class="friend-detail"><button type="button" class="close-modal" aria-label="Close details">×</button><div id="friend-detail-content"></div></dialog>`;
 main.querySelectorAll('.poster img').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
 updateClock(totalSeconds-watchedSeconds);
}
function updateClock(remaining){
 if(!doc)return;const end=Date.UTC(2026,11,18,18),ms=Math.max(0,end-Date.now()),total=Math.floor(ms/1000);
 const parts=[Math.floor(total/86400),Math.floor(total%86400/3600),Math.floor(total%3600/60),total%60];
 ['days','hours','minutes','seconds'].forEach((key,i)=>{const el=$('#friend-'+key);if(el)el.textContent=String(parts[i]).padStart(i?2:1,'0')});
 const pace=$('#friend-pace');if(pace)pace.textContent=ms?`${(remaining/3600/(ms/86400000)).toFixed(1)} h/d`:'Released';
}
main.addEventListener('input',e=>{if(e.target.id==='friend-search'){term=e.target.value.trim().toLowerCase();render();const input=$('#friend-search');input.focus();input.setSelectionRange(input.value.length,input.value.length)}});
main.addEventListener('click',e=>{
 const filterButton=e.target.closest('[data-friend-filter]');if(filterButton){filter=filterButton.dataset.friendFilter;render();return}
 const detailButton=e.target.closest('[data-friend-title]');if(detailButton){const x=items.find(x=>x.id===detailButton.dataset.friendTitle);if(!x||!doc)return;const n=doc.progress[x.id]||0,dialog=$('#friend-detail');$('#friend-detail-content').innerHTML=`<div class="modal-kicker">@${esc(username)}’S PROGRESS</div><h2>${esc(x.title)}</h2><p>${n} of ${x.episodes} ${x.episodes>1?'episodes':'title'} watched · ${esc(x.date||'Date unknown')}</p>${x.episodes>1?`<div class="episode-grid">${Array.from({length:Math.min(x.episodes,60)},(_,i)=>`<span class="friend-episode ${i<n?'complete':''}">Episode ${i+1} ${i<n?'✓':''}</span>`).join('')}</div>${x.episodes>60?'<p>Showing the first 60 episodes.</p>':''}`:''}<p class="subtle">Read only. Only your friend can update this progress.</p>`;dialog.showModal();return}
 if(e.target.closest('#friend-detail .close-modal'))$('#friend-detail').close();
});
(async()=>{
 try{
  await api.ready;const me=api.auth.currentUser?.uid,requested=new URLSearchParams(location.search).get('friend')||'';
  if(!me||!api.account||!requested||requested.length>128||!/^[a-zA-Z0-9_-]+$/.test(requested)||requested===me){errorPage('Choose an accepted friend from My friends.');return}
  targetUid=requested;const f=api.firestore,friendRef=f.doc(api.db,'friendships',pair(me,targetUid));
  const snap=await f.getDocFromServer(friendRef),relation=snap.data();
  if(!snap.exists()||relation.status!=='accepted'||![relation.a,relation.b].includes(me)||![relation.a,relation.b].includes(targetUid)){errorPage('Only accepted friends can see each other’s watchlists.');return}
  username=relation.a===targetUid?relation.aName:relation.bName;
  const response=await fetch('data.json',{cache:'no-cache'});if(!response.ok)throw Error('Catalog unavailable');
  catalog=await api.enrich(await response.json());items=catalog.items;
  const watchRef=f.doc(api.db,'userWatch',targetUid),watch=await f.getDocFromServer(watchRef);
  if(!watch.exists()){errorPage('Your friend has not synced their watchlist yet. Ask them to open their watchlist once and wait for the sync confirmation.');return}
  doc=cleanDoc(watch.data(),items);lastSync=watch.data().updatedAt?.toDate?.()||null;render();
  friendUnsub=f.onSnapshot(friendRef,relation=>{if(relation.metadata.fromCache)return;if(!relation.exists()||relation.data().status!=='accepted'){watchUnsub?.();errorPage('This friendship has ended. The watchlist is no longer available.')}},()=>{watchUnsub?.();errorPage('Friend access is no longer available.')});
  watchUnsub=f.onSnapshot(watchRef,watch=>{if(watch.metadata.fromCache)return;if(watch.exists()){doc=cleanDoc(watch.data(),items);lastSync=watch.data().updatedAt?.toDate?.()||null;render()}},()=>errorPage('Your friend’s watchlist is no longer available.'));
  setInterval(()=>{if(doc){const {rows}=selectedRoute();updateClock(rows.reduce((n,x)=>n+(x.seconds||0)*(1-(doc.progress[x.id]||0)/x.episodes),0))}},1000);
 }catch(error){console.error('Could not open friend watchlist',error);errorPage(error?.code==='permission-denied'?'Friend access is blocked. Publish the updated Firestore rules, then reload.':'Could not load your friend’s watchlist. Try again later.')}
})();
