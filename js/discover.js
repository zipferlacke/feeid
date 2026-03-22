/**
 * discover.js
 * Feeid – Entdecken
 *
 * - Zeigt kuratierte Standard-Feeds beim Laden
 * - Suche über allorigins-Proxy (kein PHP nötig)
 * - Kategorie-Filter via wuefl-libs SelectPicker
 * - OSM für lokale Feeds wenn Standort gesetzt
 *
 * Icons: explore, hub, rss_feed, add, add_link, location_on,
 *        search_off, refresh, check, hourglass_empty
 */

import { store } from './store.js';
import { config } from './config.js';
import { SelectPicker } from '../libs/wuefl-libs/selectpicker/selectpicker_v1_0_0.js';
import { showBanner } from '../libs/wuefl-libs/banner/banner.js';

// ── Kuratierte Standard-Feeds ─────────────────────
// Werden direkt beim Laden angezeigt ohne Suche

const DEFAULT_FEEDS = [
  {
    title: 'Tagesschau',
    url: 'https://www.tagesschau.de/index~rss2.xml',
    description: 'Aktuelle Nachrichten aus Deutschland und der Welt',
    type: 'rss',
    category: 'news',
    avatar: 'https://www.tagesschau.de/favicon.ico'
  },
  {
    title: 'Tagesschau (Mastodon)',
    url: 'https://ard.social/@tagesschau/outbox',
    description: 'Tagesschau auf ActivityPub',
    type: 'activitypub',
    category: 'news',
    avatar: 'https://ard.social/system/accounts/avatars/109/308/984/914/700/422/original/93f13e4c1dd33f89.jpg'
  },
  {
    title: 'Deutschlandfunk',
    url: 'https://www.deutschlandfunk.de/die-nachrichten.353.de.rss',
    description: 'Nachrichten vom Deutschlandfunk',
    type: 'rss',
    category: 'news',
    avatar: ''
  },
  {
    title: 'Chaos Computer Club',
    url: 'https://www.ccc.de/de/feeds/blog.xml',
    description: 'News vom CCC – Technik, Netzpolitik, Gesellschaft',
    type: 'rss',
    category: 'tech',
    avatar: 'https://www.ccc.de/favicon.ico'
  },
  {
    title: 'Netzpolitik.org',
    url: 'https://netzpolitik.org/feed/',
    description: 'Digitale Bürgerrechte und Netzpolitik',
    type: 'rss',
    category: 'tech',
    avatar: 'https://netzpolitik.org/favicon.ico'
  },
  {
    title: 'heise online',
    url: 'https://www.heise.de/rss/heise-atom.xml',
    description: 'IT-News und Hintergrundberichte',
    type: 'rss',
    category: 'tech',
    avatar: 'https://www.heise.de/favicon.ico'
  },
  {
    title: 'Bundesregierung',
    url: 'https://www.bundesregierung.de/service/rss/breg-de/1151242/feed.xml',
    description: 'Aktuelle Meldungen der Bundesregierung',
    type: 'rss',
    category: 'news',
    avatar: ''
  },
  {
    title: 'Mastodon.social – Lokal',
    url: 'https://mastodon.social/public/local.rss',
    description: 'Öffentliche Posts von mastodon.social',
    type: 'rss',
    category: 'lokal',
    avatar: 'https://mastodon.social/favicon.ico'
  },
  {
    title: 'Flipboard – Deutschland',
    url: 'https://flipboard.com/topic/de-germany.rss',
    description: 'Kuratierte Nachrichten aus Deutschland',
    type: 'rss',
    category: 'news',
    avatar: ''
  },
  {
    title: 'Kulturzeit (3sat)',
    url: 'https://www.3sat.de/kultur/kulturzeit/100.xml',
    description: 'Kultur und Gesellschaft von 3sat',
    type: 'rss',
    category: 'kultur',
    avatar: ''
  }
];

// ── SelectPicker initialisieren ───────────────────

let activeCategory = '';
const sp = new SelectPicker({});

// ── State ─────────────────────────────────────────

let allResults = [...DEFAULT_FEEDS];
let searchTimeout;

// ── Init ──────────────────────────────────────────

async function init() {
  // SelectPicker auf Kategorie-Select anwenden
  const catSelect = document.getElementById('discover-category-select');
  sp.create(catSelect, { title: 'Kategorie wählen', search: false });
  catSelect.addEventListener('change', () => {
    activeCategory = catSelect.value;
    renderFiltered();
  });

  // Suche – erkennt URLs und @handles automatisch
  const searchEl = document.getElementById('discover-search');
  searchEl?.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    searchTimeout = setTimeout(() => runSearch(val), 350);
  });
  searchEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = searchEl.value.trim();
      if (isDirectUrl(val)) handleDirectAdd(val, searchEl);
    }
  });

  // ActivityPub Toggle
  document.getElementById('discover-only-ap')?.addEventListener('change', renderFiltered);

  // Standort-basierte Feeds laden wenn vorhanden
  const data = await store.load();
  if (data.profile.location.enabled && data.profile.location.lat) {
    const osmFeeds = await loadOsmFeeds(data.profile.location);
    if (osmFeeds.length) allResults = [...DEFAULT_FEEDS, ...osmFeeds];
  }

  // Standard-Feeds anzeigen
  renderFiltered();
}

