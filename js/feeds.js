/**
 * feeds.js
 * Feeid Feed-Abruf
 * Unterstützt RSS und ActivityPub (öffentliche Outbox)
 *
 * Fetch-Strategie:
 * 1. Direkt (funktioniert wenn Server CORS-Header sendet)
 * 2. Über PHP-Proxy (wenn vorhanden)
 * 3. Über öffentlichen CORS-Proxy als Fallback
 */

import { config } from './config.js';

// Öffentlicher CORS-Proxy als Fallback wenn PHP nicht läuft
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export const feedLoader = {

  /**
   * Feed laden – erkennt automatisch RSS oder ActivityPub
   */
  async load(feedUrl) {
    try {
      const { content, type } = await this._fetchWithFallback(feedUrl);
      if (type === 'activitypub') return this._normalizeActivityPub(this._parseActivityPub(content), feedUrl);
      return this._normalizeRss(this._parseRss(content), feedUrl);
    } catch (err) {
      console.error(`Feeid: Feed konnte nicht geladen werden (${feedUrl})`, err);
      return [];
    }
  },

  /**
   * Feed-Typ erkennen
   */
  async detectType(url) {
    try {
      const { type } = await this._fetchWithFallback(url);
      return type;
    } catch {
      return 'unknown';
    }
  },

  /**
   * Mehrere Feeds parallel laden
   */
  async loadAll(feeds) {
    const results = await Promise.allSettled(
      feeds.map(feed =>
        this.load(feed.url).then(items =>
          items.map(item => ({
            ...item,
            feed_id: feed.id,
            feed_title: feed.title || feed.url,
            feed_avatar: feed.avatar_url
          }))
        )
      )
    );
    return results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
  },

  /**
   * Fetch mit Fallback-Kette:
   * 1. Direkt
   * 2. PHP Proxy
   * 3. Öffentlicher CORS Proxy
   */
  async _fetchWithFallback(url) {
    // 1. Direkt versuchen (klappt bei ActivityPub oft)
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/activity+json, application/ld+json, application/rss+xml, application/xml, text/xml, */*' }
      });
      if (res.ok) {
        const content = await res.text();
        return { content, type: this._detectType(content, res.headers.get('content-type') || '') };
      }
    } catch { /* weiter mit Fallback */ }

    // 2. PHP Proxy (wenn konfiguriert und erreichbar)
    try {
      const proxyUrl = `${config.PROXY}?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) return { content: JSON.stringify(data), type: data.type, _parsed: data };
      }
    } catch { /* weiter mit Fallback */ }

    // 3. Öffentlicher CORS Proxy
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const content = await res.text();
    return { content, type: this._detectType(content, res.headers.get('content-type') || '') };
  },

  /**
   * Typ aus Content erkennen
   */
  _detectType(content, contentType) {
    if (contentType.includes('activity+json') || contentType.includes('ld+json')) return 'activitypub';
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        if (json['@context'] && JSON.stringify(json['@context']).includes('activitystreams')) return 'activitypub';
      } catch { /* kein JSON */ }
    }
    return 'rss';
  },

  /**
   * RSS/Atom parsen (Browser-nativ via DOMParser)
   */
  _parseRss(content) {
    // Falls PHP-Proxy bereits geparste Items geliefert hat
    try {
      const json = JSON.parse(content);
      if (json.items) return json.items;
    } catch { /* kein JSON, echtes XML */ }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const items = [];

    // RSS 2.0
    doc.querySelectorAll('item').forEach(item => {
      const get = tag => item.querySelector(tag)?.textContent?.trim() || '';
      const getAttr = (tag, attr) => item.querySelector(tag)?.getAttribute(attr) || '';

      // Bild aus verschiedenen Quellen
      let image = getAttr('enclosure', 'url');
      if (!image) {
        const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
        image = mediaContent?.getAttribute('url') || '';
      }
      if (!image) {
        const desc = get('description');
        const match = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        image = match?.[1] || '';
      }

      items.push({
        id: get('guid') || get('link'),
        title: get('title'),
        summary: get('description').replace(/<[^>]+>/g, '').trim().slice(0, 300),
        url: get('link'),
        image_url: image,
        published_at: get('pubDate') ? new Date(get('pubDate')).toISOString() : null,
        author: get('author') || get('creator'),
        categories: [...item.querySelectorAll('category')].map(c => c.textContent.trim())
      });
    });

    // Atom
    if (!items.length) {
      doc.querySelectorAll('entry').forEach(entry => {
        const get = tag => entry.querySelector(tag)?.textContent?.trim() || '';
        const link = [...entry.querySelectorAll('link')]
          .find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'))
          ?.getAttribute('href') || '';

        items.push({
          id: get('id'),
          title: get('title'),
          summary: get('summary') || get('content').replace(/<[^>]+>/g, '').trim().slice(0, 300),
          url: link,
          image_url: '',
          published_at: get('published') || get('updated') || null,
          author: get('name'),
          categories: [...entry.querySelectorAll('category')].map(c => c.getAttribute('term') || c.textContent.trim())
        });
      });
    }

    return items;
  },

  /**
   * ActivityPub Outbox parsen
   */
  _parseActivityPub(content) {
    try {
      const json = typeof content === 'string' ? JSON.parse(content) : content;
      // Direkte Outbox oder bereits geparste Items
      if (json.items) return json.items;
      if (json.orderedItems) return json.orderedItems;
      // Einzelner Post
      if (json.type) return [json];
    } catch { /* kein JSON */ }
    return [];
  },

  /**
   * RSS Items normalisieren
   */
  _normalizeRss(items, feedUrl) {
    return items.map(item => ({
      id: item.id || item.guid || item.link,
      type: 'rss',
      can_comment: false,
      title: item.title || '',
      summary: item.summary || item.description || '',
      url: item.url || item.link || '',
      image_url: item.image_url || item.image || '',
      published_at: item.published_at || (item.pubDate ? new Date(item.pubDate).toISOString() : null),
      author: item.author || '',
      categories: item.categories || [],
      event: null,
      feed_url: feedUrl
    }));
  },

  /**
   * ActivityPub Items normalisieren
   */
  _normalizeActivityPub(items, feedUrl) {
    return items
      .filter(item => item && (item.type === 'Note' || item.type === 'Article' || item.type === 'Event' || item.object))
      .map(item => {
        // Create/Announce wrappen oft ein object
        const obj = item.object && typeof item.object === 'object' ? item.object : item;
        return {
          id: obj.id || item.id,
          type: 'activitypub',
          can_comment: true,
          title: obj.name || obj.summary || '',
          summary: (obj.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 300),
          url: obj.url || obj.id || '',
          image_url: Array.isArray(obj.attachment) ? (obj.attachment.find(a => a.mediaType?.startsWith('image/'))?.url || '') : '',
          published_at: obj.published || item.published || null,
          author: typeof obj.attributedTo === 'string' ? obj.attributedTo : '',
          categories: obj.tag?.filter(t => t.type === 'Hashtag').map(t => t.name) || [],
          event: obj.type === 'Event' ? {
            start_at: obj.startTime || null,
            end_at: obj.endTime || null,
            location_name: obj.location?.name || ''
          } : null,
          feed_url: feedUrl
        };
      });
  }
};