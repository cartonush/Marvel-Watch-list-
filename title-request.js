import './access.js?v=1.6.5';
const form=document.getElementById('suggest-title'),status=document.getElementById('suggest-status');
form.onsubmit=async event=>{
 event.preventDefault();const api=window.MarvelAccess;await api.ready;
 const title=form.elements.title.value.trim(),imdb=form.elements.imdb.value.trim(),reason=form.elements.reason.value.trim();
 if(!/^https:\/\/www\.imdb\.com\/title\/tt\d{7,10}\/$/.test(imdb)){status.textContent='Use a complete IMDb title link ending in /.';return}
 const button=form.querySelector('button');button.disabled=true;status.textContent='Sending…';
 try{await api.firestore.addDoc(api.firestore.collection(api.db,'titleRequests'),{title,imdb,reason,requestedBy:api.auth.currentUser.uid,status:'pending',createdAt:api.firestore.serverTimestamp(),updatedAt:api.firestore.serverTimestamp()});form.reset();status.textContent='Suggestion sent. A manager will review it.'}
 catch(error){status.textContent=error?.code==='permission-denied'?'Publish the latest Firestore rules to send suggestions.':'Could not send your suggestion.'}
 finally{button.disabled=false}
};
