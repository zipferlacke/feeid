document.addEventListener("click", async (e) =>{
    // 1. Prüfen, ob ein InP-Element geklickt wurde
    
    const trigger = e.target.closest('[data-inp-typ]');
    if (!trigger) return;

    const typ = trigger.getAttribute('data-inp-typ') || 'update'; // Fallback auf update
    const href = trigger.getAttribute('data-href') || trigger.getAttribute('href'); // Fallback auf normales href
    const target = trigger.getAttribute('data-target');
    const extract = trigger.getAttribute('data-extract');

    // 2. Logik für das Modal
    if (typ === 'modal') {
        e.preventDefault();
        await createModal(typ, href, target, extract, trigger);
    }

    // 3. Logik für den Schließen-Button
    if (typ === 'close-btn') {
        e.preventDefault();
        await closeModal(typ, href, target, trigger);
    }

    // 4. Logik für den Submit-Button
    if (typ === 'submit-btn') {
        e.preventDefault();
        
       await submitModalForm(typ, href, target, trigger);
    }
});

async function createModal (typ, href, target, extract, trigger){
    if (!href) {
        console.error("InP: Kein data-href oder href für das Modal angegeben.");
        return;
    }
    
    try {
        // HTML abrufen
        const response = await fetch(href);
        const htmlString = await response.text();

        // Aus dem String ein echtes DOM-Dokument machen
        const parser = new DOMParser();
        const fetchedDoc = parser.parseFromString(htmlString, 'text/html');

        //Dialog erstellen
        let dialogElement = document.createElement('dialog');
        dialogElement.classList.add("inp-modal");
        const dialogID = new Date().getTime();
        dialogElement.id = dialogID;
        dialogElement.insertAdjacentHTML('beforeend', `<style>${dialogStyle}</style>`);

        // Dialog Inhalt einfügen
        let dialogContent = null;
        if (extract) {
            dialogContent = fetchedDoc.querySelector(extract);
            if(!dialogContent) {
                console.warn(`InP: Kein HTMl Element gefunden mit dem Extract-Selektor: ${extract} in ${href}`);
            }
        }
        if(dialogContent){
            dialogElement.appendChild(dialogContent.cloneNode(true));
        }else{
            Array.from(fetchedDoc.body.childNodes).forEach(child => {
                dialogElement.appendChild(child.cloneNode(true));
            });
        }        

        if (target) {
            dialogElement.setAttribute('data-target', target);
        }

        fetchedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(oldStyle => {
            const href = oldStyle.getAttribute('href');
            const content = oldStyle.textContent.trim();

            // 1. Check: Existiert das Stylesheet bereits GLOBAL (auf der Hauptseite)?
            // Nur bei externen Dateien (link) sinnvoll
            if (href && document.querySelector(`link[href="${href}"]`)) return;

            // 2. Check: Existiert es bereits LOKAL im Dialog (durch innerHTML kopiert)?
            const existingInDialog = Array.from(dialogElement.querySelectorAll('link, style')).find(s => 
                href ? s.getAttribute('href') === href : s.textContent.trim() === content
            );

            // 3. Wenn es noch gar nicht da ist: Anhängen
            if (!existingInDialog) {
                dialogElement.appendChild(oldStyle.cloneNode(true));
            }
        });

        // Js extrahieren
        fetchedDoc.querySelectorAll('script[src]').forEach(oldScript => {
            const src = oldScript.getAttribute('src');
            // 1. Check Hauptseite
            if (document.querySelector(`script[src="${src}"]`)) return;
            
            // 2. Check ob bereits im Dialog (toter Platzhalter)
            const existingInDialog = dialogElement.querySelector(`script[src="${src}"]`);
            
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach(a => newScript.setAttribute(a.name, a.value));

            if (existingInDialog) {
                existingInDialog.replaceWith(newScript);
            } else {
                dialogElement.appendChild(newScript);
            }
        
        });
        // 3. INLINE: Sammeln, im Dialog LÖSCHEN und dann ausführen
        let combinedInlineJS = "";
        const modulesToLoad = [];

        fetchedDoc.querySelectorAll('script:not([src])').forEach(scr => {
            if (scr.type === 'module') {
                // document über schreiben
                let scriptContent = scr.textContent;
                
// 1. Imports extrahieren (wie gehabt)
const importRegex = /import\s+[\s\S]*?from\s+(['"].*?['"])\s*;?/gm;
let match;
let lastIndex = 0;
while ((match = importRegex.exec(scriptContent)) !== null) {
    lastIndex = importRegex.lastIndex;
}

const imports = scriptContent.slice(0, lastIndex);
const userCode = scriptContent.slice(lastIndex);

// 2. DIE KORRIGIERTE INJECTION
// Wir benennen den Parameter 'doc' und weisen ihn INTERN 'document' zu.
// Das 'let document' im lokalen Funktions-Scope ist erlaubt!
const injectionStart = `
const __MODAL = document.querySelector('.inp-modal[id="${dialogID}"]');
const __PROXY = new Proxy(__MODAL, {
    get(target, prop) {
        if (['querySelector', 'querySelectorAll', 'getElementsByClassName', 'getElementsByTagName'].includes(prop)) {
            return target[prop].bind(target);
        }
        if (prop === 'getElementById') {
            return (id) => target.querySelector('#' + id);
        }
        let val = prop in target ? target[prop] : window.document[prop];
        return typeof val === 'function' ? val.bind(prop in target ? target : window.document) : val;
    },
    set(target, prop, value) {
        if (prop in target) target[prop] = value;
        else window.document[prop] = value;
        return true;
    }
});

(function(doc, modal) { 
    const document = doc; // HIER passiert die Magie, ohne den Top-Level Parser zu nerven
`;

const injectionEnd = `\n}).call(__MODAL, __PROXY, __MODAL);`;

const finalModuleContent = imports + "\n" + injectionStart + "\n" + userCode + "\n" + injectionEnd;

                modulesToLoad.push(finalModuleContent);
            } else {
                // NORMAL: Ab in die Sandbox-Sammlung
                combinedInlineJS += "\n" + scr.textContent;
            }
            scr.remove();
        });

        if (combinedInlineJS) {
            try {
                const sandbox = new Function('document', combinedInlineJS);
                sandbox.call(dialogElement, dialogElement);
            } catch (e) {
                console.error("InP: Fehler im Inline-JS", e);
            }
        }

        modulesToLoad.forEach(content => {
            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const scriptTag = document.createElement('script');
            scriptTag.type = 'module';
            scriptTag.src = url;
            
            // Nach dem Laden aufräumen, um Speicher zu sparen
            // scriptTag.onload = () => URL.revokeObjectURL(url);
            
            dialogElement.appendChild(scriptTag);
        });

        // Dialog wird aus Dom nach schließen entfernt
        dialogElement.addEventListener('close', () => {dialogElement.remove(); });

        // Das Modal ans Ende der aktuellen Seite hängen und öffnen
        document.body.appendChild(dialogElement);
        dialogElement.showModal();

    } catch (error) {
        console.error("InP: Fehler beim Laden des Modals:", error);
    }
}

async function submitModalForm(typ, href, target, trigger){
    const form = trigger.closest('form');
    const dialog = trigger.closest('dialog');
    const targetSelector = target || (dialog ? dialog.getAttribute('data-target'): null);

    if (!form) {
        console.error("InP: Kein Formular/Form für den submit-btn gefunden.");
        return;
    }

    // Formulardaten sammeln
    const action = form.getAttribute('action') || window.location.href;
    const method = form.getAttribute('method') || 'POST';
    const formData = new FormData(form);

    try {
        // 4.1 Formular absenden
        let fetchOptions = {
            method: method.toUpperCase(),
            redirect: 'follow',
            body: null
        };

        let fetchUrl = action;

        if (method.toUpperCase() === 'POST') {
            fetchOptions.body = formData;
        } else {
            const queryString = new URLSearchParams(formData).toString();
            if (queryString) {
                // Prüfen, ob die URL schon ein ? hat (z.B. seite.php?id=1)
                const separator = fetchUrl.includes('?') ? '&' : '?';
                fetchUrl += separator + queryString;
            }
        }

        let response = await fetch(fetchUrl, fetchOptions);

        let htmlString = await response.text();
        let finalUrl = null;
        
        if (response.redirected) { // php header()
            finalUrl = response.url;
        } else { // Test ob meta Tag oder script redirect vorliegt
            const parser = new DOMParser();
            const tempDoc = parser.parseFromString(htmlString, 'text/html');

            // 1. Suche nach Meta-Refresh (NUR im echten DOM, Kommentare werden ignoriert!)
            const metaRefresh = tempDoc.querySelector('meta[http-equiv="refresh"]');
            if (metaRefresh) {
                const content = metaRefresh.getAttribute('content');
                // Extrahiert die URL aus "0; url=meine-seite.html"
                const part = content.split(/url=/i)[1]; // Großschreibung ignoriert
                if (part) finalUrl = part.trim().replace(/['"]/g, ''); // Entfernt evtl. Anführungszeichen
            }

            // 2. Suche nach script Weiterleitung 
            if(!finalUrl){
                const scripts = tempDoc.querySelectorAll('script'); 
                for (let script of scripts) {
                    let code = script.textContent;

                    // Entfernt /* block kommentare */ (auch über mehrere Zeilen)
                    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
                    // Entfernt // einzeilige Kommentare
                    code = code.replace(/\/\/.*/g, '');

                    // 3. Jetzt erst nach dem Redirect suchen
                    const ultraRegex = /(?:(?:window|document)\.)?(?:location(?:\.href|\.replace)?|open)\s*(?:=|(?:\())\s*['"`]([^'"`\s\)]+)['"`](?:\s*,\s*['"]_self['"])?/i;                    const jsMatch = code.match(ultraRegex);
                    
                    if (jsMatch && jsMatch[1]) {
                        finalUrl = jsMatch[1];
                        break; // Ersten gefundenen Redirect nehmen
                    }
                }
            }
        }

        // Wenn wir weitergeleitet wurden, müssen wir die echte Zielseite laden
        if (finalUrl) {
            const finalResponse = await fetch(finalUrl);
            htmlString = await finalResponse.text();
        }

        // 4.3 Die Hauptseite aktualisieren (`data-target`)
        if (targetSelector) {
            const parser = new DOMParser();
            const fetchedDoc = parser.parseFromString(htmlString, 'text/html');
            
            const newContent = fetchedDoc.querySelector(targetSelector) || fetchedDoc.body || fetchedDoc;
            const oldContent = document.querySelector(targetSelector);

            if (oldContent) {
                // Ersetzt das alte Element komplett durch das neue
                if(fetchedDoc.querySelector(targetSelector)){
                    oldContent.replaceWith(newContent);
                }else{
                    oldContent.innerHTML = '';
                    while (newContent.firstChild) {
                        oldContent.appendChild(newContent.firstChild);
                    }
                }
            } else {
                console.warn(`InP: Element mit Selektor "${targetSelector}" nicht gefunden, was soll ersetzt werden? Im Dokument`)
            }
        }else{
            window.location.href = finalUrl
        }

        // 4.4 Dialog schließen, wenn alles fertig ist
        if (dialog) dialog.close();

    } catch (error) {
        console.error("InP: Fehler beim Formular-Submit:", error);
    }
}

async function closeModal(typ, href, target, trigger){
    const dialog = trigger.closest('dialog');
    if (dialog) dialog.close(); // Löst auch das 'close' Event aus, das den Dialog löscht
    return;
}

let dialogStyle=`
:root {
  /* Light Mode (Standard) */
  --inp-bg: #ffffff;
  --inp-text: #1a1a1a;
  --inp-border: #e0e0e0;
  --inp-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --inp-backdrop: rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark Mode */
    --inp-bg: #1e1e1e;
    --inp-text: #f0f0f0;
    --inp-border: #333333;
    --inp-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    --inp-backdrop: rgba(0, 0, 0, 0.6);
  }
}

.inp-modal[open] {
  padding: 1.5rem;
  border: 0;
  border-radius: 1rem;
  background-color: var(--inp-bg);
  box-shadow: var(--inp-shadow);
  align-self: center;
  justify-self: center;
  
  /* Damit das Modal geschmeidig erscheint */
  animation: inp-fade-in 0.2s ease-out;
  max-width: 90vw; /* Standardbreite */
  max-height: 90vh; /* Standardhöhe */
  overflow: auto;
}

/* Der Hintergrund (Backdrop) */
.inp-modal[open]::backdrop {
  background: var(--inp-backdrop);
  backdrop-filter: blur(8px); 
}

/* Kleine Animation für das "Ploppen" */
@keyframes inp-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
`;