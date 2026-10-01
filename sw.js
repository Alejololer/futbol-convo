// Recibe los push y muestra el aviso. Siempre muestra algo: iOS revoca la suscripción si un push llega sin notificación.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'Convocatoria ⚽', {
    body: d.body || 'Hay cambios en la lista',
    icon: '/icon-512.png',
    data: { url: d.url || '/' },
  }));
});

// Sin claim, la página que registró el SW queda sin controlar hasta recargar y navigate() fallaría justo después de activar.
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data.url, self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(w => w.url === url) || ws[0];
    return w ? w.navigate(url).then(w => w.focus()).catch(() => clients.openWindow(url)) : clients.openWindow(url);
  }));
});