// ── Suche ─────────────────────────────────────────

function isDirectUrl(val) {
  return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('@');
}

async function runSearch(query) {
  if (!query) {
    allResults = [...DEFAULT_FEEDS];
    renderFiltered();
    return;
  }

  // URL oder @handle → direkt als abonnierbaren Treffer anzeigen
  if (isDirectUrl(query)) {
    const url = query.startsWith('@') ? `https://${query.split('@')[2]}/@${query.split('@')[1]}` : query;
    allResults = [{
      title: query,
      url,
      description: 'Feed direkt abonnieren',
      type: query.startsWith('@') ? 'activitypub' : 'rss',
      category: '',
      avatar: ''
    }];
    renderFiltered();
    return;
  }

  showLoading();

  // Lokale Suche in Standard-Feeds
  const localMatches = DEFAULT_FEEDS.filter(f =>
    f.title.toLowerCase().includes(query.toLowerCase()) ||
    f.description.toLowerCase().includes(query.toLowerCase()) ||
    f.category.includes(query.toLowerCase())
  );

  // Externe Suche via allorigins (rss-verzeichnis.de)
  const external = await searchRssVerzeichnis(query);

  allResults = [...localMatches, ...external];
  renderFiltered();
}

async function searchRssVerzeichnis(query) {
  try {
    // rss-verzeichnis.de Suche via CORS-Proxy
    const url = `https://www.rss-verzeichnis.de/suche.php?s=${encodeURIComponent(query)}`;
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const html = await res.text();
    return parseRssVerzeichnis(html);
  } catch {
    return [];
  }
}

function parseRssVerzeichnis(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const results = [];

  // rss-verzeichnis.de Struktur
  doc.querySelectorAll('.rss-item, .entry, .result-item, li:has(a[href*=".xml"]), li:has(a[href*="feed"])').forEach(el => {
    const titleEl = el.querySelector('a, h2, h3, strong');
    const title = titleEl?.textContent?.trim();
    const feedUrl = el.querySelector('a[href*=".xml"], a[href*="feed"], a[href*="rss"]')?.href
      || titleEl?.href;
    const desc = el.querySelector('p, .desc, small')?.textContent?.trim() || '';

    if (title && feedUrl && feedUrl.startsWith('http')) {
      results.push({
        title,
        url: feedUrl,
        description: desc,
        type: 'rss',
        category: '',
        source: 'rss-verzeichnis.de'
      });
    }
  });

  return results.slice(0, 10);
}

// ── OSM lokale Feeds ──────────────────────────────

async function loadOsmFeeds(location) {
  const radius = (location.radius_km || 50) * 1000;
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"community_centre|social_centre"]["website"](around:${radius},${location.lat},${location.lng});
      node["office"~"association|ngo"]["website"](around:${radius},${location.lat},${location.lng});
    );
    out body 15;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    const json = await res.json();
    return (json.elements || [])
      .filter(el => el.tags?.website)
      .map(el => ({
        title: el.tags.name || 'Lokaler Verein',
        url: el.tags.website,
        description: [el.tags['addr:city'], el.tags['addr:street']].filter(Boolean).join(', '),
        type: 'website',
        category: 'lokal',
        source: 'OpenStreetMap',
        isLocal: true
      }));
  } catch {
    return [];
  }
}

// ── Render ────────────────────────────────────────

function renderFiltered() {
  const onlyAp = document.getElementById('discover-only-ap')?.checked;
  let filtered = allResults;

  if (activeCategory) {
    filtered = filtered.filter(f => f.category === activeCategory);
  }
  if (onlyAp) {
    filtered = filtered.filter(f => f.type === 'activitypub');
  }

  renderResults(filtered);
}

function showLoading() {
  document.getElementById('discover-results').innerHTML = `
    <div style="text-align:center; padding:3rem; color:var(--clr-neutral-500)">
      <span class="msr" style="font-size:2rem;display:block;margin-bottom:0.5rem">refresh</span>
      Suche läuft…
    </div>`;
}

function renderResults(results) {
  const el = document.getElementById('discover-results');

  if (!results.length) {
    el.innerHTML = `
      <div style="text-align:center; padding:3rem; color:var(--clr-neutral-500)">
        <span class="msr" style="font-size:2.5rem;display:block;margin-bottom:0.5rem">search_off</span>
        <p>Keine Feeds gefunden</p>
      </div>`;
    return;
  }

  el.innerHTML = `<div class="discover-grid">${results.map(card).join('')}</div>`;

  el.querySelectorAll('.discover-subscribe-btn').forEach(btn => {
    btn.addEventListener('click', () => subscribeFeed(btn.dataset.url, btn.dataset.title, btn));
  });

  // Ersten Post lazy laden per IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      loadFirstPost(entry.target);
    });
  }, { rootMargin: '100px' });

  el.querySelectorAll('.discover-card[data-feed-url]').forEach(card => observer.observe(card));
}

