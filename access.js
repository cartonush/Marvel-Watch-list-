import {firebaseConfig,firebaseEnabled} from './firebase-config.js';

if (firebaseEnabled && firebaseConfig) {
  const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,
    signInWithEmailAndPassword,signOut,sendPasswordResetEmail,sendEmailVerification,
    reload},{getFirestore,doc,setDoc,getDoc,getDocs,collection,addDoc,updateDoc,
    runTransaction,serverTimestamp}] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
  ]);
  const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
  let current=null,unsub=null,resolveReady;
  const ready=new Promise(resolve=>resolveReady=resolve);
  const overlay=document.createElement('section');
  overlay.id='access-overlay';
  overlay.setAttribute('aria-live','polite');
  document.body.append(overlay);
  document.documentElement.classList.add('access-locked');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(message=''){
    const user=auth.currentUser;
    const approved=!!current&&current.status==='approved'&&current.view&&user?.emailVerified;
    document.documentElement.classList.toggle('access-locked',!approved);
    if(approved){
      overlay.hidden=true;
      document.getElementById('account-actions')?.remove();
      const actions=document.createElement('div');actions.id='account-actions';
      actions.innerHTML=`<span class="subtle">${esc(user.email)}</span>${current.manage||current.Fmanage?'<a href="admin.html" class="secondary">Manage site</a>':''}<button type="button" class="secondary" id="sign-out">Sign out</button>`;
      document.querySelector('.top-actions,.topbar')?.append(actions);
      actions.querySelector('#sign-out').onclick=()=>signOut(auth);
      resolveReady();
      return;
    }
    overlay.hidden=false;
    if(!user){
      overlay.innerHTML=`<div class="access-panel"><div class="eyebrow">MARVEL LIST</div><h1>Sign in to your watchlist</h1><p>New accounts wait for approval before viewing the collection.</p><form id="access-form"><label>Email<input id="access-email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input id="access-password" type="password" autocomplete="current-password" required minlength="8"></label><div class="modal-actions"><button class="primary" name="mode" value="login">Sign in</button><button class="secondary" name="mode" value="register">Register</button></div></form><button class="text-button" id="reset-password">Reset password</button><p id="access-message" role="status">${esc(message)}</p></div>`;
      overlay.querySelector('#access-form').onsubmit=async e=>{
        e.preventDefault();const form=e.currentTarget,button=e.submitter,email=form.querySelector('#access-email').value.trim(),password=form.querySelector('#access-password').value;
        form.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{
          if(button?.value==='register'){
            const {user:created}=await createUserWithEmailAndPassword(auth,email,password);
            await setDoc(doc(db,'users',created.uid),{email:created.email,view:false,manage:false,Fmanage:false,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
            await sendEmailVerification(created);
            render('Account created. Check your email, then wait for approval.');
          }else await signInWithEmailAndPassword(auth,email,password);
        }catch(err){render(friendlyError(err));}
      };
      overlay.querySelector('#reset-password').onclick=async()=>{
        const email=overlay.querySelector('#access-email').value.trim();
        if(!email){overlay.querySelector('#access-message').textContent='Enter your email first.';return}
        try{await sendPasswordResetEmail(auth,email);overlay.querySelector('#access-message').textContent='If this address has an account, reset instructions will arrive by email.'}catch(err){overlay.querySelector('#access-message').textContent=friendlyError(err)}
      };
      return;
    }
    const pending=!current||current.status==='pending';
    overlay.innerHTML=`<div class="access-panel"><div class="eyebrow">MARVEL LIST</div><h1>${pending?'Approval pending':'Access unavailable'}</h1><p>${!user.emailVerified?'Verify your email address first. ':''}${pending?'A user manager must approve your account before the collection opens.':'This account does not have viewing access.'}</p><p class="subtle">Account ID: <code id="account-id">${esc(user.uid)}</code></p><p id="access-message" role="status">${esc(message)}</p><div class="modal-actions"><button class="secondary" id="copy-account-id">Copy account ID</button><button class="secondary" id="check-access">Check again</button><button class="secondary" id="verify-email">${user.emailVerified?'Email verified':'Send verification email'}</button><button class="secondary" id="sign-out">Sign out</button></div></div>`;
    overlay.querySelector('#copy-account-id').onclick=async()=>{try{await navigator.clipboard.writeText(user.uid);overlay.querySelector('#access-message').textContent='Account ID copied.'}catch{overlay.querySelector('#access-message').textContent='Select the account ID above to copy it.'}};
    overlay.querySelector('#check-access').onclick=async()=>{try{await reload(auth.currentUser);await auth.currentUser.getIdToken(true);const snap=await getDoc(doc(db,'users',auth.currentUser.uid));current=snap.exists()?snap.data():null;render()}catch(err){render(friendlyError(err))}};
    overlay.querySelector('#verify-email').onclick=async()=>{try{await sendEmailVerification(auth.currentUser);render('Verification email sent.')}catch(err){render(friendlyError(err))}};
    overlay.querySelector('#sign-out').onclick=()=>signOut(auth);
  }
  function friendlyError(error){
    if(error?.code==='auth/wrong-password'||error?.code==='auth/invalid-credential'||error?.code==='auth/user-not-found')return 'Invalid email or password.';
    if(error?.code==='auth/email-already-in-use')return 'An account already uses this email.';
    if(error?.code==='auth/weak-password')return 'Choose a stronger password.';
    if(error?.code==='permission-denied')return 'Access denied. Contact the owner.';
    return 'Could not complete the request. Please try again.';
  }
  onAuthStateChanged(auth,async user=>{
    unsub?.();unsub=null;current=null;
    if(!user){render();if(document.getElementById('account-actions'))location.reload();return;}
    try{
      await reload(user);
      unsub=(await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')).onSnapshot(doc(db,'users',user.uid),
        snap=>{current=snap.exists()?snap.data():null;render();},error=>{current=null;render(friendlyError(error))});
    }catch(error){render(friendlyError(error))}
  },error=>render(friendlyError(error)));
  async function catalog(){
    await ready;
    const snap=await getDocs(collection(db,'titles'));
    return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
      const at=a.createdAt?.toMillis?.()||0,bt=b.createdAt?.toMillis?.()||0;
      return at-bt||a.id.localeCompare(b.id);
    });
  }
  async function enrich(base){
    const rows=await catalog(),byId=new Map(base.items.map((x,i)=>[x.id,i]));
    for(const row of rows){
      const known=byId.get(row.id),patch={title:row.title,date:row.date,seconds:row.seconds,
        kind:row.kind,episodes:row.episodes,group:row.group,collections:row.collections,
        url:row.url,poster:row.poster,priority:row.priority,reason:row.reason,archived:row.archived};
      if(known!==undefined){base.items[known]={...base.items[known],...patch};continue}
      const mcu=row.collections.includes('mcu');
      base.items.push({...patch,id:row.id,watched:false,sourceCell:null,order:10000+base.items.length,
        roadTier:'unlisted',roadOrder:99999,roadPart:'',section:'Community additions',
        wikiGroup:row.group==='extra'?(mcu?'legacy':'nonmcu'):row.group,
        catalogSource:'',catalogAdded:false,releaseStatus:'released',
        releaseYear:/\d{4}$/.test(row.date)?Number(row.date.slice(-4)):null,
        releasePrecision:/^\d{2}\/\d{2}\/\d{4}$/.test(row.date)?'day':/^\d{4}$/.test(row.date)?'year':'unknown',
        trackingUnit:row.kind==='series'&&row.episodes===1?'whole series':'title'});
    }
    return base;
  }
  window.MarvelAccess={ready,catalog,enrich,get account(){return current},auth,db,
    firestore:{doc,getDoc,getDocs,collection,addDoc,updateDoc,runTransaction,serverTimestamp,setDoc}};
}
