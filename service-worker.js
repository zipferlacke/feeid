/**
 * service-worker.js
 * Feeid PWA Service Worker
 *
 * Strategie:
 * - App-Shell (HTML, CSS, JS) → Cache First (offline nutzbar)
 * - API-Aufrufe (proxy.php, reader.php) → Network First (immer frische Daten)
 * - Bilder → Stale While Revalidate (schnell + aktuell)
 */

const CACHE_NAME = 'feeid-v1';

// Basis-URL des SW ermitteln (funktioniert in jedem Unterordner)
const BASE = self.registration.scope;

// App-Shell Dateien – relativ zur SW-Scope
const SHELL_FILES = [
  BASE,
  BASE + 'index.html',
  BASE + 'css/controll.css',
  BASE + 'css/feeid.css',
  BASE + 'css/colors.css',
  BASE + 'js/app.js',
  BASE + 'js/store.js',
  BASE + 'js/feeds.js',
  BASE + 'js/renderer.js',
  BASE + 'js/config.js',
  BASE + 'js/notifications.js',
  BASE + 'manifest.json',
  BASE + 'libs/wuefl-libs/css/fonts/google-icons-rounded.woff2',
  BASE + 'libs/wuefl-libs/css/fonts/google-icons-rounded.css',
  BASE + 'libs/wuefl-libs/banner/banner.js',
  BASE + 'libs/wuefl-libs/banner/banner.css',
  BASE + 'libs/wuefl-libs/userDialog/userDialog.js',
  BASE + 'libs/wuefl-libs/userDialog/userDialog.css'
];

// ── Installation ──────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // addAll bricht bei einem Fehler ab – stattdessen einzeln cachen
      Promise.allSettled(
        SHELL_FILES.map(url =>
          cache.add(url).catch(err =>
            console.warn('SW: Cache-Fehler für', url, err)
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ── Aktivierung ───────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    // Alte Caches löschen
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Externe Requests (RSS-Feeds, ActivityPub) → immer Network, nie cachen
  if (!url.origin.includes(self.location.origin)) {
    return; // Browser übernimmt selbst
  }

  // API-Aufrufe (proxy.php, reader.php) → immer Network First
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Fonts → Cache First (ändert sich nie)
  if (url.pathname.includes('/fonts/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App-Shell → Network First, Cache als Fallback (offline)
  event.respondWith(networkFirst(event.request));
});

// ── Strategien ────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}


async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── Periodic Background Sync ──────────────────────

self.addEventListener('periodicsync', event => {
  if (event.tag === 'feeid-feed-check') {
    event.waitUntil(checkFeeds());
  }
});

// ── Notification Klick ────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});

// ── Feed Check im SW ──────────────────────────────

async function checkFeeds() {
  // idb-keyval direkt im SW nutzen
  const { get, set } = await import('https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm');
  const data = await get('feeid_data');
  if (!data) return;

  const enabledFeeds = data.feeds.filter(f => f.notifications?.enabled);

  for (const feed of enabledFeeds) {
    try {
      const res = await fetch(`${data._server_url || ''}/api/proxy.php?url=${encodeURIComponent(feed.url)}`);
      const json = await res.json();
      const items = json.items || [];
      if (!items.length) continue;

      const newest = items[0];
      const newestId = newest.guid || newest.id || newest.link;

      if (newestId && newestId !== feed.last_seen_item_id) {
        // Kategorie-Filter
        const cats = feed.notifications.categories ?? [];
        const itemCats = newest.category ? [newest.category].flat() : [];
        const allowed = cats.length === 0 || cats.some(c => c.enabled && itemCats.includes(c.name));

        if (allowed) {
          await self.registration.showNotification(feed.title || 'Feeid', {
            body: newest.title || 'Neuer Eintrag',
            icon: feed.avatar_url || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: newest.link || newest.url },
            tag: feed.id
          });
        }

        feed.last_seen_item_id = newestId;
      }
    } catch (err) {
      console.warn('Feeid SW: Feed-Check Fehler', feed.url, err);
    }
  }

  // Aktualisierten Stand speichern
  await set('feeid_data', data);
}