// Run locally with Application Default Credentials. Never put credentials in Git.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const uid=process.env.MARVEL_OWNER_UID;
const projectId=process.env.MARVEL_FIREBASE_PROJECT;
if(!uid || !projectId)throw Error('Set MARVEL_OWNER_UID and MARVEL_FIREBASE_PROJECT.');
initializeApp({credential:applicationDefault(),projectId});
const user=await getAuth().getUser(uid);
const match=/^([a-z][a-z0-9_]{2,23})@users[.]marvel-list[.]invalid$/.exec(user.email||'');
if(!match || user.disabled)throw Error('Owner must register a username and have an enabled account first.');
const db=getFirestore();
await db.runTransaction(async tx=>{
  const ownerRef=db.doc('system/owner'),existing=await tx.get(ownerRef);
  if(existing.exists)throw Error('An owner already exists. Bootstrap never replaces it.');
  const ref=db.doc('users/'+user.uid),profile=await tx.get(ref);
  tx.create(ownerRef,{uid:user.uid,createdAt:FieldValue.serverTimestamp()});
  tx.set(ref,{username:match[1],email:user.email,view:true,manage:true,Fmanage:true,status:'approved',createdAt:profile.exists?profile.data().createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
});
console.log('Owner initialized. No credentials were written to the repository.');
