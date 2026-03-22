/**
 * profiles.js
 * Feeid – Profile entdecken & verwalten
 *
 * Layout:
 * 1. Einheitliche Suchleiste oben (Freitext + URL-Direkteingabe)
 * 2. Abonnierte Profile als Grid (immer zuerst)
 * 3. Suchergebnisse aus RSS-Indizes + ActivityPub (Mastodon)
 *
 * Indizes:
 * - RSS: rss-verzeichnis.de via allorigins CORS-Proxy
 * - ActivityPub: mastodon.social /api/v2/search (kein Auth nötig)
 *
 * Icons: search, close, add, check, rss_feed, hub, person_remove,
 *        settings, notifications, notifications_active, arrow_back,
 *        group, explore, hourglass_empty, lock, login
 */

import { store }      from './store.js';
import { showBanner } from '../libs/wuefl-libs/banner/banner.js';
import { userDialog } from '../libs/wuefl-libs/userDialog/userDialog.js';
import { escapeHtml } from './utils.js';
import './elements/index.js';

// ── Konstanten ────────────────────────────────────

const CORS_PROXY   = 'https://api.allorigins.win/raw?url=';
const MASTODON_API = 'https://mastodon.social/api/v2/search';

// Erkenne ob Eingabe eine URL oder @user@server ist
const RE_URL    = /^https?:\/\/.+/i;
const RE_HANDLE = /^@?[\w.-]+@[\w.-]+\.\w+$/;

// ── State ─────────────────────────────────────────

let appData       = null;
let searchTimeout = null;
let currentView   = 'list'; // 'list' | 'detail'

// ── Init ──────────────────────────────────────────

async function init() {
  appData = await store.load();

  document.querySelector('feeid-sidebar')?.addEventListener('feeid-nav-feed', e => {
    location.href = `./index.html?feed=${e.detail.feedId}`;
  });

  renderPage();
}

// ── Seite aufbauen ────────────────────────────────

function renderPage() {
  const main = document.getElementById('feeid-main');
  if (!main) return;

  main.innerHTML = `
    <!-- Suchleiste -->
    <div class="profiles-search">
      <div class="profiles-search__bar">
        <span class="msr profiles-search__icon">search</span>
        <input
          type="text"
          id="profiles-search-input"
          class="profiles-search__input"
          placeholder="Suchen, URL oder @user@server.social eingeben…"
          autocomplete="off"
          spellcheck="false"
        >
        <button
          class="button"
          data-shape="no-background"
          id="profiles-search-clear"
          title="Leeren"
          style="display:none"
        >
          <span class="msr">close</span>
        </button>
      </div>
    </div>

    <!-- Inhalt -->
    <div id="profiles-content"></div>`;

  // Events
  const input    = document.getElementById('profiles-search-input');
  const clearBtn = document.getElementById('profiles-search-clear');

  input.addEventListener('input', e => {
    const val = e.target.value.trim();
    clearBtn.style.display = val ? '' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleInput(val), 350);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      handleInput(input.value.trim(), true);
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    renderSubscribed();
  });

  // Standard: abonnierte Profile
  renderSubscribed();
}

// ── Abonnierte Profile ────────────────────────────

function renderSubscribed() {
  currentView = 'list';
  const content = document.getElementById('profiles-content');
  if (!content) return;

  if (!appData.feeds.length) {
    content.innerHTML = `
      <div class="feeid-empty">
        <span class="msr feeid-empty__icon">group</span>
        <h1 class="feeid-empty__title">Noch keine Profile</h1>
        <p class="feeid-empty__text">Suche nach Feeds oder gib eine URL ein.</p>
      </div>`;
    return;
  }

  content.innerHTML = `
    <p class="profiles-section-title">Abonniert</p>
    <div class="profiles-grid">
      ${appData.feeds.map(profileCard).join('')}
    </div>`;

  bindProfileCards(content);
}

