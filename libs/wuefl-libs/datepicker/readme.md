# DatePicker

Vanilla JS Datum- und Zeitpicker als Ergänzung zum SelectPicker. Kein Framework, kein Build-Schritt.


## Installation

```html
<!-- CSS wird automatisch injiziert, kein Link-Tag nötig -->
<script type="module">
  import { DatePicker } from './datepicker.js';
</script>
```

## Schnellstart

```js
const dp = new DatePicker({ lang: 'de' });

// Single-Datum
dp.create(document.getElementById('meinInput'));

// Range — zwei Inputs als Array → automatisch Range-Modus
dp.create([
  document.getElementById('von'),
  document.getElementById('bis'),
]);

// Datum + Uhrzeit
dp.create(inputEl, { showTime: true });

// Nur Zeit
dp.create(inputEl, { showDate: false, showTime: true });
```

## Konstruktor

```js
new DatePicker(config)
```

| Parameter | Typ | Beschreibung |
|---|---|---|
| `config.lang` | `string` | UI-Sprache: `'de'` oder `'en'`. Standard: Browser-Sprache. |
| `config.locale` | `string` | Locale für Datumsformatierung, z.B. `'de-DE'`. Standard: `navigator.language`. |
| `config.translations` | `Object` | Eigene Texte für Buttons und Labels. |
| `config.options` | `Object` | Globale Standardoptionen für alle `create()`-Aufrufe dieser Instanz. |

## create(inputConfig, options)

### inputConfig

| Form | Ergebnis |
|---|---|
| `element` | Single-Modus |
| `[element]` | Single-Modus |
| `[start, end]` | Range-Modus — automatisch erkannt |

### options

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `showDate` | `boolean` | `true` | Kalender anzeigen. |
| `showTime` | `boolean` | `true` | Zeitpicker anzeigen. |
| `outputFormat` | `'locale'`\|`'ms'`\|`'iso'` | `'ms'` | Format des gespeicherten Werts im Input-Feld. |

### outputFormat

| Wert | Beispiel | Beschreibung |
|---|---|---|
| `'locale'` | `13.03.2026` / `13.03.2026, 14:30` | Regionalformat nach `navigator.language` |
| `'ms'` | `1742169600000` | Unix-Millisekunden als String |
| `'iso'` | `2026-03-13` / `2026-03-13T14:30` | ISO 8601 |
| Nur Zeit | `14:30` | Immer `HH:MM`, unabhängig von `outputFormat` |

> Die Anzeige im Trigger-Element ist immer im Regionalformat — unabhängig vom `outputFormat`.

## Instanz-API

```js
const picker = dp.create(inputEl);

picker.open();   // Picker öffnen
picker.close();  // Schließen ohne Speichern
picker.save();   // Speichern und schließen
picker.reset();  // Auswahl zurücksetzen
```

## Verhalten

**Single ohne Zeit** — Klick auf Tag speichert sofort und schließt den Picker.

**Single mit Zeit** — Speichern-Button erscheint, Picker schließt erst nach Klick.

**Range** — Erster Klick setzt Von = Bis (einzelner Tag). Zweiter Klick weitet auf Bis aus. Hover zeigt Vorschau des Bereichs. Speichern-Button immer vorhanden.

## CSS-Variablen

Alle Variablen einmal in `:root` setzen. Die Lightness-Abstufungen (hover, aktiv, gedämpft etc.) werden automatisch berechnet — nur der Farbton (h + s) der Basisfarbe ist relevant. Dark-Mode wird über `color-scheme: light dark` automatisch unterstützt.

| Variable | Standard | Beschreibung |
|---|---|---|
| `--clr-picker` | `hsl(0,0%,90%)` | Farbton des Popovers |
| `--clr-picker-trigger` | `hsl(0,0%,90%)` | Farbton des Trigger-Elements |
| `--clr-picker-input` | `hsl(219,100%,50%)` | Akzentfarbe: Buttons, Auswahl, Range-Balken |
| `--clr-picker-today` | `hsl(30,100%,52%)` | Farbe des Heute-Kreises |
| `--fs-picker-header` | `1rem` | Schriftgröße Header/Monat |
| `--fs-input-picker` | `0.9rem` | Schriftgröße Tage & Inputs |
| `--br-picker` | `0.5rem` | Border-Radius |
| `--height-input-picker` | `2rem` | Höhe Buttons & Zeit-Inputs |
| `--picker-cal-width` | `290px` | Breite des Kalender-Popovers |
| `--picker-sel-size` | `1.9rem` | Durchmesser des Auswahl-/Heute-Kreises |

### Beispiel: Eigene Farben

```css
:root {
  --clr-picker:         hsl(220, 15%, 50%);  /* blaugrau */
  --clr-picker-trigger: hsl(220, 15%, 50%);
  --clr-picker-input:   hsl(262, 80%, 55%);  /* violett */
  --clr-picker-today:   hsl(16, 90%, 55%);   /* orange */
}
```

## Icons (Material Symbols Rounded)

Die CSS enthält einen eingebetteten Base64-Font-Subset. Verwendete Icons:

`close` · `refresh` · `check` · `search` · `apps_outage` · `chevron_left` · `chevron_right`

Um den Font neu zu generieren:

```bash
conda activate tools
pyftsubset google-icons-rounded.woff2 \
  --glyphs="close,refresh,check,search,apps_outage,chevron_left,chevron_right" \
  --layout-features="*" \
  --flavor=woff2 \
  --output-file=picker-icons.woff2

base64 -i picker-icons.woff2 | tr -d '\n' > picker-icons-base64.txt
```

Den Inhalt von `picker-icons-base64.txt` dann als `BASE64_FONT_HERE` in der CSS einsetzen.

## Versionierung

`datepicker.js` und `datepicker.css` sind dünne Loader-Wrapper. Beim Release einer neuen Version:

1. Neue versionierte Dateien ablegen: `datepicker_v1.0.1.js` / `datepicker_v1.0.1.css`
2. In `datepicker.js` eine Zeile ändern:
   ```js
   export { DatePicker } from './datepicker_v1.0.1.js';
   ```
3. In `datepicker.css` eine Zeile ändern:
   ```css
   @import url('./datepicker_v1.0.1.css');
   ```

Alle HTML-Dateien importieren weiterhin `datepicker.js` / `datepicker.css` — **keine Änderungen nötig**.

## Browser-Support

CSS Anchor Positioning (für automatische Positionierung des Popovers) ist in Chrome 125+, Edge 125+, Firefox 147+ vollständig unterstützt. Für ältere Browser greift ein JS-Fallback (`getBoundingClientRect`).