import {firebaseConfig,firebaseEnabled} from './firebase-config.js';

if (firebaseEnabled && firebaseConfig) {
  const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,
    signInWithEmailAndPassword,signOut},{getFirestore,doc,setDoc,getDoc,getDocs,collection,addDoc,updateDoc,deleteDoc,
    query,where,runTransaction,serverTimestamp}] = await Promise.all([
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
  const aliasDomain='@users.marvel-list.invalid';
  const usernameOf=user=>user?.email?.endsWith(aliasDomain)?user.email.slice(0,-aliasDomain.length):null;
  const normalizeUsername=value=>{
    const name=value.trim().toLowerCase();
    if(!/^[a-z][a-z0-9_]{2,23}$/.test(name))throw Error('Username must be 3–24 characters: letters, numbers or underscores, starting with a letter.');
    return name;
  };
  async function ensurePendingProfile(user){
    const ref=doc(db,'users',user.uid),existing=await getDoc(ref);
    if(existing.exists())return;
    const username=usernameOf(user);
    if(!username)throw Error('This account uses the older email sign-in. Sign out and register a username.');
    try{
      await setDoc(ref,{username,email:user.email,view:false,manage:false,Fmanage:false,
        status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }catch(error){
      if(error?.code==='permission-denied')throw Error('Your username was registered, but Firestore blocked the profile. Publish the updated username rules in Firebase, then tap Check again. Do not register a second account.');
      // A second signed-in tab may have created the pending profile first.
      if(!(await getDoc(ref)).exists())throw error;
    }
  }
  function render(message=''){
    const user=auth.currentUser;
    const approved=!!current&&current.status==='approved'&&current.view&&!!usernameOf(user);
    document.documentElement.classList.toggle('access-locked',!approved);
    const manageNav=document.getElementById('manage-nav');
    if(manageNav)manageNav.hidden=!approved||!(current.manage||current.Fmanage);
    if(approved){
      overlay.hidden=true;
      let button=document.getElementById('profile-button');
      if(!button){button=document.createElement('button');button.id='profile-button';button.className='profile-button';button.type='button';document.querySelector('.top-actions,.topbar')?.append(button)}
      button.innerHTML=`<span id="avatar">${esc((current.username||usernameOf(user))[0].toUpperCase())}</span><span id="profile-label">${esc(current.username||usernameOf(user))}</span><span aria-hidden="true">⌄</span>`;
      button.setAttribute('aria-label','Account menu');button.setAttribute('aria-expanded','false');
      let actions=document.getElementById('account-actions');
      if(!actions){actions=document.createElement('div');actions.id='account-actions';actions.className='account-menu';actions.hidden=true;document.body.append(actions)}
      actions.innerHTML=`<strong>@${esc(current.username||usernameOf(user))}</strong>${document.getElementById('modal')?'<button type="button" data-open-profile>My watch profile</button>':''}${(current.manage||current.Fmanage)&&!manageNav?'<a href="index.html#manage">Manage site</a>':''}<button type="button" id="sign-out">Sign out</button>`;
      button.onclick=()=>{actions.hidden=!actions.hidden;button.setAttribute('aria-expanded',String(!actions.hidden));if(!actions.hidden){const r=button.getBoundingClientRect();actions.style.top=`${r.bottom+8}px`;actions.style.right=`${Math.max(10,innerWidth-r.right)}px`}};
      actions.querySelector('#sign-out').onclick=()=>signOut(auth);
      actions.querySelector('[data-open-profile]')?.addEventListener('click',()=>{actions.hidden=true;button.setAttribute('aria-expanded','false');document.dispatchEvent(new Event('marvel-open-profile'))});
      const handleRef=doc(db,'handles',current.username||usernameOf(user));
      getDoc(handleRef).then(s=>s.exists()?null:setDoc(handleRef,{uid:user.uid,username:current.username||usernameOf(user),createdAt:serverTimestamp()})).catch(()=>{});
      window.dispatchEvent(new Event('marvel-access-change'));
      resolveReady();
      return;
    }
    window.dispatchEvent(new Event('marvel-access-change'));
    overlay.hidden=false;document.getElementById('account-actions')?.remove();
    if(!user){
      overlay.innerHTML=`<div class="access-panel"><div class="eyebrow">MARVEL LIST</div><h1>Sign in to your watchlist</h1><p>Choose a username and password. New accounts wait for approval before viewing the collection.</p><form id="access-form"><label>Username<input id="access-username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="24" pattern="[A-Za-z][A-Za-z0-9_]{2,23}"></label><label>Password<input id="access-password" type="password" autocomplete="current-password" required minlength="8"></label><div class="modal-actions"><button class="primary" name="mode" value="login">Sign in</button><button class="secondary" name="mode" value="register">Register</button></div></form><p class="subtle">Forgot your password? Ask the site owner to help reset it.</p><p id="access-message" role="status">${esc(message)}</p></div>`;
      overlay.querySelector('#access-form').onsubmit=async e=>{
        e.preventDefault();const form=e.currentTarget,button=e.submitter,password=form.querySelector('#access-password').value;
        form.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{
          const email=normalizeUsername(form.querySelector('#access-username').value)+aliasDomain;
          if(button?.value==='register'){
            await createUserWithEmailAndPassword(auth,email,password);
            render('Account created. Wait for approval to access the collection.');
          }else await signInWithEmailAndPassword(auth,email,password);
        }catch(err){render(friendlyError(err));}
      };
      return;
    }
    const pending=!current||current.status==='pending';
    overlay.innerHTML=`<div class="access-panel"><div class="eyebrow">MARVEL LIST</div><h1>${pending?'Approval pending':'Access unavailable'}</h1><p>${pending?'A user manager must approve your account before the collection opens. If you own this site, use your Account ID for the one-time owner setup.':'This account does not have viewing access.'}</p><p class="subtle">Username: ${esc(usernameOf(user)||'older email account')} · Account ID: <code id="account-id">${esc(user.uid)}</code></p><p id="access-message" role="status">${esc(message)}</p><div class="modal-actions"><button class="secondary" id="copy-account-id">Copy account ID</button><button class="secondary" id="check-access">Check again</button><button class="secondary" id="sign-out">Sign out</button></div></div>`;
    overlay.querySelector('#copy-account-id').onclick=async()=>{try{await navigator.clipboard.writeText(user.uid);overlay.querySelector('#access-message').textContent='Account ID copied.'}catch{overlay.querySelector('#access-message').textContent='Select the account ID above to copy it.'}};
    overlay.querySelector('#check-access').onclick=async()=>{try{await auth.currentUser.getIdToken(true);await ensurePendingProfile(auth.currentUser);const snap=await getDoc(doc(db,'users',auth.currentUser.uid));current=snap.exists()?snap.data():null;render()}catch(err){render(friendlyError(err))}};
    overlay.querySelector('#sign-out').onclick=()=>signOut(auth);
  }
  function friendlyError(error){
    if(error?.code==='auth/wrong-password'||error?.code==='auth/invalid-credential'||error?.code==='auth/user-not-found')return 'Invalid username or password.';
    if(error?.code==='auth/email-already-in-use')return 'That username is taken. Choose another or sign in.';
    if(error?.code==='auth/weak-password')return 'Choose a stronger password.';
    if(error?.code==='auth/operation-not-allowed')return 'Email/password sign-in is disabled in Firebase Authentication.';
    if(error?.code==='auth/unauthorized-domain')return 'This domain is not authorized in Firebase Authentication.';
    if(error?.code==='auth/network-request-failed')return 'Could not reach Firebase. Check your connection and try again.';
    if(error?.code==='auth/too-many-requests')return 'Too many attempts. Please wait and try again.';
    if(error?.code==='auth/invalid-email')return 'Check the username and try again.';
    if(error?.code==='permission-denied')return 'Access denied. Contact the owner.';
    if(error?.message?.startsWith('Username must')||error?.message?.startsWith('This account uses')||error?.message?.startsWith('Your username was registered'))return error.message;
    const code=String(error?.code||'');
    return /^([a-z-]+\/)?[a-z-]+$/.test(code)?`Could not complete the request (${code}). Please try again.`:'Could not complete the request. Please try again.';
  }
  onAuthStateChanged(auth,async user=>{
    unsub?.();unsub=null;current=null;
    if(!user){render();if(document.getElementById('account-actions'))location.reload();return;}
    try{
      await ensurePendingProfile(user);
      if(auth.currentUser?.uid!==user.uid)return;
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
    firestore:{doc,getDoc,getDocs,collection,addDoc,updateDoc,deleteDoc,query,where,runTransaction,serverTimestamp,setDoc}};
  document.addEventListener('click',e=>{const menu=document.getElementById('account-actions'),button=document.getElementById('profile-button');if(menu&&!menu.hidden&&!menu.contains(e.target)&&!button?.contains(e.target)){menu.hidden=true;button?.setAttribute('aria-expanded','false')}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.getElementById('account-actions');if(menu)menu.hidden=true;document.getElementById('profile-button')?.setAttribute('aria-expanded','false')}});
}
