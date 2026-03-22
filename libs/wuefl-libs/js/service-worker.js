// service-worker.js

const CACHE_NAME = 'site-static-v1.0.0';  // Erhöhe die Versionsnummer bei größeren Releases

self.addEventListener('install', event => {
  // Direkt aktivieren, damit activate/Event‑Listeners sofort greifen
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Alte Caches entfernen, wenn CACHE_NAME sich ändert
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { pathname } = new URL(event.request.url);

  // Cache‑First + Stale‑While‑Revalidate für: /defaults/, /css/, /js/
  if (pathname.startsWith('/defaults/') || pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const networkFetch = fetch(event.request)
          .then(networkResponse => {
            // Im Hintergrund den Cache aktualisieren
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          })
          .catch(() => {
            // Falls Netzwerk komplett ausfällt, liefern wir das Cache‑Ergebnis
            return cachedResponse;
          });
        // Sofort das Cache‑Ergebnis (oder undefined) zurückgeben,
        // parallel das Netzwerk holen und Cache aktualisieren
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Für alle anderen Requests: Web‑First (Network‑First)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Optional: auch hier cachen, wenn gewünscht
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