function profileCard(feed) {
  const typeIcon     = feed.type === 'activitypub' ? 'hub' : 'rss_feed';
  const notifEnabled = feed.notifications?.enabled ?? false;

  return `
    <div class="card profile-card" data-feed-id="${escapeHtml(feed.id)}">
      <div class="profile-card__link">
        <div class="profile-card__avatar">
          ${feed.avatar_url
            ? `<img src="${escapeHtml(feed.avatar_url)}" onerror="this.style.display='none'" alt="">`
            : `<span class="msr">${typeIcon}</span>`}
        </div>
        <div class="profile-card__info">
          <h3 class="profile-card__name">${escapeHtml(feed.title || feed.url)}</h3>
          ${feed.description
            ? `<p class="profile-card__desc">${escapeHtml(feed.description)}</p>`
            : ''}
          <span class="tag">${feed.type === 'activitypub' ? 'ActivityPub' : 'RSS'}</span>
        </div>
      </div>
      <div class="profile-card__actions">
        <button class="button profile-card__settings" data-shape="no-background"
                title="${notifEnabled ? 'Benachrichtigungen aktiv' : 'Einstellungen'}">
          <span class="msr">${notifEnabled ? 'notifications_active' : 'settings'}</span>
        </button>
        <button class="button profile-card__unsubscribe" data-shape="no-background"
                title="Deabonnieren">
          <span class="msr">person_remove</span>
        </button>
      </div>
    </div>`;
}

function bindProfileCards(container) {
  container.querySelectorAll('.profile-card').forEach(card => {
    const feedId = card.dataset.feedId;
    const feed   = appData.feeds.find(f => f.id === feedId);
    if (!feed) return;

    card.querySelector('.profile-card__link')
      ?.addEventListener('click', () => renderProfileDetail(feed));

    card.querySelector('.profile-card__settings')
      ?.addEventListener('click', e => {
        e.stopPropagation();
        showFeedSettings(feed);
      });

    card.querySelector('.profile-card__unsubscribe')
      ?.addEventListener('click', e => {
        e.stopPropagation();
        unsubscribe(feed);
      });
  });
}

// ── Profil-Detailansicht ──────────────────────────

function renderProfileDetail(feed) {
  currentView = 'detail';
  const content = document.getElementById('profiles-content');
  if (!content) return;

  const notifEnabled = feed.notifications?.enabled ?? false;
  const typeIcon     = feed.type === 'activitypub' ? 'hub' : 'rss_feed';

  content.innerHTML = `
    <div class="feed-profile__header">
      <div class="profile-card__avatar" style="width:72px;height:72px;border-radius:50%;background:var(--bg-input);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
        ${feed.avatar_url
          ? `<img src="${escapeHtml(feed.avatar_url)}" onerror="this.style.display='none'" alt=""
                  style="width:100%;height:100%;object-fit:cover;">`
          : `<span class="msr" style="font-size:2rem">${typeIcon}</span>`}
      </div>
      <div class="feed-profile__meta">
        <div class="feed-profile__title-row">
          <h1 class="feed-profile__name">${escapeHtml(feed.title || feed.url)}</h1>
          <div class="feed-profile__actions">
            <button class="button" data-shape="no-background" id="detail-notif" title="Benachrichtigungen">
              <span class="msr">${notifEnabled ? 'notifications_active' : 'notifications'}</span>
            </button>
            <button class="button" data-shape="no-background" id="detail-unsub" title="Deabonnieren">
              <span class="msr">person_remove</span>
            </button>
            <button class="button" data-shape="no-background" id="detail-back" title="Zurück">
              <span class="msr">arrow_back</span>
            </button>
          </div>
        </div>
        ${feed.description
          ? `<p class="feed-profile__desc">${escapeHtml(feed.description)}</p>`
          : ''}
        <div class="feed-profile__stats">
          <span class="badge">${feed.type === 'activitypub' ? 'ActivityPub' : 'RSS'}</span>
          <a href="${escapeHtml(feed.url)}" target="_blank" rel="noopener"
             style="font-size:var(--fs-100);color:var(--clr-neutral-500);word-break:break-all">
            ${escapeHtml(feed.url)}
          </a>
        </div>
      </div>
    </div>
    <div class="feeid-empty" style="padding:2rem">
      <span class="msr feeid-empty__icon">article</span>
      <p class="feeid-empty__text">Artikel dieses Feeds im Hauptfeed lesen.</p>
      <a href="./index.html?feed=${escapeHtml(feed.id)}" class="button">
        <span class="msr">home</span>
        Im Feed öffnen
      </a>
    </div>`;

  content.querySelector('#detail-back')
    ?.addEventListener('click', () => renderSubscribed());
  content.querySelector('#detail-notif')
    ?.addEventListener('click', () => showFeedSettings(feed));
  content.querySelector('#detail-unsub')
    ?.addEventListener('click', () => unsubscribe(feed));
}

