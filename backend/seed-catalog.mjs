// One-time, idempotent catalog import. Existing server edits are never overwritten.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {readFileSync} from 'node:fs';
const projectId=process.env.MARVEL_FIREBASE_PROJECT;
if(!projectId)throw Error('Set MARVEL_FIREBASE_PROJECT.');
initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore();
const items=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8')).items;
let created=0,existing=0;
for(const x of items){
  const ref=db.doc('titles/'+x.id);
  try{await ref.create({
    title:x.title,date:x.date,seconds:x.seconds,kind:x.kind,episodes:x.episodes,
    group:x.group,collections:x.collections,url:x.url,poster:x.poster||'',
    priority:x.priority,reason:String(x.reason||'').slice(0,1000),
    createdBy:'catalog-seed',createdAt:FieldValue.serverTimestamp(),archived:false
  });created++}catch(error){if(error.code===6||error.code==='already-exists')existing++;else throw error}
}
console.log(`Catalog seeded: ${created} created, ${existing} already present.`);
