# Feeid – Konzeptdokument
*Stand: März 2026 – Version 0.2*

---

## Vision

Feeid ist eine moderne, dezentrale Community-Plattform die lokale Kultur, Veranstaltungen und regionale Inhalte in einem sozialen Feed-Erlebnis zusammenbringt. Die App verbindet RSS und ActivityPub in einem modernen kartenbasierten Interface – lokal, offen, werbefrei.

**Kurz gesagt:** Feeid ist das was Instagram hätte sein können – aber lokal, offen und ohne Konzern dahinter.

---

## Name

**Feeid** – abgeleitet von "Feed", klingt modern und eigenständig, vermittelt Freiheit und Offenheit.

---

## Zielgruppe

- **Kern:** Kulturinteressierte im Alter von 20–40 Jahren
- **Erweiterung:** Alle Altersgruppen – niedrigschwellig und intuitiv

---

## Inhalte (Priorität)

1. **Regionale Veranstaltungen** ← Herzstück
2. **Vereins- & Stadtinfos**
3. **Blogs & unabhängige Creator**
4. **Kultur & Kunst**
5. **Lokale Nachrichten**

---

## Technisches Fundament

### RSS – Kompatibilitäts-Layer
- Readonly – kein Kommentieren möglich
- Für bestehende Quellen: Zeitungen, Stadtportale, Eventbrite, WordPress
- Wird langfristig von ActivityPub abgelöst
- Bleibt als Übergangs-Technologie für 10-20 Jahre relevant

### ActivityPub – Die Zukunft
- Lesen ohne Account möglich (öffentliche Outbox wie RSS)
- Kommentieren und Liken mit Account
- Dezentral – kein zentraler Anbieter
- Kompatibel mit Mastodon, Pixelfed, Lemmy und allen anderen ActivityPub-Apps
- Vereine empfehlen wir ActivityPub statt RSS

### Wie Feeid beides behandelt
```
Feed-URL eingeben
        ↓
Feeid erkennt automatisch: RSS oder ActivityPub?
        ↓
Zeigt beides als Cards an
        ↓
Bei ActivityPub: Kommentieren aktiviert
Bei RSS: nur lesen
```

Der Nutzer merkt den Unterschied nicht – außer dass bei manchen Cards ein Kommentar-Button erscheint.

### PHP Backend
- RSS-Proxy (wegen CORS)
- Content Extraction / Reader-Modus (via Readability)
- Später: ActivityPub Inbox

---

## Plattform

**Web-App im Browser** (Phase 1)
- Kein App-Store nötig
- Zugänglich für alle Altersgruppen
- Einfach verlinkbar

Native Apps (iOS/Android) können später folgen.

---

## UX & Design

### Hauptfeed
- **Card-basiertes Layout** – jeder Inhalt ist eine visuelle Karte
- Veranstaltungen als "Upcoming"-Cards hervorgehoben
- Sortierung wählbar: chronologisch, nach Veranstaltungsdatum, nach Interessen

### Navigation
- Seitenleiste mit allen gefolgten Profilen/Feeds
- Klick auf Profil zeigt nur dessen Inhalte
- Profile mit Avatar, Beschreibung, Follower-Zahl

### Vollinhalt
- Seite wird server-seitig geladen und bereinigt angezeigt (Reader-Modus)
- Nutzer verlässt Feeid nie

### Onboarding
- Standort (freiwillig) und Interessen angeben
- Vorschläge von Feeds aus der Region
- Empfehlungen ein/ausschaltbar

---

## Datenspeicherung

Lokal als JSON – später sync-fähig über selbst gehostete URL.

```json
{
  "_version": "1.0.0",
  "profile": { "id", "display_name", "avatar_url", "location", "interests" },
  "account": { "activitypub_handle", "activitypub_server" },
  "feeds": [ { "id", "url", "title", "avatar_url", "subscribed_at" } ],
  "settings": { "feed_sort", "theme", "language", "sync" },
  "likes": { "item-url": "timestamp" },
  "saves": { "item-url": "timestamp" }
}
```

---

## Feed-Index / Entdeckung

Feeid betreibt einen kuratierten Index lokaler Feeds:

- **Phase 1:** Manuell kuratiert vom Feeid-Team
- **Phase 2:** Vereine tragen sich selbst ein
- **Phase 3:** Automatisches Crawling via OpenStreetMap

OpenStreetMap als Datenquelle:
```
OSM → Vereine in Region X
    → Feeid prüft ob Website RSS oder ActivityPub hat
    → Automatisch in Index aufnehmen
```

---

## Monetarisierung

- Komplett kostenlos für Nutzer
- Gemeinnütziger Ansatz
- Fördermittel und öffentliche Unterstützung (Stadtmarketing, Kulturförderung)
- Keine Werbung, kein Datenverkauf

---

## Produkt-Strategie

### Produkt 1 – Feeid *(jetzt bauen)*
Reader für RSS + ActivityPub wie beschrieben.

### Produkt 2 – Feeid for Organizations *(Strategie / Zukunft)*
Zwei Teile:

**Teil A – Dokumentation / README für Vereine:**
- Wie erstelle ich einen ActivityPub-Feed mit PHP
- Wie erstelle ich personalisierte Feeds pro Mitglied (Token-basiert)
- Wie aktiviere ich Kommentare via inbox.php
- Ziel: Vereine können ohne Feeid-Hilfe loslegen

**Teil B – Hosted Infrastructure (optional, später):**
- Feeid betreibt die Inbox für Vereine die das nicht selbst wollen
- Einfaches Dashboard für Kommentare
- Macht ActivityPub zugänglich ohne technisches Wissen
- Mögliches Finanzierungsmodell für Feeid

---

## Differenzierung

| | Feeid | RSS-Reader | Instagram/Facebook |
|---|---|---|---|
| Modernes UI | ✅ | ❌ | ✅ |
| Dezentral | ✅ | teilweise | ❌ |
| Lokaler Fokus | ✅ | ❌ | ❌ |
| Daten beim Nutzer | ✅ | ❌ | ❌ |
| Kommentare & Likes | ✅ | ❌ | ✅ |
| Kein Algorithmus-Zwang | ✅ | ✅ | ❌ |
| Kostenlos & werbefrei | ✅ | teilweise | ❌ |
| RSS + ActivityPub | ✅ | nur RSS | ❌ |

---

*Dieses Dokument ist ein lebendes Konzept – Stand Version 0.2, März 2026*
