import './access.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api,account,ownerId,allTitles=[],loading=false,loadedUid=null;
const note=s=>$('#admin-message').textContent=s;
const authorized=()=>!!account&&(account.manage===true||account.Fmanage===true||!!api?.isOwner);
const management=$('#management-view'),adminModal=$('#admin-modal');
function openManagement(){
  management.hidden=false;
  if(!authorized()){$('#admin-content').hidden=true;note(api?.account?'This account does not have management access.':'Checking your management access…');}
  if(!adminModal.open)adminModal.showModal();
  if(authorized())load().catch(()=>note('Could not load management data.'));
}
function closeManagement(){if(adminModal.open)adminModal.close();}
$('#manage-nav')?.addEventListener('click',openManagement);
document.addEventListener('marvel-open-management',openManagement);
$('#leave-management').addEventListener('click',closeManagement);
$('#close-admin-modal').addEventListener('click',closeManagement);
adminModal.addEventListener('click',e=>{if(e.target===adminModal)closeManagement()});
adminModal.addEventListener('close',()=>{management.hidden=true});
let openFromLink=new URLSearchParams(location.search).get('manage')==='1';
window.addEventListener('marvel-access-change',()=>{api=window.MarvelAccess||api;const was=!!authorized();account=api?.account||null;if(!authorized()){$('#admin-content').hidden=true;if(adminModal.open)closeManagement()}else if(!was||openFromLink)load().catch(()=>note('Could not load management data.'));if(openFromLink&&authorized()){openFromLink=false;history.replaceState(null,'',location.pathname+location.hash);openManagement()}});
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
  $('#admin-content').hidden=false;note('Management access is ready.');
  const {db,firestore:f}=api;
  if(account.Fmanage||api.isOwner){
    $('#user-section').hidden=false;$('#title-section').hidden=false;
    try{const owner=await f.getDoc(f.doc(db,'system/owner'));ownerId=owner.data()?.uid;}catch{ownerId=null;}
    $('#management-role').textContent=api.isOwner||ownerId===api.auth.currentUser.uid?'Owner': 'Senior manager';
    const results=await Promise.allSettled([users(),titles(),requests()]);
    if(results.some(r=>r.status==='rejected'))note('Management opened. Some data could not load; check the published Firestore rules and account role.');
  }else $('#management-role').textContent='Manager';
  try{const settings=await f.getDoc(f.doc(db,'settings/basic'));if(settings.exists()){$('#basic-settings').elements.announcement.value=settings.data().announcement||'';$('#basic-settings').elements.defaultTheme.value=settings.data().defaultTheme||'dark';}}catch{note('Management opened, but basic settings could not load.');}
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
$('#add-title').onsubmit=async e=>{e.preventDefault();if(!authorized())return;const form=e.currentTarget,v=new FormData(form),f=api.firestore,date=String(v.get('date')).trim(),url=String(v.get('url')||'').trim();
  if(!/^(\d{2}\/\d{2}\/\d{4}|\d{4}|Unknown)$/.test(date)){note('Use DD/MM/YYYY, YYYY, or Unknown.');return}
  if(url&&(!/^https:\/\//i.test(url)||url.length>1000)){note('Use a valid HTTPS link.');return}
  const group=String(v.get('group')),mcu=v.has('mcu'),seconds=v.get('minutes')?Math.round(Number(v.get('minutes'))*60):null;
  const item={title:String(v.get('title')).trim(),date,seconds,kind:String(v.get('kind')),episodes:Number(v.get('episodes')),group,collections:mcu?['marvel','mcu']:['marvel'],url:url||'https://en.wikipedia.org/w/index.php?search='+encodeURIComponent(String(v.get('title')).trim()),poster:'',priority:'later',reason:'Added by a catalog manager.',archived:false,createdBy:api.auth.currentUser.uid,createdAt:f.serverTimestamp()};
  try{await f.addDoc(f.collection(api.db,'titles'),item);note('Title added.');form.reset();if(account.Fmanage)await titles()}catch(error){note('Could not add title. Check your access and the field values.')}};
$('#basic-settings').onsubmit=async e=>{e.preventDefault();if(!authorized())return;const f=api.firestore,v=new FormData(e.currentTarget);
  try{await f.setDoc(f.doc(api.db,'settings/basic'),{announcement:String(v.get('announcement')).slice(0,1000),defaultTheme:String(v.get('defaultTheme')),updatedAt:f.serverTimestamp(),updatedBy:api.auth.currentUser.uid});note('Settings saved.')}catch{note('Could not save settings.')}};
$('#title-search').oninput=renderTitles;
document.addEventListener('change',async e=>{const id=e.target.dataset?.role;if(!id||!authorized()||api.auth.currentUser.uid!==ownerId)return;const f=api.firestore,value=e.target.value;
  try{await f.updateDoc(f.doc(api.db,'users',id),{manage:value==='manage',Fmanage:value==='Fmanage',view:true,status:'approved',updatedAt:f.serverTimestamp()});note('Role updated.');await users()}catch{note('Could not update the role.')}});
document.addEventListener('click',async e=>{const d=e.target.closest('#management-view button')?.dataset;if(!d||!api||!authorized())return;const f=api.firestore;
  try{
    if(d.approve||d.disable){await f.updateDoc(f.doc(api.db,'users',d.approve||d.disable),{status:d.approve?'approved':'disabled',view:!!d.approve,updatedAt:f.serverTimestamp()});await users();note('User access updated.');}
    if(d.edit){const item=allTitles.find(x=>x.id===d.edit);if(!item)return;const title=prompt('Title',item.title);if(!title?.trim())return;await f.updateDoc(f.doc(api.db,'titles',item.id),{title:title.trim().slice(0,250)});await titles();note('Title updated.');}
    if(d.request){const reason=prompt('Why should this title be removed?');if(!reason?.trim())return;await f.addDoc(f.collection(api.db,'deletionRequests'),{titleId:d.request,reason:reason.trim().slice(0,1000),requestedBy:api.auth.currentUser.uid,createdAt:f.serverTimestamp(),status:'pending'});await requests();note('Removal request sent to the owner.');}
    if(d.reject&&api.auth.currentUser.uid===ownerId){await f.updateDoc(f.doc(api.db,'deletionRequests',d.reject),{status:'rejected'});await requests();note('Request rejected.');}
    if(d.archive&&api.auth.currentUser.uid===ownerId){await f.runTransaction(api.db,async tx=>{const req=f.doc(api.db,'deletionRequests',d.archive),snap=await tx.get(req);if(!snap.exists()||snap.data().status!=='pending')throw Error('Request no longer pending');const title=f.doc(api.db,'titles',snap.data().titleId),existing=await tx.get(title);if(!existing.exists())throw Error('Title missing');tx.update(title,{archived:true});tx.update(req,{status:'approved'});});await Promise.all([titles(),requests()]);note('Title archived after owner approval.');}
  }catch{note('Action blocked or failed. Check your permissions.')}});
load().catch(()=>note('Could not load management data. Check Firebase configuration and access.'));
