/**
 * notifications.js
 * Feeid Push-Benachrichtigungen
 *
 * Nutzt Periodic Background Sync (Chrome/Android)
 * Service Worker prüft Feeds im Hintergrund und zeigt Notifications
 *
 * Verwendete Icons: notifications, notifications_off, notifications_active
 */

import { store } from './store.js';

const SYNC_TAG = 'feeid-feed-check';
const SYNC_MIN_INTERVAL = 60 * 60 * 1000; // 1 Stunde in ms

export const notifications = {

  /**
   * Notification-Berechtigung anfragen
   * Gibt 'granted', 'denied' oder 'default' zurück
   */
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  },

  /**
   * Periodic Background Sync registrieren
   * Browser weckt SW regelmäßig auf um Feeds zu prüfen
   */
  async registerSync() {
    if (!('serviceWorker' in navigator)) return false;
    if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
      console.info('Feeid: Periodic Background Sync nicht unterstützt');
      return false;
    }

    const permission = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (permission.state !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    await reg.periodicSync.register(SYNC_TAG, {
      minInterval: SYNC_MIN_INTERVAL
    });
    return true;
  },

  /**
   * Periodic Sync abmelden (wenn alle Notifications deaktiviert)
   */
  async unregisterSync() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      await reg.periodicSync.unregister(SYNC_TAG);
    }
  },

  /**
   * Notification-Einstellungen für einen Feed aktualisieren
   * und Sync je nach Bedarf an/abmelden
   */
  async updateFeedNotifications(feedId, enabled, categories = []) {
    const data = await store.load();
    const feed = data.feeds.find(f => f.id === feedId);
    if (!feed) return;

    feed.notifications = { enabled, categories };
    await store.save(data);

    // Prüfen ob irgendein Feed Notifications will
    const anyEnabled = data.feeds.some(f => f.notifications?.enabled);

    if (anyEnabled) {
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        await this.registerSync();
      }
    } else {
      await this.unregisterSync();
    }
  },

  /**
   * Kategorien aus Feed-Items extrahieren
   * Wird beim ersten Feed-Abruf aufgerufen
   */
  extractCategories(items) {
    const cats = new Set();
    items.forEach(item => {
      if (item.categories) item.categories.forEach(c => cats.add(c));
    });
    return [...cats].map(name => ({ name, enabled: true }));
  }
};