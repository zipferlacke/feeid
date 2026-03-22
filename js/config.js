/**
 * config.js
 * Feeid Zentrale Konfiguration
 *
 * SERVER_URL hier eintragen – wird von allen Modulen genutzt.
 * Lokal:      http://localhost/feeid
 * Produktion: https://feeid.example.com
 */

export const config = {
  SERVER_URL: '.',

  // API-Endpunkte – werden automatisch aus SERVER_URL gebaut
  get PROXY()  { return `${this.SERVER_URL}/proxy.php`;  },
  get READER() { return `${this.SERVER_URL}/reader.php`; },
};
