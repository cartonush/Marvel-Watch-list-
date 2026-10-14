import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {cleanSites,searchQuery,filterResults} from './search-core.mjs';

initializeApp();
const db=getFirestore(),apiKey=defineSecret('BRAVE_SEARCH_API_KEY');
const defaults=JSON.parse(readFileSync(fileURLToPath(new URL('./search-engines.json',import.meta.url)),'utf8'));
const known=new Map(defaults.map(x=>[x.id,x]));
const accountDomain=/^[a-z][a-z0-9_]{2,23}@users\.marvel-list\.invalid$/;

export const searchSites=onCall({region:'europe-west1',secrets:[apiKey],maxInstances:2,timeoutSeconds:20},async request=>{
  const user=request.auth;
  if(!user||!accountDomain.test(user.token.email||''))throw new HttpsError('unauthenticated','Sign in to search.');
  const [profile,owner]=await Promise.all([db.doc('users/'+user.uid).get(),db.doc('system/owner').get()]);
  const approved=(profile.data()?.status==='approved'&&profile.data()?.view===true)||owner.data()?.uid===user.uid;
  if(!approved)throw new HttpsError('permission-denied','Account approval is required.');
  const id=request.data?.engineId,term=request.data?.query;
  if(typeof id!=='string'||!(/^(direct|torrents|subs)$/.test(id)||/^custom-[a-f0-9-]{36}$/.test(id)))
    throw new HttpsError('invalid-argument','Unknown engine.');
  const saved=await db.doc('searchEngines/'+id).get(),engine=saved.exists?saved.data():known.get(id);
  const sites=cleanSites(engine?.sites);
  if(!sites.length||!engine?.name)throw new HttpsError('invalid-argument','Unknown engine.');
  let q;
  try{q=searchQuery(term,sites)}catch{throw new HttpsError('invalid-argument','Enter a title between 2 and 100 characters.')}
  if(!apiKey.value())throw new HttpsError('failed-precondition','Search API key is not configured.');
  // Shared Firestore rate limit works across all function instances; no search terms are stored.
  const rate=db.doc('searchRateLimits/'+user.uid),now=Date.now();
  await db.runTransaction(async tx=>{
    const snap=await tx.get(rate),last=snap.data(),newWindow=!last||now-last.startedAt>=60000;
    if(!newWindow&&last.count>=10)throw new HttpsError('resource-exhausted','Search limit reached. Try again shortly.');
    tx.set(rate,{startedAt:newWindow?now:last.startedAt,count:newWindow?1:last.count+1,updatedAt:FieldValue.serverTimestamp()});
  });
  const url=new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q',q);url.searchParams.set('count','20');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch(url,{headers:{Accept:'application/json','X-Subscription-Token':apiKey.value()},signal:controller.signal});
    if(response.status===429)throw new HttpsError('resource-exhausted','The search provider is busy. Try later.');
    if(!response.ok)throw new HttpsError('unavailable','The search provider is unavailable.');
    const json=await response.json();
    return {engineId:id,results:filterResults(json?.web?.results,sites)};
  }catch(error){
    if(error instanceof HttpsError)throw error;
    throw new HttpsError('unavailable','Search timed out. Try again.');
  }finally{clearTimeout(timer)}
});
