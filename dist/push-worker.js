self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { message = {}; }
  const title = typeof message.title === 'string' ? message.title.slice(0, 80) : 'Marvel List';
  const body = typeof message.body === 'string' ? message.body.slice(0, 180) : 'You have an update.';
  const target = new URL('index.html?manage=1', self.registration.scope);
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: typeof message.tag === 'string' ? message.tag.slice(0, 100) : 'marvel-list',
    data: { url: target.href }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || 'index.html?manage=1', self.registration.scope);
    if (target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) return;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(window => window.url.startsWith(self.registration.scope));
    if (existing) { await existing.focus(); await existing.navigate(target.href); }
    else await clients.openWindow(target.href);
  })());
});
