/* Pure helpers for account-scoped watch state. Field patches preserve unrelated device edits. */
export const MAX_LISTS=5;

export function cleanDoc(source,items){
  const input=source&&typeof source==='object'?source:{};
  const ids=new Map(items.map(item=>[item.id,item]));
  const progress={},favorites={},skipped={},lists={};
  for(const [id,value] of Object.entries(input.progress||{})){
    const item=ids.get(id);
    if(item&&Number.isInteger(value)&&value>=0&&value<=item.episodes)progress[id]=value;
  }
  for(const group of ['favorites','skipped']){
    const output=group==='favorites'?favorites:skipped;
    for(const [id,value] of Object.entries(input[group]||{}))if(ids.has(id)&&typeof value==='boolean')output[id]=value;
  }
  for(let slot=0;slot<MAX_LISTS;slot++){
    const list=input.lists?.[slot];
    if(list?.deleted===true){lists[slot]={deleted:true};continue}
    if(typeof list?.name!=='string'||!list.name.trim()||list.name.length>40||!Array.isArray(list.ids))continue;
    const kept=[...new Set(list.ids.filter(id=>ids.has(id)))];
    if(kept.length<=items.length)lists[slot]={name:list.name.trim(),ids:kept};
  }
  const settings=input.settings&&typeof input.settings==='object'&&!Array.isArray(input.settings)?input.settings:{};
  return {progress,favorites,skipped,lists,settings,
    activeList:Number.isInteger(input.activeList)&&input.activeList>=0&&input.activeList<MAX_LISTS?input.activeList:null,
    name:typeof input.name==='string'&&input.name.trim()&&input.name.length<=32?input.name.trim():'My journey'};
}

export function fromLocal(profile,prefs,lists,active,items){
  const progress={},favorites={},skipped={},saved={};
  items.forEach((item,index)=>{
    const value=profile?.p?.[index];
    if(Number.isInteger(value)&&value>0&&value<=item.episodes)progress[item.id]=value;
  });
  for(const id of profile?.f||[])favorites[id]=true;
  for(const id of profile?.s||[])skipped[id]=true;
  for(const list of lists||[])saved[list.slot]={name:list.name,ids:list.ids};
  return cleanDoc({progress,favorites,skipped,lists:saved,settings:prefs,activeList:active,name:profile?.name},items);
}

export function firstMerge(local,cloud){
  const merged=structuredClone(cloud);
  for(const [id,value] of Object.entries(local.progress))merged.progress[id]=Math.max(value,cloud.progress[id]||0);
  for(const group of ['favorites','skipped'])
    for(const [id,value] of Object.entries(local[group]))if(value)merged[group][id]=true;
  for(const list of Object.values(local.lists)){
    if(list.deleted||Object.values(merged.lists).some(saved=>!saved.deleted&&saved.name.toLowerCase()===list.name.toLowerCase()))continue;
    const free=Array.from({length:MAX_LISTS},(_,i)=>i).find(i=>!merged.lists[i]||merged.lists[i].deleted);
    if(free!==undefined)merged.lists[free]=list;
  }
  if(!Object.keys(cloud.settings).length)merged.settings=local.settings;
  if(!Object.values(cloud.lists).some(x=>!x.deleted))merged.activeList=local.activeList;
  if(cloud.name==='My journey'&&local.name!=='My journey')merged.name=local.name;
  return merged;
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function changes(before,after){
  const patch={};
  for(const group of ['progress','favorites','skipped','lists']){
    const updates={};
    for(const key of new Set([...Object.keys(before[group]),...Object.keys(after[group])])){
      const previous=before[group][key],current=after[group][key];
      if(same(previous,current)||group==='progress'&&(previous??0)===(current??0)||['favorites','skipped'].includes(group)&&(previous??false)===(current??false))continue;
      updates[key]=current??(group==='lists'?{deleted:true}:group==='progress'?0:false);
    }
    if(Object.keys(updates).length)patch[group]=updates;
  }
  for(const key of ['settings','activeList','name'])if(!same(before[key],after[key]))patch[key]=after[key];
  return patch;
}

export function overlay(base,patch){
  const result=structuredClone(base);
  for(const group of ['progress','favorites','skipped','lists'])Object.assign(result[group],patch[group]||{});
  for(const key of ['settings','activeList','name'])if(Object.hasOwn(patch,key))result[key]=patch[key];
  return result;
}

export function removeAcknowledged(pending,sent){
  const remaining=structuredClone(pending);
  for(const group of ['progress','favorites','skipped','lists']){
    for(const [key,value] of Object.entries(sent[group]||{}))if(same(remaining[group]?.[key],value))delete remaining[group][key];
    if(remaining[group]&&!Object.keys(remaining[group]).length)delete remaining[group];
  }
  for(const key of ['settings','activeList','name'])if(Object.hasOwn(sent,key)&&same(remaining[key],sent[key]))delete remaining[key];
  return remaining;
}

export const hasChanges=patch=>Object.keys(patch).length>0;
