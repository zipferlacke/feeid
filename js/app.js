/**
 * app.js
 * Feeid Haupt-App
 */

import { store } from './store.js';
import { feedLoader } from './feeds.js';
import { renderer } from './renderer.js';
import { notifications } from './notifications.js';

class FeeidApp {

  constructor() {
    this.data = null;
    this.items = [];
    this.activeFeedId = null;
  }

  async init() {
    this.data = await store.load();
    renderer.renderShell(document.getElementById('app'), this);

    if (this.data.feeds.length === 0) {
      renderer.renderOnboarding(document.getElementById('feeid-main'), this);
    } else {
      await this.loadFeeds();
      // URL-Parameter: ?feed=ID → direkt Feed-Profil öffnen
      const params = new URLSearchParams(location.search);
      const feedParam = params.get('feed');
      if (feedParam) this.setActiveFeed(feedParam);
      // URL-Parameter: ?open=URL → Reader direkt öffnen
      const openParam = params.get('open');
      if (openParam) renderer.openReader(openParam, this);
    }
  }

  async loadFeeds() {
    if (!this.data.feeds.length) return;
    this.items = await feedLoader.loadAll(this.data.feeds);
    this.items = this.sortItems(this.items);
    this.renderFeed();
  }

  renderFeed() {
    const filtered = this.activeFeedId
      ? this.items.filter(i => i.feed_id === this.activeFeedId)
      : this.items;
    renderer.renderFeed(document.getElementById('feeid-main'), filtered, this);
  }

  sortItems(items) {
    const sort = this.data.settings.feed_sort;
    return [...items].sort((a, b) => {
      if (sort === 'by_date' && a.event?.start_at && b.event?.start_at) {
        return new Date(a.event.start_at) - new Date(b.event.start_at);
      }
      return new Date(b.published_at) - new Date(a.published_at);
    });
  }

  async addFeed(url) {
    const type = await feedLoader.detectType(url);
    const feed = await store.addFeed({ url, title: url, avatar_url: '', type });
    this.data = await store.load();
    await this.loadFeeds();
    return feed;
  }

  async removeFeed(feedId) {
    await store.removeFeed(feedId);
    this.data = await store.load();
    if (this.activeFeedId === feedId) this.activeFeedId = null;
    await this.loadFeeds();
  }

  async setActiveFeed(feedId) {
    this.activeFeedId = feedId;

    // feeid-sidebar aktiven State aktualisieren
    document.querySelector('feeid-sidebar')?.setActiveFeed(feedId);

    const main = document.getElementById('feeid-main');
    if (feedId) {
      const feed = this.data.feeds.find(f => f.id === feedId);
      const items = this.items.filter(i => i.feed_id === feedId);
      if (feed) renderer.renderFeedProfile(main, feed, items, this);
    } else {
      this.renderFeed();
    }
  }

  async updateFeedNotifications(feedId, enabled, categories) {
    await notifications.updateFeedNotifications(feedId, enabled, categories);
    this.data = await store.load();
  }

  async toggleLike(itemUrl) {
    const liked = await store.toggleLike(itemUrl);
    this.data = await store.load();
    return liked;
  }

  async toggleSave(itemUrl) {
    const saved = await store.toggleSave(itemUrl);
    this.data = await store.load();
    return saved;
  }
}

const app = new FeeidApp();
app.init();