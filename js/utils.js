/**
 * utils.js
 * Feeid – Gemeinsame Hilfsfunktionen
 */

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtDate(str) {
  if (!str) return '';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(str));
  } catch { return str; }
}

export function fmtDateTime(str) {
  if (!str) return '';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(str));
  } catch { return str; }
}