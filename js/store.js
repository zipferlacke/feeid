/**
 * store.js
 * Feeid lokaler Datenspeicher
 * Nutzt IndexedDB via idb-keyval für persistente Speicherung
 * Alle Methoden sind async
 *
 * idb-keyval: https://github.com/jakearchibald/idb-keyval
 * ~600 Bytes, kein Build-Schritt nötig
 */

import { get, set } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

const STORAGE_KEY = 'feeid_data';
const SCHEMA_VERSION = '1.0.0';

const defaultData = {
  _version: SCHEMA_VERSION,
  profile: {
    id: '',
    display_name: '',
    avatar_url: '',
    location: {
      enabled: false,
      lat: null,
      lng: null,
      radius_km: 50,
      label: ''
    },
    interests: []
  },
  account: {
    // PHASE 2 – ActivityPub Konto
    activitypub_handle: null,
    activitypub_server: null,
    token: null
  },
  feeds: [],
  settings: {
    feed_sort: 'by_date',
    theme: 'system',
    language: 'de',
    sync: {
      enabled: false,
      url: '',
      last_synced_at: null
    }
  },
  likes: {},
  saves: {}
};

export const store = {

  /**
   * Komplettes Daten-Objekt laden
   */
  async load() {
    const data = await get(STORAGE_KEY);
    if (!data) return this.init();
    if (data._version !== SCHEMA_VERSION) {
      console.warn('Feeid: Schema-Version veraltet, Migration nötig');
    }
    return data;
  },

  /**
   * Komplettes Daten-Objekt speichern
   */
  async save(data) {
    data._version = SCHEMA_VERSION;
    await set(STORAGE_KEY, data);
  },

  /**
   * Erste Initialisierung mit Default-Daten
   */
  async init() {
    const data = structuredClone(defaultData);
    data.profile.id = crypto.randomUUID();
    await this.save(data);
    return data;
  },

  /**
   * Einzelnen Schlüssel aktualisieren
   * z.B. await store.update('settings', { theme: 'dark' })
   */
  async update(key, value) {
    const data = await this.load();
    if (typeof value === 'object' && !Array.isArray(value)) {
      data[key] = { ...data[key], ...value };
    } else {
      data[key] = value;
    }
    await this.save(data);
    return data;
  },

  /**
   * Feed hinzufügen
   */
  async addFeed(feed) {
    const data = await this.load();
    feed.id = crypto.randomUUID();
    feed.subscribed_at = new Date().toISOString();
    data.feeds.push(feed);
    await this.save(data);
    return feed;
  },

  /**
   * Feed entfernen
   */
  async removeFeed(feedId) {
    const data = await this.load();
    data.feeds = data.feeds.filter(f => f.id !== feedId);
    await this.save(data);
  },

  /**
   * Like togglen
   */
  async toggleLike(itemUrl) {
    const data = await this.load();
    if (data.likes[itemUrl]) {
      delete data.likes[itemUrl];
    } else {
      data.likes[itemUrl] = new Date().toISOString();
    }
    await this.save(data);
    return !!data.likes[itemUrl];
  },

  /**
   * Save togglen
   */
  async toggleSave(itemUrl) {
    const data = await this.load();
    if (data.saves[itemUrl]) {
      delete data.saves[itemUrl];
    } else {
      data.saves[itemUrl] = new Date().toISOString();
    }
    await this.save(data);
    return !!data.saves[itemUrl];
  },

  /**
   * Komplettes JSON exportieren (für Sync/Backup)
   */
  async export() {
    const data = await this.load();
    return JSON.stringify(data, null, 2);
  },

  /**
   * JSON importieren (von Sync-URL oder Datei)
   */
  async import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await this.save(data);
      return true;
    } catch {
      console.error('Feeid: Import fehlgeschlagen');
      return false;
    }
  }
};