// ── Eingabe auswerten ─────────────────────────────

async function handleInput(val, immediate = false) {
  if (!val) {
    renderSubscribed();
    return;
  }

  // Direkte URL oder Handle → sofort abonnieren / als Ergebnis zeigen
  if (RE_URL.test(val) || RE_HANDLE.test(val)) {
    renderDirectUrl(val);
    return;
  }

  // Freitext → Suche
  if (val.length >= 2) {
    renderSearchResults(val);
  }
}

// ── Direkte URL / Handle ──────────────────────────

function renderDirectUrl(val) {
  const content = document.getElementById('profiles-content');
  const url     = normalizeHandle(val);
  const already = appData.feeds.some(f => f.url === url);

  content.innerHTML = `
    <p class="profiles-section-title">URL / Adresse</p>
    <div class="profiles-grid">
      ${resultCard({
        title: val,
        url,
        description: already ? 'Bereits abonniert' : 'Feed direkt hinzufügen',
        type: RE_HANDLE.test(val) ? 'activitypub' : 'rss',
        avatar: '',
        subscribed: already
      })}
    </div>`;

  bindResultCards(content);
}

/** @user@server.social → ActivityPub Outbox-URL */
function normalizeHandle(val) {
  if (RE_URL.test(val)) return val;
  const clean = val.replace(/^@/, '');
  const [user, server] = clean.split('@');
  if (server) return `https://${server}/users/${user}/outbox`;
  return val;
}

// ── Suche ─────────────────────────────────────────

