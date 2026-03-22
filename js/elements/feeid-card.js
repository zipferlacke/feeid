/**
 * <feeid-card> Custom Element
 *
 * Attribute:
 *   url          – Artikel-URL
 *   title        – Titel
 *   summary      – Kurztext
 *   image        – Bild-URL (optional, Fallback: feed-avatar)
 *   feed-title   – Name des Feeds
 *   feed-avatar  – Avatar-URL des Feeds
 *   feed-id      – Feed-ID
 *   published    – ISO-Datum
 *   type         – 'rss' | 'activitypub'
 *   liked        – Boolean
 *   saved        – Boolean
 *   event-date   – ISO-Datum (wenn Veranstaltung)
 *   event-location – Ortsname
 *
 * Events:
 *   feeid-open   – Nutzer klickt auf Card (detail: { url })
 *   feeid-like   – Nutzer liked (detail: { url })
 *   feeid-save   – Nutzer saved (detail: { url })
 *   feeid-share  – Nutzer teilt (detail: { url, title })
 *   feeid-feed   – Nutzer klickt auf Feed-Name (detail: { feedId })
 */

import { escapeHtml, fmtDateTime } from '../utils.js';

export class FeeidCard extends HTMLElement {

  static get observedAttributes() {
    return ['liked', 'saved'];
  }

  connectedCallback() {
    this.classList.add('card', 'feeid-card');
    if (this.getAttribute('event-date')) this.classList.add('feeid-card--event');
    this._render();
    this._bind();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;
    if (name === 'liked') {
      const btn = this.querySelector('.like-btn');
      if (btn) btn.classList.toggle('active', newVal !== null);
    }
    if (name === 'saved') {
      const btn = this.querySelector('.save-btn');
      if (btn) btn.classList.toggle('active', newVal !== null);
    }
  }

  _render() {
    const url        = this.getAttribute('url') || '';
    const title      = this.getAttribute('title') || '';
    const summary    = this.getAttribute('summary') || '';
    const image      = this.getAttribute('image') || this.getAttribute('feed-avatar') || '';
    const feedTitle  = this.getAttribute('feed-title') || '';
    const feedAvatar = this.getAttribute('feed-avatar') || '';
    const published  = this.getAttribute('published') || '';
    const type       = this.getAttribute('type') || 'rss';
    const liked      = this.hasAttribute('liked');
    const saved      = this.hasAttribute('saved');
    const eventDate  = this.getAttribute('event-date') || '';
    const eventLoc   = this.getAttribute('event-location') || '';
    const isAP       = type === 'activitypub';

    this.dataset.url = url;

    this.innerHTML = `
      ${image ? `
        <img class="feeid-card__image"
             src="${escapeHtml(image)}"
             loading="lazy" alt=""
             onerror="this.style.display='none'">` : ''}
      <div class="feeid-card__body">
        <div class="feeid-card__feed">
          ${feedAvatar ? `<img src="${escapeHtml(feedAvatar)}" onerror="this.style.display='none'" alt="">` : ''}
          <button class="feeid-card__feed-name" style="background:none;border:none;padding:0;cursor:pointer;font:inherit;color:inherit">
            ${escapeHtml(feedTitle)}
          </button>
          <span style="margin-left:auto">${published ? fmtDateTime(published) : ''}</span>
        </div>
        ${eventDate ? `
          <div class="feeid-card__event-date">
            <span class="msr">event</span>
            ${fmtDateTime(eventDate)}
            ${eventLoc ? `· ${escapeHtml(eventLoc)}` : ''}
          </div>` : ''}
        <h2 class="feeid-card__title">${escapeHtml(title)}</h2>
        <p class="feeid-card__summary">${escapeHtml(summary)}</p>
      </div>
      <div class="feeid-card__actions">
        <button class="feeid-card__action-btn like-btn ${liked ? 'active' : ''}" title="Gefällt mir">
          <span class="msr">favorite</span>
          <span class="like-count">0</span>
        </button>
        <button class="feeid-card__action-btn save-btn ${saved ? 'active' : ''}" title="Merken">
          <span class="msr">bookmark</span>
        </button>
        <button class="feeid-card__action-btn share-btn" title="Teilen">
          <span class="msr">share</span>
        </button>
        ${isAP ? `
          <button class="feeid-card__action-btn" title="Kommentieren (Phase 2)" disabled>
            <span class="msr">chat_bubble</span>
          </button>
          <span class="feeid-card__ap-badge"><span class="msr">hub</span></span>` : ''}
      </div>`;
  }

  _bind() {
    const url   = this.getAttribute('url') || '';
    const title = this.getAttribute('title') || '';
    const feedId = this.getAttribute('feed-id') || '';

    // Card-Klick → Reader öffnen
    this.addEventListener('click', e => {
      if (e.target.closest('.feeid-card__action-btn') || e.target.closest('.feeid-card__feed-name')) return;
      this.dispatchEvent(new CustomEvent('feeid-open', { bubbles: true, detail: { url } }));
    });

    // Feed-Name klick → Profil
    this.querySelector('.feeid-card__feed-name')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('feeid-feed', { bubbles: true, detail: { feedId } }));
    });

    // Like
    this.querySelector('.like-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('feeid-like', { bubbles: true, detail: { url } }));
    });

    // Save
    this.querySelector('.save-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('feeid-save', { bubbles: true, detail: { url } }));
    });

    // Share
    this.querySelector('.share-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('feeid-share', { bubbles: true, detail: { url, title } }));
    });
  }
}

customElements.define('feeid-card', FeeidCard);