/* Personal lists: separate, bounded cookies; no watched-state changes. */
globalThis.MarvelLists=(()=>{
 const MAX=5,KEY='marvel_list_',DRAFT='marvel_list_draft',ACTIVE='marvel_list_active';
 const pack=v=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v))));
 function read(key){try{const s=document.cookie.split('; ').find(s=>s.startsWith(key+'='));return s?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.slice(key.length+1).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))):null}catch{return null}}
 function write(key,v){const s=pack(v);if(s.length>3800)throw Error('This list is too large for browser storage.');document.cookie=key+'='+s+'; Max-Age=34560000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');if(!document.cookie.split('; ').includes(key+'='+s))throw Error('Browser storage is blocked. Your changes were not saved.');}
 function remove(key){document.cookie=key+'=; Max-Age=0; Path=/; SameSite=Lax';}
 function validate(v,items){if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>40||!Array.isArray(v.ids)||v.ids.length>items.length||new Set(v.ids).size!==v.ids.length||v.ids.some(id=>!items.some(x=>x.id===id)))throw Error('Invalid personal list');return{name:v.name.trim(),ids:[...v.ids]};}
 function date(s){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(s||''))return Infinity;const[d,m,y]=s.split('/').map(Number),v=Date.UTC(y,m-1,d),t=new Date(v);return t.getUTCDate()===d&&t.getUTCMonth()===m-1?v:Infinity;}
 function ordered(items){return [...items].sort((a,b)=>date(a.date)-date(b.date)||a.order-b.order);}
 function all(items){return Array.from({length:MAX},(_,slot)=>{try{const v=validate(read(KEY+slot),items);return{...v,slot}}catch{return null}}).filter(Boolean);}
 function active(items){const slot=read(ACTIVE);return all(items).find(x=>x.slot===slot)||null;}
 function save(v,items,slot){v=validate(v,items);if(!v.ids.length)throw Error('Add at least one title.');const lists=all(items);if(lists.some(x=>x.slot!==slot&&x.name.toLowerCase()===v.name.toLowerCase()))throw Error('Choose a different list name.');if(slot==null)slot=Array.from({length:MAX},(_,i)=>i).find(i=>!lists.some(x=>x.slot===i));if(!Number.isInteger(slot)||slot<0||slot>=MAX)throw Error('You can save up to 5 lists. Delete a list to make room.');v.ids=ordered(items.filter(x=>v.ids.includes(x.id))).map(x=>x.id);write(KEY+slot,v);return slot;}
 function next(d){const fresh=d.marks.indexOf('u');if(fresh>=0)return fresh;for(let n=1;n<=d.marks.length;n++){const i=(d.cursor+n)%d.marks.length;if(d.marks[i]==='l')return i;}return -1;}
 function decide(d,choice){if(!['y','n','l'].includes(choice))throw Error('Invalid choice');const i=next(d);if(i<0)return d;const marks=d.marks.split('');marks[i]=choice;return{...d,marks:marks.join(''),cursor:i};}
 return{MAX,KEY,DRAFT,ACTIVE,read,write,remove,validate,ordered,all,active,save,next,decide,pack};
})();
