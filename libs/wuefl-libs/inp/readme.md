# InP — Interactive Pages

Macht klassisches Server-Side Rendering dynamisch: Normale HTML-Links und Buttons laden Inhalte per Fetch im Hintergrund und öffnen sie als Modal oder aktualisieren Teile der aktuellen Seite — ohne Seiten-Reload.

---

## Installation

```html
<script src="inp_v1_0_0.js" type="module"></script>
```

Kein Build-Schritt, keine Abhängigkeiten. InP setzt sich nach dem Laden automatisch als globaler Klick-Handler.

---

## Attribute

### `data-inp-typ`

Pflichtattribut auf jedem InP-Element. Steuert das Verhalten beim Klick.

| Wert | Beschreibung | Voraussetzung |
|---|---|---|
| `modal` | Lädt die Zielseite und öffnet sie als nativen `<dialog>`. CSS und JS der Zieldatei werden isoliert ausgeführt. | `href` oder `data-href` |
| `update` | Standard-Typ. Lädt die Zielseite und ersetzt das Element, das in `data-target` angegeben ist. | `data-target` |
| `submit-btn` | Sendet das umgebende `<form>` per Fetch ab, aktualisiert optional `data-target` und schließt den Dialog. | muss in einem `<form>` liegen |
| `close-btn` | Schließt den umgebenden Dialog ohne weitere Aktion (Abbruch). | muss in einem `<dialog>` liegen |

### `data-href`

Alternative zu `href` für Nicht-Link-Elemente (z.B. `<button>`). InP prüft zuerst `data-href`, dann `href`.

```html
<button data-inp-typ="modal" data-href="detail.html">Öffnen</button>
```

### `data-extract`

CSS-Selektor, der festlegt welcher Teil der **Zielseite** in den Modal geladen wird. Ohne dieses Attribut wird der gesamte `<body>` der Zielseite verwendet.

```html
<!-- Nur #form-area der Zieldatei wird im Modal gezeigt -->
<a href="login.html" data-inp-typ="modal" data-extract="#form-area">Login</a>
```

### `data-target`

CSS-Selektor, der festlegt welches Element auf der **aktuellen Seite** nach einem Submit oder Update ersetzt wird. Existiert das Element auch in der Server-Antwort, wird es dort herausgeschnitten und eingefügt. Andernfalls wird der gesamte Antwort-Body verwendet.

```html
<a href="add-user.php" data-inp-typ="modal" data-target="#user-list">Hinzufügen</a>
```

---

## Beispiele

### Einfacher Modal

```html
<a href="information.html" data-inp-typ="modal">Informationen</a>

<!-- Oder mit Button -->
<button data-inp-typ="modal" data-href="information.html">Informationen</button>
```

### Gezielte Extraktion

Wenn die Zieldatei Header, Footer und Navigation hat, die im Modal nicht gebraucht werden:

```html
<!-- Hauptseite -->
<button data-inp-typ="modal"
        data-href="login.html"
        data-extract="#form-area">Login</button>

<!-- login.html — nur #form-area wird in den Modal geladen -->
<header>Wird ignoriert</header>
<main>
  <section id="form-area">
    <form>
      <input type="text" placeholder="Nutzername">
      <input type="password" placeholder="Passwort">
      <a data-inp-typ="close-btn">Abbrechen</a>
      <button data-inp-typ="submit-btn">Einloggen</button>
    </form>
  </section>
</main>
<footer>Wird ignoriert</footer>
```

### Partielle Updates nach Submit

Nach dem Submit wird nur der angegebene Bereich der Seite aktualisiert:

```html
<!-- Hauptseite -->
<ul id="user-list">
  <li>Max Mustermann</li>
</ul>

<a href="add-user.php"
   data-inp-typ="modal"
   data-target="#user-list">Nutzer hinzufügen</a>

<!-- add-user.php — Formular im Modal -->
<form action="save-user.php" method="post">
  <input type="text" name="name" placeholder="Name">
  <button data-inp-typ="submit-btn">Speichern</button>
</form>

<!-- save-user.php gibt die aktualisierte Liste zurück -->
<!-- InP sucht #user-list in der Antwort und tauscht sie aus -->
<ul id="user-list">
  <li>Max Mustermann</li>
  <li>Erika Musterfrau</li>
</ul>
```

### Redirect-Handling

InP erkennt Server-Redirects automatisch — via PHP `header()`, Meta-Refresh oder JavaScript `location.href`. Wenn kein `data-target` gesetzt ist und ein Redirect erkannt wird, wird die Hauptseite dorthin navigiert.

```php
/* PHP */
header("Location: dashboard.php");
exit();
```

---

## Modal-Styling

Der von InP erzeugte `<dialog>` hat die Klasse `inp-modal` und bringt ein eingebettetes Standard-Styling mit. Dieses kann über CSS-Variablen überschrieben werden:

```css
:root {
  --inp-bg:       #ffffff;       /* Modal-Hintergrund */
  --inp-text:     #1a1a1a;       /* Textfarbe */
  --inp-border:   #e0e0e0;       /* Rahmenfarbe */
  --inp-shadow:   0 10px 25px …; /* Box-Shadow */
  --inp-backdrop: rgba(0,0,0,.3);/* Backdrop-Farbe */
}
```

Dark Mode wird automatisch via `@media (prefers-color-scheme: dark)` unterstützt.

---

## JS-Isolation im Modal

Inline-Skripte der Zieldatei werden isoliert ausgeführt: `document`-Aufrufe (`querySelector`, `getElementById` usw.) werden auf den Modal-Scope umgeleitet, sodass sie nur Elemente innerhalb des Dialogs statt der Hauptseite manipulieren.

ES-Module (`type="module"`) werden dabei über einen Proxy korrekt behandelt, ohne den Top-Level-Parser der Hauptseite zu beeinflussen.

---

## Browser-Support

InP nutzt die native `<dialog>`-API (Chrome 98+, Firefox 98+, Safari 15.4+) sowie `fetch`, `DOMParser` und `FormData` — alles modern unterstützte APIs ohne Polyfill-Bedarf.