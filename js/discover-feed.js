/**
 * discover-feed.js
 * Feeid – Entdecken als Artikel-Feed
 *
 * Lädt Artikel aus kuratierten Feeds und zeigt sie als Cards.
 * Klick auf Artikel → Reader
 * Klick auf Feed-Name/Avatar → Profil-Ansicht
 */

import { store } from './store.js';
import { feedLoader } from './feeds.js';
import { renderer } from './renderer.js';
import { showBanner } from '../libs/wuefl-libs/banner/banner.js';
import './elements/index.js';

// Kuratierte Feeds – gleiche Liste wie profiles.js
const CURATED_FEEDS = [
  { id: 'tagesschau',    url: 'https://www.tagesschau.de/index~rss2.xml',                        title: 'Tagesschau',          avatar_url: 'https://www.tagesschau.de/favicon.ico',       type: 'rss' },
  { id: 'ccc',           url: 'https://www.ccc.de/de/feeds/blog.xml',                            title: 'Chaos Computer Club', avatar_url: 'https://www.ccc.de/favicon.ico',               type: 'rss' },
  { id: 'netzpolitik',   url: 'https://netzpolitik.org/feed/',                                   title: 'Netzpolitik.org',     avatar_url: 'https://netzpolitik.org/favicon.ico',         type: 'rss' },
  { id: 'heise',         url: 'https://www.heise.de/rss/heise-atom.xml',                         title: 'heise online',        avatar_url: 'https://www.heise.de/favicon.ico',            type: 'rss' },
  { id: 'kulturzeit',    url: 'https://www.3sat.de/kultur/kulturzeit/100.xml',                   title: 'Kulturzeit (3sat)',   avatar_url: '',                                            type: 'rss' },
];

let appData = null;
let allItems = [];

async function init() {
  appData = await store.load();

  // Sidebar Events
  document.querySelector('feeid-sidebar')?.addEventListener('feeid-nav-feed', e => {
    location.href = `./index.html?feed=${e.detail.feedId}`;
  });
  document.querySelector('feeid-sidebar')?.addEventListener('feeid-nav-settings', () => {
    renderer.showAllNotificationSettings(getFakeApp());
  });

  // Main befüllen
  const main = document.getElementById('feeid-main');
  main.innerHTML = `
    <div class="discover-feed-header">
      <input type="search" id="discover-feed-search"
             placeholder="Artikel suchen…"
             style="flex:1; min-width:180px; text-align:left;">
    </div>
    <div id="discover-feed-grid" class="feed-grid"></div>`;

  document.getElementById('discover-feed-search')?.addEventListener('input', e => {
    renderItems(e.target.value.trim());
  });

  // Artikel laden
  showLoading();
  allItems = await feedLoader.loadAll(CURATED_FEEDS);
  allItems.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  renderItems('');

  // URL-Parameter: ?open=URL → Reader direkt öffnen
  const params = new URLSearchParams(location.search);
  if (params.get('open')) renderer.openReader(params.get('open'), getFakeApp());
}

function showLoading() {
  const grid = document.getElementById('discover-feed-grid');
  if (grid) grid.innerHTML = `
    <div class="feeid-empty">
      <span class="msr feeid-empty__icon">refresh</span>
      <p class="feeid-empty__text">Artikel werden geladen…</p>
    </div>`;
}

