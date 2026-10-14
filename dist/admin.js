import './access.js?v=1.5.12';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imdbId(value){try{const u=new URL(value.trim());if(u.protocol!=='https:'||!['imdb.com','www.imdb.com','m.imdb.com'].includes(u.hostname))return null;return /^\/title\/(tt\d{7,10})\/?$/.exec(u.pathname)?.[1]||null}catch{return null}}
function directPoster(value){try{const u=new URL(value.trim());return u.protocol==='https:'&&u.hostname==='m.media-amazon.com'&&u.pathname.startsWith('/images/')&&!u.username&&!u.password?u.href:null}catch{return null}}
const suggestedPoster=id=>`https://images.metahub.space/poster/medium/${id}/img`;
let api,account,ownerId,allTitles=[],loading=false,loadedUid=null;
const loadedPanels=new Set();
const note=s=>$('#admin-message').textContent=s;
const authorized=()=>!!account&&(account.manage===true||account.Fmanage===true||!!api?.isOwner);
const management=$('#management-view'),adminModal=$('#admin-modal');
function openManagement(){
  management.hidden=false;
  showDashboard();
  if(!authorized()){$('#admin-content').hidden=true;note(api?.account?'This account does not have management access.':'Checking your management access…');}
  if(!adminModal.open)adminModal.showModal();
  if(authorized())load().catch(()=>note('Could not load management data.'));
}
function exitManagement(){if(adminModal.open)adminModal.close();}
function closeManagement(){
  if(!$('#admin-dashboard').hidden&&adminModal.open){exitManagement();return}
  if(adminModal.open&&authorized())showDashboard();
  else exitManagement();
}
$('#manage-nav')?.addEventListener('click',openManagement);
document.addEventListener('marvel-open-management',openManagement);
$('#leave-management').addEventListener('click',closeManagement);
$('#close-admin-modal').addEventListener('click',closeManagement);
adminModal.addEventListener('click',e=>{if(e.target===adminModal)closeManagement()});
adminModal.addEventListener('cancel',e=>{
  if($('#admin-dashboard').hidden&&authorized()){e.preventDefault();showDashboard();}
});
adminModal.addEventListener('close',()=>{management.hidden=true});
function showDashboard(){
  $('#admin-dashboard').hidden=false;
  document.querySelectorAll('[data-admin-screen]').forEach(el=>{el.hidden=true});
  $('#leave-management').textContent='← Back to watchlist';
  $('#close-admin-modal').setAttribute('aria-label','Close management');
  if(adminModal.open)adminModal.scrollTop=0;
}
async function openPanel(name){
  if(!authorized())return;
  if(['users','titles','requests'].includes(name)&&!account.Fmanage&&!api.isOwner)return;
  const panel=document.querySelector(`[data-admin-screen="${name}"]`);
  if(!panel)return;
  $('#admin-dashboard').hidden=true;
  document.querySelectorAll('[data-admin-screen]').forEach(el=>{el.hidden=el!==panel});
  $('#leave-management').textContent='← Management dashboard';
  $('#close-admin-modal').setAttribute('aria-label','Back to management dashboard');
  adminModal.scrollTop=0;
  if(loadedPanels.has(name))return;
  const output=panel.querySelector('[data-admin-loading]');
  if(output)output.textContent='Loading…';
  try{
    const f=api.firestore;
    if(name==='settings'){
      const settings=await f.getDoc(f.doc(api.db,'settings/basic'));
      if(settings.exists()){$('#basic-settings').elements.announcement.value=settings.data().announcement||'';$('#basic-settings').elements.defaultTheme.value=settings.data().defaultTheme||'dark';}
    }
    if(name==='users'){
      if(!ownerId)try{const owner=await f.getDoc(f.doc(api.db,'system/owner'));ownerId=owner.data()?.uid||null;}catch{ownerId=null;}
      await users();
    }
    if(name==='titles')await titles();
    if(name==='requests'){
      if(!ownerId)try{const owner=await f.getDoc(f.doc(api.db,'system/owner'));ownerId=owner.data()?.uid||null;}catch{ownerId=null;}
      if(!allTitles.length)await titles();
      await requests();
    }
    loadedPanels.add(name);
  }catch{note('Could not load this section. Check access and try again.');}
  finally{if(output)output.textContent='';}
}
document.querySelectorAll('[data-admin-panel]').forEach(button=>button.addEventListener('click',()=>void openPanel(button.dataset.adminPanel)));
document.querySelectorAll('[data-admin-back]').forEach(button=>button.addEventListener('click',showDashboard));
let openFromLink=new URLSearchParams(location.search).get('manage')==='1';
window.addEventListener('marvel-access-change',()=>{api=window.MarvelAccess||api;const was=!!authorized();account=api?.account||null;if(!authorized()){$('#admin-content').hidden=true;exitManagement()}else if(!was||openFromLink)load().catch(()=>note('Could not load management data.'));if(openFromLink&&authorized()){openFromLink=false;history.replaceState(null,'',location.pathname+location.hash);openManagement()}});
async function load(){
  if(loading)return;
  loading=true;
  try{
  api=window.MarvelAccess;
  if(!api){note('Account management becomes available after Firebase is configured.');return}
  await api.ready;account=api.account;
  if(!authorized()){return}
  const uid=api.auth.currentUser?.uid;
  if(uid&&loadedUid===uid){$('#admin-content').hidden=false;return}
  loadedPanels.clear();ownerId=null;allTitles=[];
  $('#admin-content').hidden=false;note('Management access is ready.');
  const senior=account.Fmanage||api.isOwner;
  document.querySelectorAll('[data-admin-panel][data-admin-senior]').forEach(el=>{el.hidden=!senior});
  $('#management-role').textContent=api.isOwner?'Owner':senior?'Senior manager':'Manager';
  if(api.isOwner)ownerId=uid;
  loadedUid=uid||null;
  }finally{loading=false}
}
async function users(){
  const {db,firestore:f}=api,docs=await f.getDocs(f.collection(db,'users'));
  $('#admin-users').innerHTML=docs.docs.map(row=>{const u=row.data(),id=row.id,isOwner=id===ownerId,isAdmin=u.manage||u.Fmanage;
    return `<div class="admin-row"><div><strong>${esc(u.username||u.email)}</strong><small>${isOwner?'Owner':esc(u.status)} · ${u.Fmanage?'Senior manager':u.manage?'Manager':'Viewer'}</small></div><div class="list-buttons">${!isOwner&&!isAdmin?u.status==='pending'||u.status==='disabled'?`<button class="secondary" data-approve="${esc(id)}">Approve view</button>`:`<button class="secondary" data-disable="${esc(id)}">Disable</button>`:''}${api.auth.currentUser.uid===ownerId&&!isOwner?`<select data-role="${esc(id)}" aria-label="Role for ${esc(u.username||u.email)}"><option value="view" ${!u.manage&&!u.Fmanage?'selected':''}>Viewer</option><option value="manage" ${u.manage&&!u.Fmanage?'selected':''}>Manager</option><option value="Fmanage" ${u.Fmanage?'selected':''}>Senior manager</option></select>`:''}</div></div>`;
  }).join('');
}
async function titles(){
  allTitles=await api.catalog();renderTitles();
}
function renderTitles(){
  const q=$('#title-search').value.trim().toLowerCase();
  $('#admin-titles').innerHTML=allTitles.filter(x=>x.title.toLowerCase().includes(q)).slice(0,30).map(x=>`<div class="admin-row"><div><strong>${esc(x.title)}</strong><small>${esc(x.date)} · ${x.archived?'Archived':'Visible'}</small></div><div class="list-buttons"><button class="secondary" data-edit="${esc(x.id)}">Edit</button>${!x.archived?`<button class="secondary" data-request="${esc(x.id)}">Request removal</button>`:''}</div></div>`).join('')||'<p class="subtle">No matching titles.</p>';
}
async function requests(){
  const f=api.firestore,docs=await f.getDocs(f.collection(api.db,'deletionRequests'));
  const pending=docs.docs.filter(d=>d.data().status==='pending');
  $('#admin-requests').innerHTML='<h3>Removal requests</h3>'+(pending.length?pending.map(r=>`<div class="admin-row"><div><strong>${esc(allTitles.find(x=>x.id===r.data().titleId)?.title||r.data().titleId)}</strong><small>${esc(r.data().reason)}</small></div>${api.auth.currentUser.uid===ownerId?`<button class="secondary" data-archive="${esc(r.id)}">Approve archival</button><button class="secondary" data-reject="${esc(r.id)}">Reject</button>`:''}</div>`).join(''):'<p class="subtle">No pending requests.</p>');
}
const addForm=$('#add-title'),posterPreview=$('#add-poster-preview'),posterStatus=$('#add-poster-status');
function selectedPoster(){
  const id=imdbId(addForm.elements.imdb.value),custom=addForm.elements.posterUrl.value.trim();
  if(!id)return {error:'Paste an IMDb title link such as https://www.imdb.com/title/tt0371746/.'};
  if(custom){const url=directPoster(custom);return url?{value:url,id}:{error:'Use a direct HTTPS image link from m.media-amazon.com/images/.'}}
  return {value:`imdb:${id}`,id};
}
function updatePosterPreview(){
  const choice=selectedPoster();posterPreview.dataset.poster='';posterPreview.dataset.ready='no';posterPreview.hidden=true;
  if(choice.error){posterStatus.textContent=choice.error;posterPreview.removeAttribute('src');return}
  const current=choice.value;
  posterStatus.textContent='Checking poster…';posterPreview.dataset.poster=current;
  posterPreview.onload=()=>{if(posterPreview.dataset.poster!==current)return;posterPreview.dataset.ready='yes';posterPreview.hidden=false;posterStatus.textContent=choice.value.startsWith('imdb:')?'Poster suggestion loaded. Check that it matches this title.':'Custom poster loaded.'};
  posterPreview.onerror=()=>{if(posterPreview.dataset.poster!==current)return;posterPreview.dataset.ready='no';posterPreview.hidden=true;posterStatus.textContent='Poster unavailable. Paste a direct IMDb image link in the custom poster field.'};
  posterPreview.src=choice.value.startsWith('imdb:')?suggestedPoster(choice.id):choice.value;
}
addForm.elements.imdb.addEventListener('input',updatePosterPreview);
addForm.elements.posterUrl.addEventListener('input',updatePosterPreview);
$('#add-title').onsubmit=async e=>{e.preventDefault();if(!authorized())return;const form=e.currentTarget,v=new FormData(form),f=api.firestore,date=String(v.get('date')).trim(),url=String(v.get('url')||'').trim(),choice=selectedPoster();
  if(choice.error){note(choice.error);return}
  if(posterPreview.dataset.poster!==choice.value||posterPreview.dataset.ready!=='yes'){note('Wait for the poster preview, or paste a working direct poster image link.');return}
  if(!/^(\d{2}\/\d{2}\/\d{4}|\d{4}|Unknown)$/.test(date)){note('Use DD/MM/YYYY, YYYY, or Unknown.');return}
  if(url&&(!/^https:\/\//i.test(url)||url.length>1000)){note('Use a valid HTTPS link.');return}
  const group=String(v.get('group')),mcu=v.has('mcu'),seconds=v.get('minutes')?Math.round(Number(v.get('minutes'))*60):null;
  const item={title:String(v.get('title')).trim(),date,seconds,kind:String(v.get('kind')),episodes:Number(v.get('episodes')),group,collections:mcu?['marvel','mcu']:['marvel'],url:url||`https://www.imdb.com/title/${choice.id}/`,imdb:`https://www.imdb.com/title/${choice.id}/`,poster:choice.value,priority:'later',reason:'Added by a catalog manager.',archived:false,createdBy:api.auth.currentUser.uid,createdAt:f.serverTimestamp()};
  const submit=form.querySelector('button.primary');submit.disabled=true;note('Adding title…');
  try{await f.addDoc(f.collection(api.db,'titles'),item);note(`Title added to ${mcu?'All MCU and All Marvel':'All Marvel'} and the full collection.`);form.reset();posterPreview.hidden=true;posterPreview.dataset.ready='no';posterStatus.textContent='Paste the IMDb title link to load a poster suggestion.';window.dispatchEvent(new Event('marvel-catalog-change'));if(account.Fmanage||api.isOwner)void titles().catch(()=>note('Title saved. Reload management to refresh the title list.'))}
  catch(error){note(error?.code==='permission-denied'?'Could not add title. Publish the updated Firestore rules for IMDb posters, then try again.':'Could not add title. '+(error?.message||'Please try again.'))}
  finally{submit.disabled=false}};
$('#basic-settings').onsubmit=async e=>{e.preventDefault();if(!authorized())return;const f=api.firestore,v=new FormData(e.currentTarget);
  try{await f.setDoc(f.doc(api.db,'settings/basic'),{announcement:String(v.get('announcement')).slice(0,1000),defaultTheme:String(v.get('defaultTheme')),updatedAt:f.serverTimestamp(),updatedBy:api.auth.currentUser.uid});note('Settings saved.')}catch{note('Could not save settings.')}};
$('#title-search').oninput=renderTitles;
document.addEventListener('change',async e=>{const id=e.target.dataset?.role;if(!id||!authorized()||api.auth.currentUser.uid!==ownerId)return;const f=api.firestore,value=e.target.value;
  try{await f.updateDoc(f.doc(api.db,'users',id),{manage:value==='manage',Fmanage:value==='Fmanage',view:true,status:'approved',updatedAt:f.serverTimestamp()});note('Role updated.');await users()}catch{note('Could not update the role.')}});
document.addEventListener('click',async e=>{const button=e.target.closest('#management-view button[data-approve],#management-view button[data-disable],#management-view button[data-edit],#management-view button[data-request],#management-view button[data-reject],#management-view button[data-archive]');
  if(!button||!api||!authorized()||button.disabled)return;
  const d=button.dataset,f=api.firestore;
  button.disabled=true;
  if(d.approve)note('Approving user…');
  else if(d.disable)note('Disabling user…');
  try{
    if(d.approve||d.disable){await f.updateDoc(f.doc(api.db,'users',d.approve||d.disable),{status:d.approve?'approved':'disabled',view:!!d.approve,updatedAt:f.serverTimestamp()});await users();note('User access updated.');}
    if(d.edit){const item=allTitles.find(x=>x.id===d.edit);if(!item)return;const title=prompt('Title',item.title);if(!title?.trim())return;await f.updateDoc(f.doc(api.db,'titles',item.id),{title:title.trim().slice(0,250)});await titles();note('Title updated.');}
    if(d.request){const reason=prompt('Why should this title be removed?');if(!reason?.trim())return;await f.addDoc(f.collection(api.db,'deletionRequests'),{titleId:d.request,reason:reason.trim().slice(0,1000),requestedBy:api.auth.currentUser.uid,createdAt:f.serverTimestamp(),status:'pending'});await requests();note('Removal request sent to the owner.');}
    if(d.reject&&api.auth.currentUser.uid===ownerId){await f.updateDoc(f.doc(api.db,'deletionRequests',d.reject),{status:'rejected'});await requests();note('Request rejected.');}
    if(d.archive&&api.auth.currentUser.uid===ownerId){await f.runTransaction(api.db,async tx=>{const req=f.doc(api.db,'deletionRequests',d.archive),snap=await tx.get(req);if(!snap.exists()||snap.data().status!=='pending')throw Error('Request no longer pending');const title=f.doc(api.db,'titles',snap.data().titleId),existing=await tx.get(title);if(!existing.exists())throw Error('Title missing');tx.update(title,{archived:true});tx.update(req,{status:'approved'});});await Promise.all([titles(),requests()]);note('Title archived after owner approval.');}
  }catch(error){note(error?.code==='permission-denied'?'Permission denied. Check your management role and the published Firestore rules.':'Action failed. '+(error?.message||'Please try again.'));}
  finally{if(button.isConnected)button.disabled=false;}});
load().catch(()=>note('Could not load management data. Check Firebase configuration and access.'));