function card(feed) {
  const typeIcon = feed.type === 'activitypub' ? 'hub' : 'rss_feed';
  const typeLabel = feed.type === 'activitypub' ? 'ActivityPub' : 'RSS';

  return `
    <div class="card discover-card" data-feed-url="${escapeHtml(feed.url)}" data-feed-avatar="${escapeHtml(feed.avatar || '')}">
      <div class="discover-card__preview"></div>
      <div class="discover-card__body">
        <div class="discover-card__header">
          <div class="discover-card__avatar">
            ${feed.avatar
              ? `<img src="${escapeHtml(feed.avatar)}" onerror="this.style.display='none'" alt="">`
              : `<span class="msr" style="color:var(--clr-primary-600)">${typeIcon}</span>`}
          </div>
          <div>
            <h3>${escapeHtml(feed.title)}</h3>
            <span class="tag">${typeLabel}</span>
            ${feed.isLocal ? `<span class="tag"><span class="msr" style="font-size:0.8rem">location_on</span> Lokal</span>` : ''}
            ${feed.source ? `<span class="tag">${escapeHtml(feed.source)}</span>` : ''}
          </div>
        </div>
        ${feed.description ? `<p class="discover-card__desc">${escapeHtml(feed.description)}</p>` : ''}
        <div class="discover-card__post-preview"></div>
        <div class="discover-card__footer">
          <button class="button discover-subscribe-btn"
                  data-url="${escapeHtml(feed.url)}"
                  data-title="${escapeHtml(feed.title)}">
            <span class="msr">add</span>
            Abonnieren
          </button>
        </div>
      </div>
    </div>`;
}

async function loadFirstPost(cardEl) {
  const feedUrl = cardEl.dataset.feedUrl;
  const feedAvatar = cardEl.dataset.feedAvatar;
  const previewEl = cardEl.querySelector('.discover-card__post-preview');
  const imgEl = cardEl.querySelector('.discover-card__preview');
  if (!previewEl) return;

  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`);
    if (!res.ok) return;
    const text = await res.text();

    // RSS oder JSON parsen
    let title = '', summary = '', image = '';
    if (text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      const item = json.orderedItems?.[0] || json.items?.[0];
      if (item) {
        const obj = item.object || item;
        title = obj.name || obj.summary || '';
        summary = (obj.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
        image = Array.isArray(obj.attachment)
          ? (obj.attachment.find(a => a.mediaType?.startsWith('image/'))?.url || '')
          : '';
      }
    } else {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const item = doc.querySelector('item, entry');
      if (item) {
        title = item.querySelector('title')?.textContent?.trim() || '';
        const desc = item.querySelector('description, summary, content')?.textContent || '';
        summary = desc.replace(/<[^>]+>/g, '').trim().slice(0, 120);
        const enc = item.querySelector('enclosure');
        image = enc?.getAttribute('url') || '';
        if (!image) {
          const match = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
          image = match?.[1] || '';
        }
      }
    }

    // Bild: Post-Bild oder Feed-Avatar als Fallback
    const imgSrc = image || feedAvatar;
    if (imgSrc && imgEl) {
      imgEl.innerHTML = `<img src="${escapeHtml(imgSrc)}" alt="" onerror="this.parentElement.style.display='none'">`;
    }

    if (title || summary) {
      previewEl.innerHTML = `
        ${title ? `<p class="discover-card__post-title">${escapeHtml(title)}</p>` : ''}
        ${summary ? `<p class="discover-card__post-summary">${escapeHtml(summary)}${summary.length >= 120 ? '…' : ''}</p>` : ''}`;
    }
  } catch {
    // Kein Preview – kein Problem
  }
}

// ── Aktionen ──────────────────────────────────────

async function subscribeFeed(url, title, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="msr">hourglass_empty</span>';

  const data = await store.load();
  if (data.feeds.some(f => f.url === url)) {
    btn.innerHTML = '<span class="msr">check</span> Bereits abonniert';
    return;
  }

  await store.addFeed({ url, title, avatar_url: '', type: 'rss' });
  btn.innerHTML = '<span class="msr">check</span> Abonniert';
  btn.classList.add('hightlight');
}

async function handleDirectAdd(url, inputEl) {
  if (!url) return;
  const data = await store.load();
  if (data.feeds.some(f => f.url === url)) {
    showBanner('Bereits abonniert.', 'info');
    return;
  }
  await store.addFeed({ url, title: url, avatar_url: '', type: 'rss' });
  showBanner('Feed abonniert!', 'success');
  if (inputEl) inputEl.value = '';
  allResults = [...DEFAULT_FEEDS];
  renderFiltered();
}

// ── Hilfsfunktionen ───────────────────────────────

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Start
init();