function renderItems(query) {
  const grid = document.getElementById('discover-feed-grid');
  if (!grid) return;

  let items = allItems;
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.summary?.toLowerCase().includes(q) ||
      i.feed_title?.toLowerCase().includes(q)
    );
  }

  if (!items.length) {
    grid.innerHTML = `
      <div class="feeid-empty">
        <span class="msr feeid-empty__icon">search_off</span>
        <p class="feeid-empty__text">Keine Artikel gefunden.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(item => discoverCard(item)).join('');

  // Events binden
  grid.querySelectorAll('.discover-feed-card').forEach(card => {
    const url = card.dataset.url;
    const feedId = card.dataset.feedId;

    // Klick auf Card → Reader
    card.addEventListener('click', e => {
      if (e.target.closest('.discover-feed-card__feed-link')) return;
      renderer.openReader(url, getFakeApp());
    });

    // Klick auf Feed-Name/Avatar → Profil
    card.querySelector('.discover-feed-card__feed-link')?.addEventListener('click', e => {
      e.stopPropagation();
      showFeedProfile(feedId);
    });
  });
}

function discoverCard(item) {
  const imgSrc = item.image_url || item.feed_avatar || '';
  const feedId = item.feed_id || '';

  return `
    <article class="card feeid-card discover-feed-card"
             data-url="${escapeHtml(item.url)}"
             data-feed-id="${escapeHtml(feedId)}">
      ${imgSrc ? `
        <img class="feeid-card__image"
             src="${escapeHtml(imgSrc)}"
             loading="lazy" alt=""
             onerror="this.style.display='none'">` : ''}
      <div class="feeid-card__body">
        <div class="feeid-card__feed discover-feed-card__feed-link" style="cursor:pointer">
          <img src="${escapeHtml(item.feed_avatar || '')}"
               onerror="this.style.display='none'" alt="">
          ${escapeHtml(item.feed_title || '')}
          <span style="margin-left:auto">${item.published_at ? fmtDateTime(item.published_at) : ''}</span>
        </div>
        <h2 class="feeid-card__title">${escapeHtml(item.title)}</h2>
        <p class="feeid-card__summary">${escapeHtml(item.summary)}</p>
      </div>
    </article>`;
}

async function showFeedProfile(feedId) {
  const main = document.getElementById('feeid-main');
  const feed = CURATED_FEEDS.find(f => f.id === feedId);
  if (!feed) return;

  // Prüfen ob bereits abonniert
  const data = await store.load();
  const isSubscribed = data.feeds.some(f => f.url === feed.url);
  const items = allItems.filter(i => i.feed_id === feedId);

  main.innerHTML = `
    <div class="feed-profile__header">
      <img class="feed-profile__avatar"
           src="${escapeHtml(feed.avatar_url || '')}"
           onerror="this.style.display='none'" alt="">
      <div class="feed-profile__meta">
        <div class="feed-profile__title-row">
          <h1 class="feed-profile__name">${escapeHtml(feed.title)}</h1>
          <div class="feed-profile__actions">
            ${isSubscribed ? `
              <button class="button" data-shape="no-background" id="profile-settings-btn" title="Einstellungen">
                <span class="msr">settings</span>
              </button>` : `
              <button class="button" id="profile-subscribe-btn">
                <span class="msr">add</span>
                Abonnieren
              </button>`}
            <button class="button" data-shape="no-background" id="profile-back-btn" title="Zurück">
              <span class="msr">arrow_back</span>
            </button>
          </div>
        </div>
        <div class="feed-profile__stats">
          <span>${items.length} Beiträge</span>
          <span class="badge">${feed.type === 'activitypub' ? 'ActivityPub' : 'RSS'}</span>
        </div>
      </div>
    </div>
    <div class="feed-grid" id="profile-grid"></div>`;

  const grid = main.querySelector('#profile-grid');
  grid.innerHTML = items.map(item => discoverCard(item)).join('');
  grid.querySelectorAll('.discover-feed-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.discover-feed-card__feed-link')) return;
      renderer.openReader(card.dataset.url, getFakeApp());
    });
  });

  main.querySelector('#profile-back-btn')?.addEventListener('click', () => renderItems(''));

  main.querySelector('#profile-subscribe-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="msr">hourglass_empty</span>';
    await store.addFeed({ url: feed.url, title: feed.title, avatar_url: feed.avatar_url, type: feed.type });
    showBanner('Feed abonniert!', 'success');
    btn.innerHTML = '<span class="msr">check</span> Abonniert';
    btn.classList.add('hightlight');
  });

  main.querySelector('#profile-settings-btn')?.addEventListener('click', () => {
    const fullFeed = data.feeds.find(f => f.url === feed.url);
    if (fullFeed) renderer.showNotificationSettings(fullFeed, getFakeApp());
  });
}

// Minimales App-Objekt für renderer-Kompatibilität
function getFakeApp() {
  return {
    data: appData,
    toggleLike: async (url) => {
      const liked = await store.toggleLike(url);
      appData = await store.load();
      return liked;
    },
    toggleSave: async (url) => {
      const saved = await store.toggleSave(url);
      appData = await store.load();
      return saved;
    },
    updateFeedNotifications: async (feedId, enabled, cats) => {
      const { notifications } = await import('./notifications.js');
      await notifications.updateFeedNotifications(feedId, enabled, cats);
      appData = await store.load();
    },
    removeFeed: async (feedId) => {
      await store.removeFeed(feedId);
      appData = await store.load();
    }
  };
}

function fmtDateTime(str) {
  if (!str) return '';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(str));
  } catch { return str; }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();