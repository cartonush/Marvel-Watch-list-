// Keep the friend's page independent of the editable personal watchlist.
if(new URLSearchParams(location.search).has('friend')){
  document.body.classList.add('friend-home-page');
  document.querySelector('main').innerHTML='<section class="saved-list friend-home-loading" role="status">Opening your friend’s watchlist…</section>';
  import('./friend-home.js?v=1.6.1-friends');
}else{
  import('./app.js?v=1.6.1-friends');
  import('./admin.js?v=1.6.1-friends');
}
