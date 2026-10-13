// Requires a running Firestore emulator and @firebase/rules-unit-testing + firebase.
import {readFileSync} from 'node:fs';
import {test, before, after} from 'node:test';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch} from 'firebase/firestore';
let env;
const title=(name,by='owner')=>({title:name,date:'2026',seconds:null,kind:'movie',episodes:1,createdAt:new Date(),createdBy:by,archived:false,group:'extra',collections:['marvel'],url:'https://en.wikipedia.org/',poster:'',priority:'later',reason:'Test'});
const profile=(email,flags={})=>({email,status:'approved',view:true,manage:false,Fmanage:false,createdAt:new Date(),updatedAt:new Date(),...flags});
const db=(uid,verified=true)=>env.authenticatedContext(uid,{email:uid+'@example.test',email_verified:verified}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-marvel-access',firestore:{rules:readFileSync(new URL('./firestore.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();await setDoc(doc(d,'system/owner'),{uid:'owner'});
  for(const [uid,flags]of Object.entries({owner:{manage:true,Fmanage:true},admin:{Fmanage:true},manager:{manage:true},viewer:{},pending:{status:'pending',view:false},disabled:{status:'disabled',view:false}}))await setDoc(doc(d,'users/'+uid),profile(uid+'@example.test',flags));
  await setDoc(doc(d,'titles/original'),title('Test'));
 });
});
after(async()=>{await env?.cleanup()});
test('anonymous, unverified, pending and disabled accounts cannot read catalog',async()=>{
 for(const d of [env.unauthenticatedContext().firestore(),db('viewer',false),db('pending'),db('disabled')])await assertFails(getDoc(doc(d,'titles/original')));
 await assertSucceeds(getDoc(doc(db('viewer'),'titles/original')));
});
test('new account cannot choose its own privileges',async()=>{
 const d=db('new');const base={...profile('new@example.test',{status:'pending',view:false}),createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(d,'users/new'),{...base,manage:true}));
 await assertSucceeds(setDoc(doc(d,'users/new'),base));
});
test('viewer cannot approve themselves or grant manage',async()=>{
 await assertFails(updateDoc(doc(db('viewer'),'users/viewer'),{manage:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db('pending'),'users/pending'),{status:'approved',view:true,updatedAt:serverTimestamp()}));
});
test('manager can add a valid title, but cannot edit or delete existing titles',async()=>{
 const d=db('manager');await assertSucceeds(setDoc(doc(d,'titles/manager-added'),{...title('Added','manager'),createdAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(d,'titles/original'),{title:'Changed'}));
 await assertFails(deleteDoc(doc(d,'titles/original')));
 await assertFails(updateDoc(doc(d,'titles/original'),{archived:true}));
});
test('full manager can approve regular users but cannot grant roles or change owner',async()=>{
 const d=db('admin');await assertSucceeds(updateDoc(doc(d,'users/disabled'),{status:'approved',view:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(d,'users/viewer'),{Fmanage:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(d,'users/admin'),{manage:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(d,'users/owner'),{view:false,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(d,'system/owner'),{uid:'admin'}));
});
test('owner can grant a role but cannot replace owner through browser',async()=>{
 await assertSucceeds(updateDoc(doc(db('owner'),'users/viewer'),{manage:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db('owner'),'system/owner'),{uid:'viewer'}));
});
test('archival approval requires owner and an archived title',async()=>{
 await assertSucceeds(setDoc(doc(db('admin'),'deletionRequests/request'),{titleId:'original',reason:'Duplicate',requestedBy:'admin',createdAt:serverTimestamp(),status:'pending'}));
 await assertFails(updateDoc(doc(db('admin'),'titles/original'),{archived:true}));
 await assertFails(updateDoc(doc(db('admin'),'deletionRequests/request'),{status:'approved'}));
 await assertFails(updateDoc(doc(db('owner'),'deletionRequests/request'),{status:'approved'}));
 const d=db('owner'),batch=writeBatch(d);batch.update(doc(d,'titles/original'),{archived:true});batch.update(doc(d,'deletionRequests/request'),{status:'approved'});await assertSucceeds(batch.commit());
 await assertFails(deleteDoc(doc(d,'titles/original')));
});
test('basic settings cannot carry authorization settings',async()=>{
 const base={announcement:'Welcome',defaultTheme:'dark',updatedAt:serverTimestamp(),updatedBy:'manager'};
 await assertSucceeds(setDoc(doc(db('manager'),'settings/basic'),base));
 await assertFails(setDoc(doc(db('manager'),'settings/basic'),{...base,owner:'manager'}));
 await assertFails(setDoc(doc(db('manager'),'settings/admin'),{registrationOpen:true}));
});
