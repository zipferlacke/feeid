/**
 * <feeid-sidebar> Custom Element
 *
 * Rendert Sidebar (Desktop) + Bottom-Navigation (Mobile) automatisch.
 *
 * Attribute:
 *   page  – aktive Seite: 'home' | 'discover' | 'profiles'
 *
 * Events:
 *   feeid-nav-feed      – Klick auf abonnierten Feed (detail: { feedId })
 *   feeid-nav-settings  – Klick auf Einstellungen
 */

import { store } from '../store.js';
import { escapeHtml } from '../utils.js';

const NAV_ITEMS = [
  { href: './index.html',    icon: 'home',    label: 'Mein Feed',  id: 'home'     },
  { href: './discover.html', icon: 'explore', label: 'Entdecken',  id: 'discover' },
  { href: './profiles.html', icon: 'group',   label: 'Profile',    id: 'profiles' },
];

export class FeeidSidebar extends HTMLElement {

  static get observedAttributes() {
    return ['page', 'active-feed'];
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  async _render() {
    const page       = this.getAttribute('page') || 'home';
    const activeFeed = this.getAttribute('active-feed') || '';
    const data       = await store.load();

    // ── Sidebar (Desktop) ──────────────────────────
    let sidebarEl = this.querySelector('#feeid-sidebar');
    if (!sidebarEl) {
      sidebarEl = document.createElement('aside');
      sidebarEl.id = 'feeid-sidebar';
      this.appendChild(sidebarEl);
    }

    const feedsHtml = data.feeds.length ? `
      <div class="sidebar-section-title">Abonniert</div>
      <div id="sidebar-feeds-list">
        ${data.feeds.map(feed => `
          <button class="sidebar-item ${activeFeed === feed.id ? 'active' : ''}"
                  data-feed-id="${feed.id}">
            <img src="${escapeHtml(feed.avatar_url || '')}"
                 onerror="this.style.display='none'" alt="">
            <span class="sidebar-item__name">${escapeHtml(feed.title || feed.url)}</span>
            ${feed.notifications?.enabled
              ? '<span class="msr" style="margin-left:auto;font-size:1rem;">notifications_active</span>'
              : ''}
          </button>`).join('')}
      </div>` : '';

    sidebarEl.innerHTML = `
      <div id="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <a href="${item.href}" class="sidebar-item ${page === item.id && !activeFeed ? 'active' : ''}">
            <span class="msr">${item.icon}</span>
            <span class="sidebar-item__name">${item.label}</span>
          </a>`).join('')}
      </div>
      ${feedsHtml}
      <div class="sidebar-bottom">
        <button class="sidebar-item" id="sidebar-settings">
          <span class="msr">settings</span>
          <span class="sidebar-item__name">Einstellungen</span>
        </button>
      </div>`;

    // ── Bottom-Navigation (Mobile) ─────────────────
    let bottomEl = this.querySelector('#bottom-nav');
    if (!bottomEl) {
      bottomEl = document.createElement('nav');
      bottomEl.id = 'bottom-nav';
      bottomEl.className = 'bottom_navigation';
      this.appendChild(bottomEl);
    }

    bottomEl.style.setProperty('--count', '4');
    bottomEl.innerHTML = NAV_ITEMS.map(item => `
      <a href="${item.href}">
        <span class="msr ${page === item.id ? 'active' : ''}">${item.icon}</span>
        ${item.label}
      </a>`).join('') + `
      <a href="#" id="bottom-settings">
        <span class="msr">settings</span>
        Einstellungen
      </a>`;

    // ── Events binden ──────────────────────────────
    this._bindEvents();
  }

  _bindEvents() {
    // Feed-Klicks
    this.querySelectorAll('[data-feed-id]').forEach(btn => {
      btn.onclick = () => this.dispatchEvent(
        new CustomEvent('feeid-nav-feed', { bubbles: true, detail: { feedId: btn.dataset.feedId } })
      );
    });

    // Einstellungen (Sidebar + Bottom)
    const onSettings = () => this.dispatchEvent(
      new CustomEvent('feeid-nav-settings', { bubbles: true })
    );
    this.querySelector('#sidebar-settings')?.addEventListener('click', onSettings);
    this.querySelector('#bottom-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      onSettings();
    });
  }

  /** Aktiven Feed von außen setzen und neu rendern */
  setActiveFeed(feedId) {
    this.setAttribute('active-feed', feedId || '');
  }

  /** Feeds neu laden (nach Abonnieren/Deabonnieren) */
  async refresh() {
    await this._render();
  }
}

customElements.define('feeid-sidebar', FeeidSidebar);