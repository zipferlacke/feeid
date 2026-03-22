/**
 *  @typedef {Object} UserDialog
 * @property {boolean} submit - Gibt an ob der Dialog abgebrochen oder akzeptiert wurde
 * @property {Object} data - Alle Werte aus der HTML-form
 */

/**
 * Es wird ein Informationsdialog erstellt.
 * @param {Object} o - Parameterobjekt
 * @param {String} o.title - Titel des Dialogs 
 * @param {String} [o.content = ""] - weiterer Dialog Text (auch HTML)
 * @param {String} o.confirmText - Text der im Bestätigungsbutton steht.
 * @param {String} [o.cancelText] - Text der im Abbrechenknopf steht.
 * @param {boolean} [o.onlyConfirm = false] - Nutzer kann nur akteptieren. (default:false)
 * @param {"normal"|"info"|"warning"|"error"} [o.type = "normal"] - normal, error, warning, info (default:normal)
 * @param {boolean} [o.detailReturn = 0] - Boolen oder UserDialog zurückgegeben wird gegeben (deafult:true)
 * @param {function(dialog_id):void} [o.onInsert] - Funktion wird nach dem hinzufügen des Dialogs zur DOM ausgeführt (Dialog ist noch nicht sichtbar); 
 * @param {function(dialog_id, formData)} [o.onSubmit] - Funktion bei erfolgreicher Abgabe ausgeführt (bevor der Dialog geschlossen ist).
 * @returns {Promise<{submit:boolean, data:FormData}>} `boolean`, wenn die `detailReturn=false`, `Object, detailReturn=true`. 
 */

export function userDialog({
    title, 
    content = "", 
    confirmText, 
    cancelText="Abbrechen", 
    type = "normal", 
    onlyConfirm = false,
    detailReturn = true,
    onInsert = (dialog_id) => { }, 
    onSubmit = (dialog_id, formData) => { }
}) {
    /**
     * Dialog ID
     */
    const id = Date.now();
    injectCss();


    // ===
    // Dialog-Typ wird ausgewertet und ggf. werden Icons hinzugefügt
    // ===
    let image = "";
    switch (type) {
        case "warning":
            image = `<span class="msr info_img">warning</span>`;
            break;
        case "error":
            image = `<span class="msr info_img">warning</span>`;
            break;
        case "info":
            image = `<span class="msr info_img">info</span>`;
            break;
        default:
            break;
    }

    // ===
    // Eigentlicher Dialog wird erstellt und zur DOM hinzugefügt
    // ===
    const modal = `
    <dialog id="${id}" class="userDialog" data-dialog-type="${type}">
        <form novalidate>
            <div class="content">
                <header>${title}</header>
                ${image}
                <main>
                    ${content}
                </main>
            </div>
            <footer>
                <button class="button dialog_close" style="${onlyConfirm? "display:none":""}">${cancelText}</button>
                <button type="submit" class="button dialog_submit" data="images">${confirmText}</button>
            </footer>
        </form>
    </dialog>
    `;
    document.body.insertAdjacentHTML("beforeend", modal);
    const dialog = document.querySelector(`[id="${id}"]`);
    
    // ===
    // Vom Programierer übergebne Custom-Funktion wird ausgeführt.
    // ===
    onInsert(id);
    
    // ===
    // Dialog wird für den Nutzer sichtbar geschalten 
    // ===
    dialog.showModal();
    
    
    return new Promise((resolve) => {
        if (dialog.querySelector(".dialog_close") != null) {
            dialog.querySelector(".dialog_close").addEventListener("click", function () {
                dialog.remove();
                detailReturn ? resolve({submit:false, data:{}}) : resolve(false);
            });
        }

        dialog.querySelector(`form`).addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = tryToSubmit(dialog);
            onSubmit(id, formData);
            if(formData !== null) {
                dialog.close();
                dialog.remove();
                detailReturn ? resolve({submit:true, data:formData}) : resolve(true);
            }
        });

        dialog.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const formData = tryToSubmit(dialog);
                onSubmit(id, formData);
                if(formData !== null) {
                    dialog.close();
                    dialog.remove();
                    detailReturn ? resolve({submit:true, data:formData}) : resolve(true);
                }
            }
        });        
    });
}

