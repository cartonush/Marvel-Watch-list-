/* Locally persisted JSON. Large values use verified chunks and an atomic manifest. */
globalThis.MarvelCookies=(()=>{
 const pack=v=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const unpack=s=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
 const raw=k=>document.cookie.split('; ').find(s=>s.startsWith(k+'='))?.slice(k.length+1);
 const suffix=()=>'; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
 function put(k,v){document.cookie=k+'='+v+'; Max-Age=34560000'+suffix();if(raw(k)!==v)throw Error('Browser storage is blocked or full. Export a backup before continuing.');}
 function clear(k){document.cookie=k+'=; Max-Age=0'+suffix();}
 function manifest(s){try{const m=unpack(s);return m?.cookieChunks===1&&/^[a-f0-9]+$/.test(m.g)&&Number.isInteger(m.n)&&m.n>0&&m.n<=24?m:null}catch{return null}}
 function tidy(k,s){const m=manifest(s);if(m)for(let i=0;i<m.n;i++)clear(k+'_'+m.g+'_'+i);}
 function read(k){try{let s=raw(k);if(!s)return null;const m=manifest(s);if(m){s='';for(let i=0;i<m.n;i++){const part=raw(k+'_'+m.g+'_'+i);if(part===undefined)throw Error('Missing storage chunk');s+=part;}}return unpack(s)}catch{return null}}
 function write(k,v){const s=pack(v),before=raw(k);if(s.length<=3500){put(k,s);tidy(k,before);return;}const n=Math.ceil(s.length/3500);if(n>24)throw Error('This saved item is too large. Export a backup.');const g=Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');try{for(let i=0;i<n;i++)put(k+'_'+g+'_'+i,s.slice(i*3500,(i+1)*3500));put(k,pack({cookieChunks:1,g,n}));}catch(e){for(let i=0;i<n;i++)clear(k+'_'+g+'_'+i);throw e;}tidy(k,before);}
 function remove(k){const s=raw(k);clear(k);tidy(k,s);}
 return{read,write,remove,pack};
})();
