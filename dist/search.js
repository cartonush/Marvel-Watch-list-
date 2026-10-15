import './access.js?v=1.6.2';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let engines=[],active='direct';

function domain(raw){
  try{
    const url=new URL(raw.includes('://')?raw:'https://'+raw);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)return null;
    const name=url.hostname.toLowerCase().replace(/^www\./,'');
    return /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(name)?name:null;
  }catch{return null}
}

function searchUrl(query,sites){
  const filters=sites.map(site=>'site:'+site).join(' OR ');
  const expression=sites.length===1?filters:'('+filters+')';
  const url=new URL('https://www.google.com/search');
  url.searchParams.set('q','"'+query.replace(/^["“”]+|["“”]+$/g,'')+'" '+expression);
  return url.href;
}

function status(message,error=false){
  const area=$('#site-search-status');
  area.textContent=message;
  area.dataset.error=error?'true':'false';
}

function renderEngines(){
  $('#search-engine-tabs').innerHTML=engines.map(engine=>`<button type="button" class="search-engine-tab ${engine.id===active?'active':''}" data-engine="${esc(engine.id)}" aria-pressed="${engine.id===active}">${esc(engine.name)}</button>`).join('');
  const selected=engines.find(engine=>engine.id===active);
  $('#search-sites-label').textContent=selected?'Search only: '+selected.sites.join(' · '):'';
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-engine]');
  if(!button)return;
  active=button.dataset.engine;
  renderEngines();
  $('#site-search-results').replaceChildren();
  status('');
});

$('#site-search').addEventListener('submit',event=>{
  event.preventDefault();
  const query=$('#site-query').value.trim();
  const selected=engines.find(engine=>engine.id===active);
  if(!selected||query.length<2||query.length>100)return;

  const url=searchUrl(query,selected.sites);
  // Navigate within the user gesture so mobile browsers allow the new tab.
  window.open(url,'_blank','noopener,noreferrer');
  const fallback=document.createElement('a');
  fallback.href=url;
  fallback.target='_blank';
  fallback.rel='noopener noreferrer';
  fallback.className='site-result-link';
  fallback.textContent='Open search results ↗';
  $('#site-search-results').replaceChildren(fallback);
  status('Opened a Google search for '+selected.name+'. If your browser blocked the new tab, use the link below.');
});

(async()=>{
  try{
    const response=await fetch('search-engines.json',{cache:'no-cache'});
    if(!response.ok)throw Error('Could not load search engines.');
    const defaults=await response.json();
    const known=new Map(defaults.map(engine=>[engine.id,{...engine,sites:engine.sites.map(domain).filter(Boolean)}]));
    engines=[...known.values()];
    renderEngines();
    const api=globalThis.MarvelAccess;
    if(!api)return;
    await api.ready;
    try{
      const snapshot=await api.firestore.getDocs(api.firestore.collection(api.db,'searchEngines'));
      for(const row of snapshot.docs){
        const data=row.data();
        if(typeof data.name!=='string'||!Array.isArray(data.sites))continue;
        const sites=[...new Set(data.sites.map(domain).filter(Boolean))].slice(0,10);
        if(sites.length)known.set(row.id,{id:row.id,name:data.name.slice(0,40),sites});
      }
      engines=[...known.values()];
      if(!known.has(active))active=engines[0]?.id;
      renderEngines();
    }catch(error){
      // Built-in searches only need the static site; shared edits need Firestore rules.
      console.info('Shared search engines are unavailable; using built-in engines.',error);
    }
  }catch(error){status('Could not load search engines. Please refresh the page.',true);console.error(error)}
})();