/**
 * @param {HTMLDialogElement} dialog - Htmldialog der versucht werden soll erfolgreich zu schließen.
 * @returns {Object} Alle Werte der Form werden zurück gegeben. 
 */
function tryToSubmit(dialog){
    const form = dialog.querySelector(`form`)
    // Überprfung, ob form valide ist
    if(!validateForm(form)){
        form.querySelector(`:invalid`).setAttribute("active", "");
        form.querySelector(`:valid`).removeAttribute("active");
        return null;
    }
    const formData = new FormData(form);
    
    form.querySelectorAll('input[type="checkbox"][data-shape="toggle"]').forEach(cb => {
        formData.set(cb.name, cb.checked ? "true" : "false");
    });

    //Form Daten werden als Object extrahiert
    const data = {};
    const processedKeys = new Set();

    for (let [key, val] of formData.entries()) {
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        const rawValues = formData.getAll(key);
        const allConvertible = rawValues.every(v => {
            if (v === "true" || v === "false") return true; // Booleans sind okay
            if (v !== "" && !isNaN(v)) return true;         // Zahlen sind okay
            return false;                                   // Alles andere (Strings) nicht
        });

        const allValues = allConvertible 
            ? rawValues.map(v => {
                if (v === "true") return true;
                if (v === "false") return false;
                return Number(v);
            }) 
            : rawValues;

        const rootKey = key.split('[')[0];
        const matches = [...key.matchAll(/\[(.*?)\]/g)].map(m => m[1]);

        const element = dialog.querySelector(`[name="${key}"]`);
        const isMultiple = element && (element.multiple || (element.type === 'checkbox' && !element.dataset.shape == "toggle")) ;
        if (matches.length === 0) {
            if (isMultiple) {
                // Bei Multiple-Select oder Checkboxen IMMER ein Array, auch wenn leer oder nur 1 Wert
                data[rootKey] = allValues;
            } else {
                // Bei normalen Inputs/Selects: Einzelwert (oder null/leer)
                data[rootKey] = allValues.length > 0 ? allValues[0] : "";
            }
            continue;
        }

        // Wurzel initialisieren
        if (!data[rootKey]) {
            data[rootKey] = (matches[0] === "" || !isNaN(matches[0])) ? [] : {};
        }

        // Jetzt verteilen wir jeden Wert aus allValues an die richtige Stelle im Baum
        allValues.forEach((value, index) => {
            let current = data[rootKey];
            
            for (let i = 0; i < matches.length; i++) {
                const p = matches[i];
                const isLast = i === matches.length - 1;

                // Logik für targetKey:
                // Wenn p leer ist, nutzen wir den 'index' aus allValues, 
                // um die Werte der verschiedenen Felder (id, transSemi) zu synchronisieren.
                let targetKey = p === "" ? index : p;

                if (isLast) {
                    current[targetKey] = value;
                } else {
                    const nextP = matches[i + 1];
                    if (!current[targetKey]) {
                        current[targetKey] = (nextP === "" || !isNaN(nextP)) ? [] : {};
                    }
                    current = current[targetKey];
                }
            }
        });
    }
    return data;
}


function validateForm(form){
    let valid = true;
    [...form.querySelectorAll('input[required], select[required], textarea[required]')].every(input => {
        // Überprüfen, ob das Eingabefeld oder sein übergeordnetes Element ausgeblendet ist
        if(!isVisible(input)) return true;

        if (!input.checkValidity()) {
            input.reportValidity(); // Zeigt native Validierungsmeldung an
            
            valid = false;
            return false;
        }
        return true;
    });
    return valid;
}

function isVisible(element) {
    // Überprüfen, ob das Element oder eines seiner übergeordneten Elemente ausgeblendet ist
    while (element) {
        if (window.getComputedStyle(element).display === 'none') {
        return false;
        }
        element = element.parentElement;
    }
    return true;
}

function injectCss(){
    const cssUrl = new URL('./userDialog.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return; 
    const cssLink = `<link rel="stylesheet" href="${cssUrl.href}">`;
    document.head.insertAdjacentHTML("beforeend", cssLink);
}