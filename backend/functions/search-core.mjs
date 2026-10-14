export function domain(raw){
  try{
    const u=new URL(raw.includes('://')?raw:'https://'+raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)return null;
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    return /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(host)?host:null;
  }catch{return null}
}
export function allowedUrl(raw,sites){
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password)return null;
    const host=u.hostname.toLowerCase();
    return sites.some(site=>host===site||host.endsWith('.'+site))?u.href:null;
  }catch{return null}
}
export function cleanSites(rows){
  if(!Array.isArray(rows))return [];
  return [...new Set(rows.map(domain).filter(Boolean))].slice(0,10);
}
export function searchQuery(raw,sites){
  if(typeof raw!=='string'||raw.trim().length<2||raw.trim().length>100||!sites.length)throw Error('Invalid search');
  const term=raw.trim().replace(/["\\\r\n\t]/g,' ').replace(/\s+/g,' ');
  if(term.length<2)throw Error('Invalid search');
  return `"${term}" ${sites.map(site=>'site:'+site).join(' OR ')}`;
}
export function filterResults(rows,sites){
  if(!Array.isArray(rows))return [];
  const seen=new Set(),results=[];
  for(const row of rows){
    const url=allowedUrl(row?.url,sites);
    if(!url||seen.has(url))continue;
    seen.add(url);
    results.push({title:String(row?.title||url).slice(0,200),description:String(row?.description||'').replace(/<[^>]*>/g,'').slice(0,500),url});
    if(results.length===20)break;
  }
  return results;
}
