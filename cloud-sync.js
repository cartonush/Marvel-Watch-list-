import './access.js?v=1.6.4';
import {cleanDoc,fromLocal,firstMerge,changes,overlay,removeAcknowledged,hasChanges,MAX_LISTS} from './sync-core.mjs';

/* The cookies remain the device cache and backup source; Firestore is the account copy. */
let items=[],catalogMeta={},api,ref,view,cloud,pending={},uid='',ready=false,busy=false,blocked=false,unsubscribe=null;
const localKey='marvel_cloud_pending_1_',markerKey='marvel_cloud_migrated_1_',boundKey='marvel_cloud_account_1';
const read=key=>globalThis.MarvelCookies.read(key);
const write=(key,value)=>globalThis.MarvelCookies.write(key,value);
const remove=key=>globalThis.MarvelCookies.remove(key);

function announce(message,kind='ok'){
  globalThis.dispatchEvent(new CustomEvent('marvel-sync-status',{detail:{message,kind}}));
}
function savePending(){try{localStorage.setItem(localKey+uid,JSON.stringify(pending))}catch{announce('Sync changes could not be queued on this device. Export a backup.','error')}}
function loadPending(){try{const value=JSON.parse(localStorage.getItem(localKey+uid)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
function readLocal(){
  const raw=read('marvel_watch_v1');
  let profile=raw&&Array.isArray(raw.p)?raw:null;
  if(profile&&profile.p.length!==items.length){
    const positions=catalogMeta.previousPositions,oldCount=catalogMeta.previousCount;
    const p=Array.isArray(positions)&&profile.p.length>items.length&&profile.p.length>=oldCount
      ?items.map((_,i)=>profile.p[i<positions.length?positions[i]:oldCount+i-positions.length]||0)
      :[...profile.p.slice(0,items.length),...Array(Math.max(0,items.length-profile.p.length)).fill(0)];
    profile={...profile,p};
  }
  const lists=globalThis.MarvelLists?.all(items)||[];
  return fromLocal(profile,read('marvel_settings_v1')||{},lists,read('marvel_list_active'),items);
}
function applyLocal(doc){
  const previous=read('marvel_watch_v1')||{};
  const profile={v:1,id:typeof previous.id==='string'?previous.id:crypto.randomUUID(),
    name:doc.name,p:items.map(item=>doc.progress[item.id]||0),
    f:Object.keys(doc.favorites).filter(id=>doc.favorites[id]),
    s:Object.keys(doc.skipped).filter(id=>doc.skipped[id]&&doc.progress[id]!==items.find(x=>x.id===id)?.episodes),
    t:Date.now()};
  write('marvel_watch_v1',profile);
  if(Object.keys(doc.settings).length)write('marvel_settings_v1',doc.settings);
  for(let slot=0;slot<MAX_LISTS;slot++){
    const list=doc.lists[slot];
    if(list&&!list.deleted)write('marvel_list_'+slot,list);
    else remove('marvel_list_'+slot);
  }
  if(doc.activeList!==null&&doc.lists[doc.activeList]&&!doc.lists[doc.activeList].deleted)
    write('marvel_list_active',doc.activeList);
  else remove('marvel_list_active');
  view=doc;
  globalThis.dispatchEvent(new CustomEvent('marvel-cloud-update'));
}
function mergePending(base,extra){
  const next={...base};
  for(const group of ['progress','favorites','skipped','lists'])if(extra[group])
    next[group]={...next[group],...extra[group]};
  for(const key of ['settings','activeList','name'])if(Object.hasOwn(extra,key))next[key]=extra[key];
  return next;
}
async function flush(){
  if(busy||blocked||!ready||!hasChanges(pending))return;
  busy=true;
  const sent=structuredClone(pending);
  announce('Syncing your watchlist…','working');
  try{
    await api.firestore.setDoc(ref,{v:1,...sent,updatedAt:api.firestore.serverTimestamp()},{merge:true});
    pending=removeAcknowledged(pending,sent);
    savePending();
    announce(hasChanges(pending)?'Syncing more changes…':'Synced across your devices');
  }catch(error){
    if(error?.code==='permission-denied')blocked=true;
    announce(error?.code==='permission-denied'?'Device saved · publish the updated Firestore rules to sync':'Device saved · waiting to reconnect','error');
  }finally{busy=false;if(!blocked&&hasChanges(pending)&&navigator.onLine)setTimeout(flush,4000)}
}
function capture(){
  if(!ready)return;
  try{
    const current=readLocal(),diff=changes(view,current);
    if(!hasChanges(diff))return;
    pending=mergePending(pending,diff);
    view=current;
    savePending();
    flush();
  }catch(error){console.error('Could not queue watchlist sync',error);announce('Device saved · sync needs attention','error')}
}
async function start(catalog){
  catalogMeta=catalog;items=catalog.items||catalog;
  if(ready&&uid===globalThis.MarvelAccess?.auth.currentUser?.uid)return true;
  if(unsubscribe){unsubscribe();unsubscribe=null}
  ready=false;blocked=false;busy=false;
  api=globalThis.MarvelAccess;
  if(!api)return false;
  await api.ready;
  uid=api.auth.currentUser?.uid||'';
  if(!uid||!api.account)return false;
  ref=api.firestore.doc(api.db,'userWatch',uid);
  try{
    const previous=localStorage.getItem(boundKey);
    if(previous&&previous!==uid){
      for(const key of ['marvel_watch_v1','marvel_settings_v1','marvel_list_active','marvel_list_draft',
        ...Array.from({length:MAX_LISTS},(_,i)=>'marvel_list_'+i)])remove(key);
    }
    localStorage.setItem(boundKey,uid);
  }catch{}
  announce('Checking your saved watchlist…','working');
  const local=readLocal();
  pending=loadPending();
  try{
    const snap=await api.firestore.getDocFromServer(ref);
    cloud=snap.exists()?cleanDoc(snap.data(),items):null;
    const migrated=localStorage.getItem(markerKey+uid)==='yes';
    const merged=cloud?(migrated?cloud:firstMerge(local,cloud)):local;
    if(!cloud)pending=mergePending({progress:merged.progress,favorites:merged.favorites,
      skipped:merged.skipped,lists:merged.lists,settings:merged.settings,
      activeList:merged.activeList,name:merged.name},pending);
    else if(!migrated)pending=mergePending(changes(cloud,merged),pending);
    view=overlay(merged,pending);
    applyLocal(view);
    localStorage.setItem(markerKey+uid,'yes');
    ready=true;
    unsubscribe=api.firestore.onSnapshot(ref,snapshot=>{
      if(!snapshot.exists())return;
      cloud=cleanDoc(snapshot.data(),items);
      const next=overlay(cloud,pending);
      if(JSON.stringify(next)!==JSON.stringify(view))applyLocal(next);
      if(hasChanges(pending))flush();
      else announce('Synced across your devices');
    },error=>{console.error('Watchlist listener stopped',error);announce('Device saved · sync unavailable','error')});
    if(hasChanges(pending))flush();else announce('Synced across your devices');
    globalThis.addEventListener('online',flush);
    return true;
  }catch(error){
    console.error('Watchlist sync could not start',error);
    announce(error?.code==='permission-denied'?'Device saved · publish the updated Firestore rules to sync':'Device saved · sync will retry when you reload','error');
    if(error?.code!=='permission-denied'){
      view=local;ready=true;
      globalThis.addEventListener('online',()=>{ready=false;start(catalog)} ,{once:true});
    }
    return false;
  }
}
globalThis.MarvelSync={start,capture,get ready(){return ready}};
globalThis.addEventListener('marvel-access-change',()=>{
  if(items.length&&ready&&globalThis.MarvelAccess?.auth.currentUser?.uid!==uid)location.reload();
});
