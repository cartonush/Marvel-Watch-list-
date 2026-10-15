// Requires a running Firestore emulator and @firebase/rules-unit-testing + firebase.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test, before, after} from 'node:test';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, serverTimestamp, writeBatch} from 'firebase/firestore';
let env;
const title=(name,by='owner')=>({title:name,date:'2026',seconds:null,kind:'movie',episodes:1,createdAt:new Date(),createdBy:by,archived:false,group:'extra',collections:['marvel'],url:'https://en.wikipedia.org/',imdb:'https://www.imdb.com/title/tt0371746/',poster:'imdb:tt0371746',priority:'later',reason:'Test'});
const profile=(username,flags={})=>({username,email:username+'@users.marvel-list.invalid',status:'approved',view:true,manage:false,Fmanage:false,createdAt:new Date(),updatedAt:new Date(),...flags});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@users.marvel-list.invalid',email_verified:false}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-marvel-access',firestore:{rules:readFileSync(new URL('./firestore.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();await setDoc(doc(d,'system/owner'),{uid:'owner'});
  for(const [uid,flags]of Object.entries({owner:{manage:true,Fmanage:true},admin:{Fmanage:true},manager:{manage:true},viewer:{},pending:{status:'pending',view:false},disabled:{status:'disabled',view:false}}))await setDoc(doc(d,'users/'+uid),profile(uid,flags));
  await setDoc(doc(d,'titles/original'),title('Test'));
 });
});
after(async()=>{await env?.cleanup()});
test('anonymous, pending, disabled and legacy email accounts cannot read catalog',async()=>{
 for(const d of [env.unauthenticatedContext().firestore(),env.authenticatedContext('viewer',{email:'viewer@example.test'}).firestore(),db('pending'),db('disabled')])await assertFails(getDoc(doc(d,'titles/original')));
 await assertSucceeds(getDoc(doc(db('viewer'),'titles/original')));
});
test('new account cannot choose its own privileges',async()=>{
 const d=db('new');const base={...profile('new',{status:'pending',view:false}),createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(d,'users/new'),{...base,manage:true}));
 await assertFails(setDoc(doc(d,'users/new'),{...base,username:'other'}));
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
test('manager can add a title with an IMDb poster, but untrusted poster hosts are denied',async()=>{
 const d=db('manager'),imdb='https://www.imdb.com/title/tt0371746/';
 await assertSucceeds(setDoc(doc(d,'titles/imdb-added'),{...title('Iron Man','manager'),imdb,poster:'imdb:tt0371746',createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(d,'titles/untrusted-poster'),{...title('Untrusted','manager'),imdb,poster:'https://evil.example/poster.jpg',createdAt:serverTimestamp()}));
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
 await assertSucceeds(updateDoc(doc(db('owner'),'users/viewer'),{manage:false,updatedAt:serverTimestamp()}));
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
test('search engines are readable to viewers and only managers can extend them',async()=>{
 const base={name:'Direct watch',sites:['f-movies.org','cinehype.sc'],createdBy:'manager',createdAt:serverTimestamp(),updatedBy:'manager',updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(db('viewer'),'searchEngines/direct'),{...base,createdBy:'viewer',updatedBy:'viewer'}));
 await assertSucceeds(setDoc(doc(db('manager'),'searchEngines/direct'),base));
 await assertSucceeds(getDocs(collection(db('viewer'),'searchEngines')));
 await assertFails(getDocs(collection(db('pending'),'searchEngines')));
 await assertSucceeds(updateDoc(doc(db('manager'),'searchEngines/direct'),{sites:['f-movies.org','cinehype.sc','example.com'],updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db('manager'),'searchEngines/direct'),{sites:['example.com'],updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(db('owner'),'searchEngines/direct')));
 await assertFails(getDoc(doc(db('viewer'),'searchRateLimits/viewer')));
});
test('a watchlist belongs only to its approved account',async()=>{
 const own=doc(db('viewer'),'userWatch/viewer');
 await assertFails(getDoc(doc(db('pending'),'userWatch/pending')));
 await assertFails(setDoc(doc(db('pending'),'userWatch/pending'),{v:1,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(db('manager'),'userWatch/viewer'),{v:1,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(own,{v:1,progress:{m2:2},favorites:{m2:true},
   skipped:{},lists:{0:{name:'My list',ids:['m2']}},settings:{theme:'dark'},activeList:0,
   name:'My journey',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(own));
 await assertFails(getDoc(doc(db('owner'),'userWatch/viewer')));
 await assertFails(getDocs(collection(db('viewer'),'userWatch')));
 await assertFails(updateDoc(own,{manage:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(own,{progress:{m3:1},updatedAt:serverTimestamp()},{merge:true}));
 const combined=(await getDoc(own)).data();
 assert.equal(combined.progress.m2,2);
 assert.equal(combined.progress.m3,1);
 await assertFails(deleteDoc(own));
});
test('only approved accounts can register their own discoverable username',async()=>{
 const own={uid:'viewer',username:'viewer',createdAt:serverTimestamp()};
 await assertFails(setDoc(doc(db('viewer'),'handles/other'),own));
 await assertFails(setDoc(doc(db('pending'),'handles/pending'),{...own,uid:'pending',username:'pending'}));
 await assertSucceeds(setDoc(doc(db('viewer'),'handles/viewer'),own));
 await assertFails(updateDoc(doc(db('viewer'),'handles/viewer'),{uid:'owner'}));
 await assertSucceeds(getDoc(doc(db('manager'),'handles/viewer')));
});
test('friend requests require approval; progress stays private until accepted',async()=>{
 const d=db('viewer'),other=db('manager'),ref=doc(d,'friendships/manager_viewer');
 const request={a:'manager',b:'viewer',aName:'manager',bName:'viewer',requestedBy:'viewer',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(db('pending'),'friendships/pending_viewer'),{...request,a:'pending',aName:'pending',requestedBy:'pending'}));
 await assertFails(setDoc(ref,{...request,requestedBy:'manager'}));
 await assertSucceeds(setDoc(ref,request));
 await assertSucceeds(getDocs(query(collection(d,'friendships'),where('b','==','viewer'))));
 await assertSucceeds(getDocs(query(collection(other,'friendships'),where('a','==','manager'))));
 await assertFails(getDocs(collection(db('admin'),'friendships')));
 const progress=doc(other,'friendProgress/manager');
 await assertSucceeds(setDoc(progress,{username:'manager',watched:{m2:1},updatedAt:serverTimestamp()}));
 const watch=doc(other,'userWatch/manager');
 await assertSucceeds(setDoc(watch,{v:1,progress:{m2:1},lists:{0:{name:'Main route',ids:['m2']}},activeList:0,
  settings:{route:'personal'},name:'Manager journey',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(d,'friendProgress/manager')));
 await assertFails(getDoc(doc(d,'userWatch/manager')));
 await assertFails(updateDoc(ref,{status:'accepted',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(other,'friendships/manager_viewer'),{status:'accepted',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(d,'friendProgress/manager')));
 await assertSucceeds(getDoc(doc(d,'userWatch/manager')));
 await assertFails(getDocs(collection(d,'userWatch')));
 await assertFails(updateDoc(doc(d,'userWatch/manager'),{name:'Tampered',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db('admin'),'friendProgress/manager')));
 await assertFails(updateDoc(doc(d,'friendProgress/manager'),{watched:{m2:0},updatedAt:serverTimestamp()}));
 await assertSucceeds(deleteDoc(ref));
 await assertFails(getDoc(doc(d,'friendProgress/manager')));
 await assertFails(getDoc(doc(d,'userWatch/manager')));
});
test('the configured owner does not depend on profile role flags',async()=>{
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'system/owner'),{uid:'pending'}));
 const d=db('pending');
 await assertSucceeds(getDoc(doc(d,'titles/original')));
 await assertSucceeds(setDoc(doc(d,'titles/owner-added'),{...title('Owner addition','pending'),createdAt:serverTimestamp()}));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'system/owner'),{uid:'owner'}));
});
test('only owner can subscribe a device and no browser can forge a delivered alert',async()=>{
 const id='87654321-1234-4321-aaaa-0123456789ab';
 const path=`pushSubscriptions/owner/devices/${id}`;
 const subscription={endpoint:'https://push.example.test/device',expirationTime:null,
  keys:{p256dh:'public-device-key',auth:'device-secret'}};
 await assertFails(setDoc(doc(db('viewer'),path),{subscription,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(db('owner'),path),{subscription,admin:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(db('owner'),path),{subscription,updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(db('owner'),path)));
 await assertFails(getDoc(doc(db('admin'),path)));
 await assertFails(setDoc(doc(db('owner'),'pushDelivered/signup'),{sent:true}));
});
