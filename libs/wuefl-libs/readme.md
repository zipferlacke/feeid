# wuefl-libs

Eine Sammlung von wiederverwendbaren Web-Komponenten und Utilities. Jede Komponente ist so konzipiert, dass sie unabhängig voneinander eingesetzt werden kann.

---

## Komponenten

### Banner

Ein einfacher Banner für Pop-up-Benachrichtigungen, der am oberen Rand der Seite eingeblendet wird. Unterstützt die Typen `info`, `success`, `warning` und `error`. Benachrichtigungen verschwinden automatisch nach einer konfigurierbaren Zeit.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `banner/banner.js`
> `banner/banner.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

**Beispiel:**
```js
import { showBanner } from './banner/banner.js';

showBanner("Gespeichert!", "success", 4000);
showBanner("Etwas ist schiefgelaufen.", "error");
```

</details>

---

### CSS Styles

Eine Sammlung von CSS-Dateien, die grundlegende Styles, Resets, Layout-Komponenten und UI-Utilities bereitstellen. Alle Dateien sind in CSS-Layer organisiert (`reset`, `layout`, `components`, `defaults`, `custom`).

<details>
<summary>Nutzung & Beispiel</summary>

**Alle Styles auf einmal einbinden:**
```html
<link rel="stylesheet" href="css/import.css">
```

**Enthaltene Bereiche:**

| Bereich | Dateien |
| :--- | :--- |
| Reset | `css/reset/_reset.css` |
| Layout | `_header.css`, `_footer.css`, `_bottom_navigation.css`, `_sidemenu.css`, `_nav.css` |
| Components | `_form.css`, `_inputs.css`, `_card.css`, `_dialog.css`, `_container.css`, `_img.css`, `_audio_video.css`, `_details.css`, `_progress.css`, `_swipe.css`, `_loadingscreen.css` |
| UI / Defaults | `font.css`, `box_shadow.css`, `sizes.css`, `verticle.css` |
| Fonts | `google-icons-rounded.css` (Material Symbols Rounded) |

Einzelne Komponenten können auch direkt aus `css/components/` eingebunden werden.

</details>

---

### Datepicker

Ein Vanilla-JS-Datum- und Zeitpicker ohne externe Abhängigkeiten. Unterstützt Single- und Range-Modus, Zeitauswahl und flexible CSS-Variablen.

**→ [Vollständige Dokumentation](./datepicker/readme.md)**

---

### INP (Interactive Pages)

Macht klassisches Server-Side Rendering dynamisch: HTML-Links und Buttons laden Inhalte per Fetch im Hintergrund und öffnen sie als Modal oder aktualisieren Teile der aktuellen Seite — ohne Seiten-Reload.

**→ [Vollständige Dokumentation](./inp/readme.md)**

---

### JavaScript Utilities

Eine Sammlung allgemeiner JavaScript-Hilfsdateien.

<details>
<summary>Nutzung & Beispiel</summary>

| Datei | Beschreibung |
| :--- | :--- |
| `js/gestures.js` | Touch-Gesten-Erkennung (z.B. Swipe links/rechts) |
| `js/menu.js` | Funktionalität für Navigationsmenüs |
| `js/networkconnection.js` | Überprüft den Netzwerkstatus (online/offline) |
| `js/search.js` | Clientseitige Suchfunktion |
| `js/service-worker.js` | Basis-Service-Worker für Offline-Nutzung |
| `js/wnews-elements/` | Custom Elements für das `wnews`-Nachrichten-System |

**Beispiel:**
```js
import Gestures from './js/gestures.js';

const gestures = new Gestures(document.querySelector('.slideshow'));
gestures.onLeft(() => console.log('Swipe links'));
gestures.onRight(() => console.log('Swipe rechts'));
```

</details>

---

### QR Code Generator

Generiert QR-Codes clientseitig ohne externe Abhängigkeiten. Basiert auf einer minimierten Bibliothek.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `qrcode/qrcode-min.js`

```html
<script src="qrcode/qrcode-min.js"></script>

<div id="qrcode"></div>

<script>
  new QRCode(document.getElementById("qrcode"), {
    text: "https://example.com",
    width: 200,
    height: 200
  });
</script>
```

</details>

---

### Selectpicker

Eine moderne, barrierefreie Alternative zum nativen `<select>`-Element. Unterstützt Single- und Multiselect, Suchfunktion, Icons und flexible CSS-Variablen.

**→ [Vollständige Dokumentation](./selectpicker/readme.md)**

---

### Slideshow

Eine einfache Bilder-Slideshow-Komponente mit Punkt-Navigation, Pfeil-Navigation und Touch-Gesten-Unterstützung. Kann manuell oder automatisch betrieben werden.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `slideshow/slideshow.js`
> `slideshow/slideshow.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

```html
<div class="slideshow">
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</div>

<script type="module">
  import Slideshows from './slideshow/slideshow.js';

  const slideshows = new Slideshows(document, 4000);
  slideshows.runManuell();

  // Für automatisches Weiterschalten zusätzlich:
  // setInterval(() => slideshows.runAutomatic(), 500);
</script>
```

</details>

---

### User Dialog

Erstellt flexible modale Dialoge für Informationen, Bestätigungen oder Datei-Uploads. Interagiert mit dem Benutzer ohne Seiten-Reload.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `userDialog/userDialog.js`
> `userDialog/userDialog.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

**Für Uploads zusätzlich:** `userDialog/userDialogUpload.js`
> `userDialog/userDialogUpload_addon.css` muss im selben Verzeichnis liegen — wird automatisch geladen.

```js
import('./userDialog/userDialog.js').then(async (module) => {
  const userDialog = module.default;

  const result = await userDialog({
    title: "Löschen bestätigen",
    content: "Möchten Sie diesen Eintrag wirklich löschen?",
    confirmText: "Ja, löschen",
    cancelText: "Abbrechen",
    type: "warning"
  });

  if (result.submit) {
    console.log("Bestätigt.");
  } else {
    console.log("Abgebrochen.");
  }
});
```

**API Referenz:**

| Parameter | Typ | Standard | Beschreibung |
| :--- | :--- | :--- | :--- |
| `o.title` | `String` | — | **Pflicht.** Titel des Dialogs. |
| `o.content` | `String` | `""` | Inhaltstext (HTML erlaubt). |
| `o.confirmText` | `String` | — | **Pflicht.** Text des Bestätigungs-Buttons. |
| `o.cancelText` | `String` | — | Text des Abbrechen-Buttons. Ohne Angabe kein Abbrechen-Button. |
| `o.onlyConfirm` | `Boolean` | `false` | Nur ein OK-Button anzeigen. |
| `o.type` | `String` | `"normal"` | Farbschema: `normal`, `info`, `warning`, `error`. |
| `o.detailReturn` | `Boolean` | `true` | Steuert den Rückgabewert des Promises. |
| `o.onInsert` | `Function` | `null` | Callback nach dem Einfügen ins DOM. |
| `o.onSubmit` | `Function` | `null` | Callback vor dem Schließen. |

**Rückgabewert:** `Promise<{ submit: boolean, data: FormData }>`
- `submit`: `true` bei Bestätigung, sonst `false`.
- `data`: `FormData` mit allen Formular-Daten aus dem Dialog.

</details>
