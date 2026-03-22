/**
 * renderer.js
 * Feeid UI Renderer
 *
 * Nutzt wuefl-libs:
 * - showBanner (banner/banner.js) für Meldungen
 * - userDialog (userDialog/userDialog.js) für Dialoge/Bestätigungen
 * - CSS-Klassen: .card, .button, .dialog, .details, .msr, input[data-shape="toggle"]
 *
 * Verwendete Material Symbols Icons (alle via .msr):
 * home, explore, add_circle, settings, add, close, notifications,
 * notifications_active, notifications_off, hub, rss_feed, favorite,
 * bookmark, chat_bubble, event, inbox, open_in_new, search_off, refresh
 */

import { config } from './config.js';
import { showBanner } from "../libs/wuefl-libs/banner/banner.js";
import { userDialog } from "../libs/wuefl-libs/userDialog/userDialog.js";
import { escapeHtml, fmtDateTime } from './utils.js';
import './elements/index.js';

export const renderer = {

  // ── App Shell ──────────────────────────────────

  renderShell(root, app) {
    root.innerHTML = `
      <feeid-header></feeid-header>
      <feeid-sidebar page="home"></feeid-sidebar>
      <main id="feeid-main"></main>
      <feeid-reader></feeid-reader>`;

    // Sidebar Events
    root.querySelector('feeid-sidebar').addEventListener('feeid-nav-feed', e => {
      app.setActiveFeed(e.detail.feedId);
    });
    root.querySelector('feeid-sidebar').addEventListener('feeid-nav-settings', () => {
      this.showAllNotificationSettings(app);
    });
  },

  // ── Feed ───────────────────────────────────────

  renderFeed(main, items, app) {
    if (!items.length) {
      main.innerHTML = `
        <div class="feeid-empty">
          <span class="msr feeid-empty__icon">inbox</span>
          <p class="feeid-empty__text">Keine Einträge gefunden.</p>
          <a href="discover.html" class="button">
            <span class="msr">explore</span>
            Feeds entdecken
          </a>
        </div>`;
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'feed-grid';
    items.forEach(i => grid.appendChild(this._card(i, app)));
    main.innerHTML = '';
    main.appendChild(grid);
    this._bindCards(grid, app);
  },

  // ── Profil-Ansicht ─────────────────────────────

  renderFeedProfile(main, feed, items, app) {
    const notifEnabled = feed.notifications?.enabled ?? false;
    main.innerHTML = `
      <div class="feed-profile__header">
        <img class="feed-profile__avatar"
             src="${escapeHtml(feed.avatar_url || '')}"
             onerror="this.style.display='none'" alt="">
        <div class="feed-profile__meta">
          <div class="feed-profile__title-row">
            <h1 class="feed-profile__name">${escapeHtml(feed.title || feed.url)}</h1>
            <div class="feed-profile__actions">
              <button class="button" data-shape="no-background" id="feed-notif-btn" title="Benachrichtigungen">
                <span class="msr">${notifEnabled ? 'notifications_active' : 'notifications'}</span>
              </button>
              <button class="button" data-shape="no-background" id="feed-unsubscribe-btn" title="Deabonnieren">
                <span class="msr">person_remove</span>
              </button>
            </div>
          </div>
          ${feed.description ? `<p class="feed-profile__desc">${escapeHtml(feed.description)}</p>` : ''}
          <div class="feed-profile__stats">
            <span>${items.length} Beiträge</span>
            ${feed.follower_count ? `<span>· ${feed.follower_count} Follower</span>` : ''}
            <span class="badge">${feed.type === 'activitypub' ? 'ActivityPub' : 'RSS'}</span>
          </div>
        </div>
      </div>
      <div class="feed-grid" id="profile-grid"></div>`;

    const grid = main.querySelector('#profile-grid');
    items.forEach(i => grid.appendChild(this._card(i, app)));
    this._bindCards(grid, app);

    main.querySelector('#feed-notif-btn').onclick = () =>
      this.showNotificationSettings(feed, app);

    main.querySelector('#feed-unsubscribe-btn').onclick = async () => {
      const result = await userDialog({
        title: 'Feed deabonnieren',
        content: `<p>Möchtest du <strong>${escapeHtml(feed.title || feed.url)}</strong> wirklich deabonnieren?</p>`,
        confirmText: 'Deabonnieren',
        cancelText: 'Abbrechen',
        type: 'warning'
      });
      if (!result.submit) return;
      await app.removeFeed(feed.id);
      showBanner('Feed deabonniert.', 'success');
    };
  },

  // ── Onboarding ─────────────────────────────────

  renderOnboarding(main, app) {
    main.innerHTML = `
      <div class="feeid-empty">
        <span class="msr feeid-empty__icon">explore</span>
        <h1 class="feeid-empty__title">Willkommen bei feeid</h1>
        <p class="feeid-empty__text">
          Lokale Veranstaltungen, Vereine und Nachrichten – in einem modernen Feed.
        </p>
        <a href="discover.html" class="button">
          <span class="msr">explore</span>
          Feeds entdecken
        </a>
      </div>`;
  },

  // ── Feed hinzufügen Dialog ─────────────────────

  async showAddFeedDialog(app) {
    const result = await userDialog({
      title: 'Feed hinzufügen',
      content: `
        <label class="small">
          <span>RSS-Feed-URL oder ActivityPub-Adresse (@user@server.social)</span>
          <input type="url" name="url" placeholder="https://example.com/feed.xml"
                 style="text-align:left; width:100%">
        </label>`,
      confirmText: 'Hinzufügen',
      cancelText: 'Abbrechen'
    });

    if (!result.submit) return;
    const url = (result.data?.url ?? '').trim();
    if (!url) return;

    showBanner('Feed wird geladen…', 'info', 2000);
    try {
      await app.addFeed(url);
      showBanner('Feed erfolgreich hinzugefügt!', 'success');
    } catch {
      showBanner('Feed konnte nicht geladen werden.', 'error');
    }
  },

  // ── Notification Settings (pro Feed) ──────────

  async showNotificationSettings(feed, app) {
    const notifEnabled = feed.notifications?.enabled ?? false;
    const categories = feed.notifications?.categories ?? [];

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
      title: `Benachrichtigungen – ${feed.title || feed.url}`,
      content: `
        <label style="display:flex;align-items:center;justify-content:space-between;">
          <span>Benachrichtigungen aktivieren</span>
          <input type="checkbox" name="enabled" data-shape="toggle" ${notifEnabled ? 'checked' : ''}>
        </label>
        ${catsHtml}`,
      confirmText: 'Speichern',
      cancelText: 'Abbrechen'
    });

    if (!result.submit) return;

    // userDialog gibt Object zurück, nicht FormData
    const enabled = result.data?.enabled === true;
    const updatedCats = categories.map(cat => ({
      name: cat.name,
      enabled: result.data?.[`cat_${cat.name}`] === true
    }));

    await app.updateFeedNotifications(feed.id, enabled, updatedCats);
    showBanner('Einstellungen gespeichert.', 'success');

    // Icon aktualisieren
    const btn = document.querySelector('#feed-notif-btn .msr');
    if (btn) btn.textContent = enabled ? 'notifications_active' : 'notifications';
  },

  // ── Notification Settings (alle Feeds) ─────────

  async showAllNotificationSettings(app) {
    // Nutzt natives details/summary aus wuefl-libs .details Klasse
    const feedsHtml = app.data.feeds.map(feed => {
      const enabled = feed.notifications?.enabled ?? false;
      const cats = feed.notifications?.categories ?? [];
      return `
        <details class="details" style="border:1px solid var(--clr-neutral-200);margin-bottom:0.5rem;">
          <summary style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;list-style:none;padding:0.5rem;">
            <img src="${escapeHtml(feed.avatar_url || '')}" onerror="this.style.display='none'"
                 style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
            <span style="flex:1">${escapeHtml(feed.title || feed.url)}</span>
            <input type="checkbox" name="feed_${feed.id}" data-shape="toggle"
                   ${enabled ? 'checked' : ''} onclick="event.stopPropagation()">
          </summary>
          <div style="padding:0.5rem 0.75rem 0.75rem;border-top:1px solid var(--clr-neutral-200);">
            ${cats.length ? cats.map(cat => `
              <label style="display:flex;align-items:center;justify-content:space-between;padding:0.2rem 0;">
                <span style="font-size:var(--fs-200)">${escapeHtml(cat.name)}</span>
                <input type="checkbox" name="cat_${feed.id}_${escapeHtml(cat.name)}"
                       data-shape="toggle" ${cat.enabled ? 'checked' : ''}>
              </label>`).join('') :
              `<p style="font-size:var(--fs-100);color:var(--clr-neutral-500);margin:0">Keine Kategorien</p>`}
          </div>
        </details>`;
    }).join('');

    const result = await userDialog({
      title: 'Alle Benachrichtigungen',
      content: `
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="search" id="notif-search" placeholder="Feed suchen…"
                 style="flex:1;text-align:left;padding-left:2.25rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;white-space:nowrap;">
            <input type="checkbox" id="notif-only-active" data-shape="toggle">
            <span style="font-size:var(--fs-200)">Nur aktive</span>
          </label>
        </div>
        <div id="notif-feeds-list">${feedsHtml}</div>`,
      confirmText: 'Speichern',
      cancelText: 'Abbrechen',
      onInsert: (dialog_id) => {
        const dialog = document.getElementById(dialog_id);
        dialog.querySelector(`#notif-search`)?.addEventListener('input', e => {
          const q = e.target.value.toLowerCase();
          dialog.querySelectorAll('details').forEach(el => {
            el.style.display = el.querySelector('summary span')?.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
        dialog.querySelector('#notif-only-active')?.addEventListener('change', e => {
          dialog.querySelectorAll('details').forEach(el => {
            const active = el.querySelector('input[type="checkbox"]')?.checked;
            el.style.display = (!e.target.checked || active) ? '' : 'none';
          });
        });
      }
    });

    if (!result.submit) return;

    // userDialog gibt Object zurück, nicht FormData
    for (const feed of app.data.feeds) {
      const enabled = result.data?.[`feed_${feed.id}`] === true;
      const cats = (feed.notifications?.categories ?? []).map(cat => ({
        name: cat.name,
        enabled: result.data?.[`cat_${feed.id}_${cat.name}`] === true
      }));
      await app.updateFeedNotifications(feed.id, enabled, cats);
    }
    showBanner('Einstellungen gespeichert.', 'success');
  },

  // ── Reader Modus ───────────────────────────────

  openReader(url, app, { feedTitle = '', feedAvatar = '', feedId = '' } = {}) {
    let reader = document.querySelector('feeid-reader');
    if (!reader) {
      reader = document.createElement('feeid-reader');
      document.body.appendChild(reader);
    }
    reader.addEventListener('feeid-reader-feed', e => {
      app.setActiveFeed(e.detail.feedId);
    }, { once: true });
    reader.open(url, { feedTitle, feedAvatar, feedId });
  },

  // ── Card ───────────────────────────────────────

  _card(item, app) {
    const el = document.createElement('feeid-card');
    el.setAttribute('url',          item.url || '');
    el.setAttribute('title',        item.title || '');
    el.setAttribute('summary',      item.summary || '');
    el.setAttribute('image',        item.image_url || '');
    el.setAttribute('feed-title',   item.feed_title || '');
    el.setAttribute('feed-avatar',  item.feed_avatar || '');
    el.setAttribute('feed-id',      item.feed_id || '');
    el.setAttribute('published',    item.published_at || '');
    el.setAttribute('type',         item.type || 'rss');
    if (item.event?.start_at) {
      el.setAttribute('event-date',     item.event.start_at);
      el.setAttribute('event-location', item.event.location_name || '');
    }
    if (app.data.likes[item.url])  el.setAttribute('liked', '');
    if (app.data.saves[item.url])  el.setAttribute('saved', '');
    return el;
  },

  _bindCards(container, app) {
    container.querySelectorAll('feeid-card').forEach(card => {
      card.addEventListener('feeid-open', e => {
        this.openReader(e.detail.url, app, {
          feedTitle:  card.getAttribute('feed-title')  || '',
          feedAvatar: card.getAttribute('feed-avatar') || '',
          feedId:     card.getAttribute('feed-id')     || ''
        });
      });
      card.addEventListener('feeid-like', async e => {
        const liked = await app.toggleLike(e.detail.url);
        liked ? card.setAttribute('liked', '') : card.removeAttribute('liked');
      });
      card.addEventListener('feeid-save', async e => {
        const saved = await app.toggleSave(e.detail.url);
        saved ? card.setAttribute('saved', '') : card.removeAttribute('saved');
      });
      card.addEventListener('feeid-share', e => {
        const shareUrl = `${location.origin}${location.pathname}?open=${encodeURIComponent(e.detail.url)}`;
        if (navigator.share) {
          navigator.share({ title: e.detail.title || 'Feeid', url: shareUrl });
        } else {
          navigator.clipboard.writeText(shareUrl);
          showBanner('Link kopiert!', 'success', 2000);
        }
      });
      card.addEventListener('feeid-feed', e => {
        app.setActiveFeed(e.detail.feedId);
      });
    });
  }
};

// Hilfsfunktionen kommen aus utils.js (via Import oben)