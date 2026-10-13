// Run locally with Application Default Credentials. Never put credentials in Git.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const email=process.env.MARVEL_OWNER_EMAIL;
const projectId=process.env.MARVEL_FIREBASE_PROJECT;
if(!email || !projectId)throw Error('Set MARVEL_OWNER_EMAIL and MARVEL_FIREBASE_PROJECT.');
initializeApp({credential:applicationDefault(),projectId});
const user=await getAuth().getUserByEmail(email);
if(!user.emailVerified || user.disabled)throw Error('Owner must verify their email and have an enabled account first.');
const db=getFirestore();
await db.runTransaction(async tx=>{
  const ownerRef=db.doc('system/owner'),existing=await tx.get(ownerRef);
  if(existing.exists)throw Error('An owner already exists. Bootstrap never replaces it.');
  const ref=db.doc('users/'+user.uid),profile=await tx.get(ref);
  tx.create(ownerRef,{uid:user.uid,createdAt:FieldValue.serverTimestamp()});
  tx.set(ref,{email:user.email,view:true,manage:true,Fmanage:true,status:'approved',createdAt:profile.exists?profile.data().createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
});
console.log('Owner initialized. No credentials were written to the repository.');