async function renderSearchResults(query) {
  const content = document.getElementById('profiles-content');

  // Abonnierte die passen immer zuerst
  const subscribed = appData.feeds.filter(f =>
    (f.title || '').toLowerCase().includes(query.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(query.toLowerCase()) ||
    f.url.toLowerCase().includes(query.toLowerCase())
  );

  content.innerHTML = `
    ${subscribed.length ? `
      <p class="profiles-section-title">Abonniert</p>
      <div class="profiles-grid">
        ${subscribed.map(profileCard).join('')}
      </div>` : ''}
    <p class="profiles-section-title">
      Suchergebnisse
      <span class="profiles-search-spinner" style="display:inline-block;margin-left:0.5rem">
        <span class="msr" style="font-size:1rem;vertical-align:middle;animation:feeid-spin 1s linear infinite">refresh</span>
      </span>
    </p>
    <div id="profiles-results" class="profiles-grid"></div>`;

  bindProfileCards(content);

  // Parallel suchen
  const [rssResults, apResults] = await Promise.allSettled([
    searchRss(query),
    searchActivityPub(query)
  ]);

  const results = [
    ...(rssResults.status === 'fulfilled' ? rssResults.value : []),
    ...(apResults.status  === 'fulfilled' ? apResults.value  : [])
  ];

  // Spinner weg
  content.querySelector('.profiles-search-spinner')?.remove();

  const resultsEl = document.getElementById('profiles-results');
  if (!resultsEl) return;

  if (!results.length) {
    resultsEl.innerHTML = `
      <div class="feeid-empty" style="padding:1.5rem;grid-column:1/-1">
        <span class="msr feeid-empty__icon">search_off</span>
        <p class="feeid-empty__text">Keine Ergebnisse gefunden.</p>
      </div>`;
    return;
  }

  resultsEl.innerHTML = results.map(r => resultCard(r)).join('');
  bindResultCards(content);
}

// ── RSS-Index Suche (rss-verzeichnis.de) ──────────

async function searchRss(query) {
  try {
    const url = `https://www.rss-verzeichnis.de/suche.php?s=${encodeURIComponent(query)}`;
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const html = await res.text();
    return parseRssVerzeichnis(html);
  } catch {
    return [];
  }
}

function parseRssVerzeichnis(html) {
  const doc     = new DOMParser().parseFromString(html, 'text/html');
  const results = [];

  // rss-verzeichnis.de: jeder Eintrag ist ein <div class="rss-item"> o.ä.
  // Robuste Suche: alle Links die auf .xml / feed / rss zeigen
  const feedLinks = doc.querySelectorAll(
    'a[href*=".xml"], a[href*="/feed"], a[href*="/rss"], a[href*="feed="], a[href*="rss="]'
  );

  feedLinks.forEach(a => {
    const href = a.href;
    if (!href.startsWith('http')) return;
    if (results.find(r => r.url === href)) return; // Duplikat

    // Titel aus nächstem <h2/h3/strong> oder eigenem Text
    const container = a.closest('li, div, article') || a.parentElement;
    const title = container?.querySelector('h2, h3, strong, b')?.textContent?.trim()
                || a.textContent.trim()
                || href;
    const desc  = container?.querySelector('p, .description, small')?.textContent?.trim() || '';

    if (title && href) {
      results.push({ title, url: href, description: desc, type: 'rss', avatar: '', source: 'rss-verzeichnis.de' });
    }
  });

  return results.slice(0, 12);
}

// ── ActivityPub Suche (Mastodon API) ──────────────

async function searchActivityPub(query) {
  try {
    const res = await fetch(
      `${MASTODON_API}?q=${encodeURIComponent(query)}&type=accounts&limit=8&resolve=false`
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.accounts || []).map(acc => ({
      title:       acc.display_name || acc.username,
      url:         `${acc.url}/outbox`,          // ActivityPub Outbox
      description: stripHtml(acc.note || ''),
      type:        'activitypub',
      avatar:      acc.avatar_static || acc.avatar || '',
      followers:   acc.followers_count,
      handle:      `@${acc.acct}`,
      source:      'mastodon.social'
    }));
  } catch {
    return [];
  }
}

function stripHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() || '';
}

// ── Ergebnis-Card ─────────────────────────────────

function resultCard({ title, url, description, type, avatar, followers, handle, source, subscribed }) {
  const isSubscribed = subscribed ?? appData.feeds.some(f => f.url === url);
  const typeIcon     = type === 'activitypub' ? 'hub' : 'rss_feed';

  return `
    <div class="card profile-card result-card" data-url="${escapeHtml(url)}" data-title="${escapeHtml(title)}" data-type="${escapeHtml(type)}" data-avatar="${escapeHtml(avatar)}">
      <div class="profile-card__link">
        <div class="profile-card__avatar">
          ${avatar
            ? `<img src="${escapeHtml(avatar)}" onerror="this.style.display='none'" alt=""><span class="msr" style="display:none">${typeIcon}</span>`
            : `<span class="msr">${typeIcon}</span>`}
        </div>
        <div class="profile-card__info">
          <h3 class="profile-card__name">${escapeHtml(title)}</h3>
          ${handle   ? `<p class="profile-card__desc" style="color:var(--clr-primary-600)">${escapeHtml(handle)}</p>` : ''}
          ${description ? `<p class="profile-card__desc">${escapeHtml(description.slice(0, 100))}</p>` : ''}
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.25rem;">
            <span class="tag">${type === 'activitypub' ? 'ActivityPub' : 'RSS'}</span>
            ${source    ? `<span class="tag">${escapeHtml(source)}</span>` : ''}
            ${followers != null ? `<span class="tag"><span class="msr" style="font-size:0.8rem">group</span> ${fmtNum(followers)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="profile-card__actions">
        ${isSubscribed
          ? `<button class="button result-card__subscribed" data-shape="no-background" disabled title="Bereits abonniert">
               <span class="msr">check</span>
             </button>`
          : `<button class="button result-card__subscribe" data-shape="no-background" title="Abonnieren">
               <span class="msr">add</span>
             </button>`}
      </div>
    </div>`;
}

function bindResultCards(container) {
  container.querySelectorAll('.result-card').forEach(card => {
    const url    = card.dataset.url;
    const title  = card.dataset.title;
    const type   = card.dataset.type;
    const avatar = card.dataset.avatar;

    card.querySelector('.result-card__subscribe')
      ?.addEventListener('click', async e => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.innerHTML = '<span class="msr">hourglass_empty</span>';

        await store.addFeed({ url, title, avatar_url: avatar, type });
        appData = await store.load();

        btn.innerHTML = '<span class="msr">check</span>';
        showBanner(`„${title}" abonniert!`, 'success');
      });
  });
}

