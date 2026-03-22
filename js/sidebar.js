/**
 * sidebar.js
 * Feeid – Gemeinsame Sidebar & Mobile Bottom-Navigation
 * Wird von index.js, discover.js, profiles.js genutzt
 */

import { store } from './store.js';

const NAV_ITEMS = [
  { href: './index.html',    icon: 'home',    label: 'Mein Feed',  id: 'home'     },
  { href: './discover.html', icon: 'explore', label: 'Entdecken',  id: 'discover' },
  { href: './profiles.html', icon: 'group',   label: 'Profile',    id: 'profiles' },
];

/**
 * Aktive Seite ermitteln
 */
function getActivePage() {
  const path = location.pathname;
  if (path.includes('discover')) return 'discover';
  if (path.includes('profiles')) return 'profiles';
  return 'home';
}

/**
 * Sidebar rendern (Desktop)
 * @param {Object} options
 * @param {Function} [options.onFeedClick] - Callback wenn auf abonnierten Feed geklickt wird
 * @param {Function} [options.onSettingsClick] - Callback für Einstellungen
 * @param {string} [options.activeFeedId] - Aktiver Feed
 */
export async function renderSidebar({ onFeedClick, onSettingsClick, activeFeedId } = {}) {
  const navEl = document.getElementById('sidebar-nav');
  const listEl = document.getElementById('sidebar-feeds-list');
  const settingsBtn = document.getElementById('sidebar-settings');
  const activePage = getActivePage();

  // Nav-Punkte
  if (navEl) {
    navEl.innerHTML = NAV_ITEMS.map(item => `
      <a href="${item.href}" class="sidebar-item ${activePage === item.id && !activeFeedId ? 'active' : ''}">
        <span class="msr">${item.icon}</span>
        <span class="sidebar-item__name">${item.label}</span>
      </a>`).join('');
  }

  // Abonnierte Feeds (nur auf Home-Seite klickbar)
  if (listEl) {
    const data = await store.load();
    if (data.feeds.length) {
      const titleEl = document.getElementById('sidebar-feeds-title');
      if (titleEl) titleEl.style.display = '';

      listEl.innerHTML = data.feeds.map(feed => `
        <button class="sidebar-item ${activeFeedId === feed.id ? 'active' : ''}"
                data-feed-id="${feed.id}">
          <img src="${escapeHtml(feed.avatar_url || '')}"
               onerror="this.style.display='none'" alt="">
          <span class="sidebar-item__name">${escapeHtml(feed.title || feed.url)}</span>
          ${feed.notifications?.enabled
            ? '<span class="msr" style="margin-left:auto;font-size:1rem;">notifications_active</span>'
            : ''}
        </button>`).join('');

      if (onFeedClick) {
        listEl.querySelectorAll('.sidebar-item[data-feed-id]').forEach(el => {
          el.onclick = () => onFeedClick(el.dataset.feedId);
        });
      }
    } else {
      listEl.innerHTML = '';
    }
  }

  // Einstellungen
  if (settingsBtn && onSettingsClick) {
    settingsBtn.onclick = onSettingsClick;
  }
}

/**
 * Mobile Bottom-Navigation rendern
 */
export function renderBottomNav() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const activePage = getActivePage();

  nav.innerHTML = NAV_ITEMS.map(item => `
    <a href="${item.href}">
      <span class="msr ${activePage === item.id ? 'active' : ''}">${item.icon}</span>
      ${item.label}
    </a>`).join('') + `
    <a href="#" id="bottom-settings">
      <span class="msr">settings</span>
      Einstellungen
    </a>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}