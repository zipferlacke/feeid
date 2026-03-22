# SelectPicker

Leichtgewichtiger, barrierefreier Custom-Select-Picker ohne externe Abhängigkeiten. Unterstützt Single- und Multiselect, Suchfunktion, Icons, Sprachsteuerung und flexible CSS-Variablen.

---

## Installation

```html
<script type="module">
  import { SelectPicker } from './selectpicker_v1_0_0.js';
</script>
```

Das CSS wird automatisch nachgeladen — `selectpicker_v1_0_0.css` muss im selben Verzeichnis liegen.

---

## Schnellstart

```html
<select id="meinSelect">
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</select>

<script type="module">
  import { SelectPicker } from './selectpicker_v1_0_0.js';

  const selectpicker = new SelectPicker({});
  selectpicker.create(document.getElementById('meinSelect'), {
    title: 'Option wählen'
  });
</script>
```

Das originale `<select>` wird ausgeblendet und durch ein interaktives Trigger-Element ersetzt. Wert-Änderungen werden als normales `change`-Event gefeuert — vollständig kompatibel mit Formularen.

---

## Konfiguration

### `new SelectPicker(config)`

| Parameter | Typ | Beschreibung |
|---|---|---|
| `config.lang` | `string` | Startsprache: `'de'` oder `'en'`. Standard: Auto-Detect via Browser. |
| `config.translations` | `Object` | Eigene Übersetzungen für Buttons und Platzhalter. |
| `config.options` | `Object` | Globale Optionen für alle Picker dieser Instanz. |

**Eigene Übersetzungen:**
```js
const selectpicker = new SelectPicker({
  lang: 'de',
  translations: {
    de: {
      save:        "Speichern",
      cancel:      "Abbrechen",
      search:      "Suche...",
      search_nodata: "Keine Daten...",
      reset:       "Zurücksetzen",
      empty:       "Nichts gewählt..."
    },
    en: {
      save:        "Save",
      cancel:      "Cancel",
      search:      "Search...",
      search_nodata: "Nothing found...",
      reset:       "Reset",
      empty:       "Nothing selected..."
    }
  }
});
```

---

### `selectpicker.create(selectElement, options)`

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `title` | `string \| {de, en}` | `"Option wählen"` | Titel im Popover-Header. Kann mehrsprachig sein. |
| `group` | `string` | `"default"` | Name der Style-Gruppe (via `createGroup`). |
| `search` | `boolean` | `true` | Suchfeld anzeigen. |
| `saveButton` | `boolean` | `false` | Speichern-Button anzeigen (empfohlen bei Multiselect). |

---

## CSS-Variablen

Alle visuellen Aspekte sind über CSS Custom Properties steuerbar. Die internen Abstufungen (`--_clr-*`) werden automatisch aus den drei Basisfarben berechnet:

```css
:root {
  /* Basisfarben — diese überschreiben */
  --clr-picker:          hsl(0,0%,90%);    /* Hintergrund Popover */
  --clr-picker-trigger:  hsl(0,0%,90%);    /* Hintergrund Trigger */
  --clr-picker-input:    hsl(219,100%,50%); /* Akzentfarbe Buttons & Auswahl */

  /* Größen */
  --fs-picker-header:    1rem;   /* Schriftgröße Titel */
  --fs-input-picker:     0.9rem; /* Schriftgröße Optionen & Input */
  --br-picker:           0.5rem; /* Border-Radius überall */
  --height-input-picker: 2rem;   /* Höhe Buttons & Suchfeld */
}
```

Light/Dark Mode wird automatisch via `light-dark()` unterstützt.

---

## Icons

Jede `<option>` kann über `data-icon` ein Icon erhalten. Unterstützt werden Material Symbol Namen **und** beliebige SVG-Strings:

```html
<!-- Material Symbol Ligatur-Name -->
<option value="home" data-icon="home">Startseite</option>

<!-- Eigenes SVG -->
<option value="x" data-icon='<svg viewBox="0 0 24 24">...</svg>'>Eigenes Icon</option>
```

---

## Standardwerte & Reset

Mit `data-default` werden feste Reset-Werte definiert. Der Reset-Button erscheint nur wenn dieses Attribut gesetzt ist:

```html
<select id="multi" multiple data-default='["a","b"]'>
  <option value="a" selected>Alpha</option>
  <option value="b" selected>Beta</option>
  <option value="c">Gamma</option>
</select>
```

---

## Mehrsprachige Titel

```js
selectpicker.create(selectElement, {
  title: { de: 'Sprache wählen', en: 'Choose language' }
});
```

---

## Die SelectInstance (API)

`selectpicker.create()` gibt ein Objekt zurück:

| Methode / Eigenschaft | Beschreibung |
|---|---|
| `instance.open()` | Öffnet das Popover programmatisch. |
| `instance.close()` | Schließt den Picker (ohne Speichern). |
| `instance.saveAndClose()` | Speichert die Auswahl und schließt. |
| `instance.reset()` | Setzt auf Standardwerte zurück. |
| `instance.isOpen` | `true` wenn das Popover geöffnet ist. |
| `instance.isMulti` | `true` bei `multiple` Select. |
| `instance.tempValue` | Aktuell gewählte Werte (vor dem Speichern). |
| `instance.defaultValues` | Die definierten Standardwerte. |
| `instance.originalSelect` | Referenz auf das originale `<select>`. |

**Auf Änderungen reagieren:**
```js
document.getElementById('meinSelect').addEventListener('change', (e) => {
  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
  console.log('Ausgewählt:', selected);
});
```

---

## CSS-Klassen (intern)

Alle Klassen des SelectPickers tragen das Präfix `sp_` und sind vollständig von anderen Bibliotheken isoliert:

| Klasse | Element |
|---|---|
| `sp_trigger` | Trigger-Button (ersetzt das `<select>`) |
| `sp_popover` | Das Dropdown-Popover |
| `sp_header` / `sp_title` / `sp_actions` | Kopfzeile des Popovers |
| `sp_btn` / `sp_btn_close` / `sp_btn_reset` / `sp_btn_save` | Aktions-Buttons |
| `sp_search` | Suchfeld |
| `sp_content` | Optionen-Liste |
| `sp_option` / `sp_selected` / `sp_option_hidden` | Einzelne Option |
| `sp_chip` / `sp_single_value` / `sp_placeholder` | Trigger-Inhalt |
| `sp_msr` | Material Symbols Icon |

---

## CSS-Layer & Robustheit

Das CSS liegt in `@layer components`. Globale Seiten-Resets (`* { padding: 0 }`) können den Layer überschreiben. Um das zu verhindern, pack deinen Reset ebenfalls in einen Layer:

```css
@layer resets, components;
@layer resets {
  * { padding: 0; margin: 0; box-sizing: border-box; }
}
```

---

## CSS Anchor Positioning

Wenn der Browser CSS Anchor Positioning unterstützt (Chrome 125+, Firefox 147+), wird die Position rein per CSS gesteuert. Ältere Browser erhalten automatisch einen JS-Fallback.

---

## Barrierefreiheit

- Trigger ist per `Tab` fokussierbar, öffnet mit `Enter` / `Space`
- Originales `<select>` bleibt im DOM (`display:none`) — Formulare und Screenreader funktionieren weiter
- Suchfeld erhält nach dem Öffnen automatisch den Fokus
- Klick außerhalb schließt automatisch