// ── Feed-Einstellungen ────────────────────────────

async function showFeedSettings(feed) {
  const notifEnabled = feed.notifications?.enabled ?? false;
  const categories   = feed.notifications?.categories ?? [];

  const catsHtml = categories.length ? `
    <p style="font-size:var(--fs-100);color:var(--clr-neutral-500);margin:1rem 0 0.5rem">
      Nur bei diesen Kategorien:
    </p>
    ${categories.map(cat => `
      <label style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0;">
        <span>${escapeHtml(cat.name)}</span>
        <input type="checkbox" name="cat_${escapeHtml(cat.name)}"
               data-shape="toggle" ${cat.enabled ? 'checked' : ''}>
      </label>`).join('')}` : '';

  const result = await userDialog({
    title:       `Einstellungen – ${feed.title || feed.url}`,
    content:     `
      <label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
        <span>Benachrichtigungen</span>
        <input type="checkbox" name="enabled" data-shape="toggle" ${notifEnabled ? 'checked' : ''}>
      </label>
      ${catsHtml}`,
    confirmText: 'Speichern',
    cancelText:  'Abbrechen'
  });

  if (!result.submit) return;

  const enabled     = result.data?.enabled === true;
  const updatedCats = categories.map(cat => ({
    name:    cat.name,
    enabled: result.data?.[`cat_${cat.name}`] === true
  }));

  const data = await store.load();
  const f    = data.feeds.find(f => f.id === feed.id);
  if (f) {
    f.notifications = { enabled, categories: updatedCats };
    await store.save(data);
  }
  appData = await store.load();
  showBanner('Einstellungen gespeichert.', 'success');

  // Wenn Detailansicht offen → Icon aktualisieren
  const icon = document.querySelector('#detail-notif .msr');
  if (icon) icon.textContent = enabled ? 'notifications_active' : 'notifications';

  // Liste neu rendern falls in Listenansicht
  if (currentView === 'list') renderSubscribed();
}

// ── Deabonnieren ──────────────────────────────────

async function unsubscribe(feed) {
  const result = await userDialog({
    title:       'Deabonnieren',
    content:     `<p>Möchtest du <strong>${escapeHtml(feed.title || feed.url)}</strong> wirklich deabonnieren?</p>`,
    confirmText: 'Deabonnieren',
    cancelText:  'Abbrechen',
    type:        'warning'
  });
  if (!result.submit) return;

  await store.removeFeed(feed.id);
  appData = await store.load();
  showBanner('Feed deabonniert.', 'success');
  renderSubscribed();
}

// ── Hilfsfunktionen ───────────────────────────────

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// CSS: Spinner Animation
const style = document.createElement('style');
style.textContent = `
  @keyframes feeid-spin { to { transform: rotate(360deg); } }

  .profiles-section-title {
    font-size: var(--fs-100);
    font-weight: 600;
    color: var(--clr-neutral-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 1rem 0 0.5rem;
  }

  .profiles-search {
    margin-bottom: 1rem;
  }

  .profiles-search__bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-input);
    border-radius: var(--br-default);
    padding: 0 0.75rem;
  }

  .profiles-search__icon {
    color: var(--clr-neutral-500);
    flex-shrink: 0;
  }

  .profiles-search__input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 0.6rem 0;
    font-size: var(--fs-300);
    color: var(--text-color);
    text-align: left;
    min-width: 0;
    height: var(--input-height);
  }
`;
document.head.appendChild(style);

init();