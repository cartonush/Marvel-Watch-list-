import './access.js?v=1.6.5';
const api=window.MarvelAccess,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let uid='',friends=[],incoming=[],outgoing=[],off=[];
function render(){
 const friend=$('#message-friend').value;if(!friend)return;
 const messages=[...incoming,...outgoing].filter(x=>[x.from,x.to].includes(friend)).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));
 $('#message-thread').innerHTML=messages.length?messages.map(m=>`<div class="message-bubble ${m.from===uid?'mine':''}"><p>${esc(m.text)}</p><small>${esc(m.createdAt?.toDate?.()?.toLocaleString()||'Sending…')}</small></div>`).join(''):'<p class="subtle">No messages yet. Say hello!</p>';
 $('#message-thread').scrollTop=$('#message-thread').scrollHeight;
}
$('#message-friend').onchange=()=>{const url=new URL(location.href);url.searchParams.set('friend',$('#message-friend').value);history.replaceState(null,'',url);render()};
$('#message-form').onsubmit=async e=>{
 e.preventDefault();const to=$('#message-friend').value,text=$('#message-text').value.trim();
 if(!friends.some(x=>x.uid===to)||!text)return;
 const button=e.currentTarget.querySelector('button');button.disabled=true;
 try{await api.firestore.addDoc(api.firestore.collection(api.db,'messages'),{from:uid,to,text,createdAt:api.firestore.serverTimestamp()});$('#message-text').value='';$('#message-status').textContent='Sent.'}
 catch(error){$('#message-status').textContent=error?.code==='permission-denied'?'Only accepted friends can exchange messages. Publish the latest rules if you are friends.':'Message could not be sent.'}
 finally{button.disabled=false}
};
try{
 await api.ready;uid=api.auth.currentUser.uid;const f=api.firestore;
 const [a,b]=await Promise.all(['a','b'].map(field=>f.getDocs(f.query(f.collection(api.db,'friendships'),f.where(field,'==',uid)))));
 const relations=new Map([...a.docs,...b.docs].map(x=>[x.id,x.data()]));
 friends=[...relations.values()].filter(x=>x.status==='accepted').map(x=>x.a===uid?{uid:x.b,name:x.bName}:{uid:x.a,name:x.aName});
 const selected=new URLSearchParams(location.search).get('friend');
 $('#message-friend').innerHTML='<option value="">Choose a friend</option>'+friends.map(x=>`<option value="${esc(x.uid)}">@${esc(x.name)}</option>`).join('');
 if(friends.some(x=>x.uid===selected))$('#message-friend').value=selected;
 if(!friends.length)$('#message-status').textContent='Add a friend first to send messages.';
 for(const [field,write]of [['from',value=>outgoing=value],['to',value=>incoming=value]])off.push(f.onSnapshot(f.query(f.collection(api.db,'messages'),f.where(field,'==',uid)),snap=>{write(snap.docs.map(d=>({id:d.id,...d.data()})));render()},error=>{$('#message-status').textContent=error?.code==='permission-denied'?'Publish the latest Firestore rules to read messages.':'Could not load messages.'}));
 render();
}catch{$('#message-status').textContent='Could not open messages.'}
window.addEventListener('pagehide',()=>off.forEach(fn=>fn()));
