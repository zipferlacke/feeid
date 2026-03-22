/**
 * <feeid-reader> Custom Element
 *
 * Öffnet einen modalen Reader-Dialog für einen Artikel.
 *
 * Methoden:
 *   open(url)  – Reader öffnen
 *   close()    – Reader schließen
 *
 * Events:
 *   feeid-reader-close – Reader wurde geschlossen
 */

import { config } from '../config.js';
import { showBanner } from '../../libs/wuefl-libs/banner/banner.js';
import { escapeHtml } from '../utils.js';

export class FeeidReader extends HTMLElement {

  connectedCallback() {
    // Dialog wird erst bei open() erstellt – nicht sofort
  }

  _createDialog() {
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'feeid-reader__dialog';
    this._dialog.innerHTML = `
      <header class="feeid-reader__header">
        <button class="feeid-reader__feed-link">
          <img class="feeid-reader__feed-avatar" src="" alt="">
          <span class="feeid-reader__feed-name"></span>
        </button>
        <button class="button reader-share" data-shape="no-background" title="Teilen">
          <span class="msr">share</span>
        </button>
        <a class="button feeid-reader__external" data-shape="no-background"
           target="_blank" title="Im Browser öffnen">
          <span class="msr">open_in_new</span>
        </a>
        <button class="button reader-close" data-shape="no-background" title="Schließen">
          <span class="msr">close</span>
        </button>
      </header>
      <div class="feeid-reader__content">
        <p style="color:var(--clr-neutral-500)">Lädt…</p>
      </div>`;

    document.body.appendChild(this._dialog);

    this._dialog.querySelector('.reader-close').addEventListener('click', () => this.close());
    this._dialog.querySelector('.reader-share').addEventListener('click', () => this._share());
    this._dialog.addEventListener('click', e => {
      if (e.target === this._dialog) this.close();
    });
  }

  async open(url, { feedTitle = '', feedAvatar = '', feedId = '' } = {}) {
    if (!this._dialog) this._createDialog();

    this._currentUrl = url;

    const content  = this._dialog.querySelector('.feeid-reader__content');
    const extLink  = this._dialog.querySelector('.feeid-reader__external');
    const feedLink = this._dialog.querySelector('.feeid-reader__feed-link');
    const feedImg  = this._dialog.querySelector('.feeid-reader__feed-avatar');
    const feedName = this._dialog.querySelector('.feeid-reader__feed-name');

    extLink.href         = url;
    feedName.textContent = feedTitle;
    feedImg.src          = feedAvatar;
    feedImg.style.display  = feedAvatar ? '' : 'none';
    feedLink.style.display = feedTitle  ? '' : 'none';

    feedLink.onclick = () => {
      this.close();
      this.dispatchEvent(new CustomEvent('feeid-reader-feed', { bubbles: true, detail: { feedId } }));
    };

    content.innerHTML = '<p style="color:var(--clr-neutral-500)">Lädt…</p>';
    this._dialog.showModal();

    try {
      const res  = await fetch(`${config.READER}?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      content.innerHTML = `
        <h1 class="feeid-reader__title">${escapeHtml(data.title)}</h1>
        <div>${data.content}</div>`;
    } catch {
      showBanner('Reader nicht verfügbar – öffne im Browser.', 'warning');
      window.open(url, '_blank');
      this.close();
    }
  }

  close() {
    this._dialog?.close();
    this.dispatchEvent(new CustomEvent('feeid-reader-close', { bubbles: true }));
  }

  async _share() {
    const shareUrl = `${location.origin}${location.pathname}?open=${encodeURIComponent(this._currentUrl)}`;
    const title = this._dialog.querySelector('.feeid-reader__title')?.textContent || 'Feeid';
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (e) {
        // Nutzer hat abgebrochen – kein Fallback nötig
        if (e.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          showBanner('Link kopiert!', 'success', 2000);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showBanner('Link kopiert!', 'success', 2000);
    }
  }
}

customElements.define('feeid-reader', FeeidReader);