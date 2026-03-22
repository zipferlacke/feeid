/**
 * @typedef {Object} TranslationSet
 * @property {string} [de] - Deutscher Text
 * @property {string} [en] - Englischer Text
 */

/**
 * @typedef {Object} BaseConfig
 * @property {string} [lang='de'] - Die Initial-Sprache (z.B. 'de', 'en'). Default: Auto-Detect.
 * @property {Object.<string, TranslationSet>} [translations] - Eigene Übersetzungen für Buttons etc.
 */

/**
 * BASIS KLASSE
 * Verwaltet Styles, Sprachen und allgemeine Popover-Mechaniken.
 */
class PickerBase {
    /**
     * Erstellt die Basis-Instanz.
     * @param {BaseConfig} config
     */
    constructor(config = {}) {
        this.translations = config.translations || {
            de: { save: "Speichern", cancel: "Abbrechen", search: "Suche...", search_nodata: "Keine Daten ...", reset: "Zurücksetzen", empty: "Nichts gewählt..." },
            en: { save: "Save",      cancel: "Cancel",    search: "Search...", search_nodata: "Nothing found ...", reset: "Reset",          empty: "Nothing selected..." }
        };

        const browserLang = navigator.language.split('-')[0];
        this.lang  = config.lang || (this.translations[browserLang] ? browserLang : 'en');
        this.txt   = this.translations[this.lang];
        this.groups = {};
        this.injectCss();
    }

    /**
     * Definiert eine Styling-Gruppe.
     * @param {string} groupName   - Der Name der Gruppe (wird bei create() verwendet).
     * @param {string} customClass - CSS-Klasse, die dem Popover hinzugefügt wird.
     */
    createGroup(groupName, customClass) {
        this.groups[groupName] = customClass;
    }

    /**
     * Helfer: Holt Text basierend auf Sprache.
     * Akzeptiert String oder Objekt {de: "...", en: "..."}
     * @param {string|TranslationSet} input
     */
    resolveLangString(input) {
        if (typeof input === 'string') return input;
        if (typeof input === 'object') {
            return input[this.lang] || input['en'] || Object.values(input)[0] || '';
        }
        return '';
    }

    t(key) { return this.txt[key] || key; }

    injectCss() {
        const cssUrl = new URL('./selectpicker_v1_0_0.css', import.meta.url);
        if (document.querySelector(`link[href="${cssUrl.href}"]`)) return;
        document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${cssUrl.href}">`);
    }
}

/**
 * @typedef {Object} SelectPickerOptions
 * @property {string|TranslationSet} [title]       - Überschrift des Pickers (String oder {de:'..', en:'..'}).
 * @property {string}  [group='default']            - Name der Style-Gruppe (siehe createGroup).
 * @property {boolean} [search=true]                - Soll das Suchfeld angezeigt werden?
 * @property {boolean} [saveButton=false]           - Soll ein Speicherknopf angezeigt werden?
 */

/**
 * @typedef {Object} SelectInstance
 * @property {string}           id               - ID für den Picker
 * @property {HTMLSelectElement} originalSelect  - Das originale <select>-Element
 * @property {HTMLElement}      triggerElm       - Das Trigger-Element
 * @property {HTMLElement}      popover          - Das Popover-Element
 * @property {boolean}          isOpen           - Ob der Picker geöffnet ist
 * @property {boolean}          existDefaultData - Ob Standardwerte vorhanden sind
 * @property {boolean}          isMulti          - Ob Multiselect aktiv ist
 * @property {string}           group            - Name der Style-Gruppe
 * @property {string[]}         tempValue        - Aktuell ausgewählte Werte (vor dem Speichern)
 * @property {string[]}         defaultValues    - Liste der Standardwerte
 * @property {Function}         open             - Öffnet den Picker
 * @property {Function}         close            - Schließt den Picker
 * @property {Function}         saveAndClose     - Speichert und schließt den Picker
 * @property {Function}         reset            - Setzt den Picker zurück
 */

/**
 * SPEZIALISIERTE KLASSE
 * Für Select und Multiselect Inputs.
 */
export class SelectPicker extends PickerBase {
    /** @type {SelectInstance[]} */
    activePickers;
    globalConfig = {
        search:     true,
        saveButton: false,
        group:      "default",
    };

    /**
     * Erstellt ein SelectPicker-Objekt.
     * @param {{options?: Object, translations?: Object}} config
     */
    constructor(config) {
        super(config);
        this.activePickers = [];
        this.globalConfig  = {
            ...this.globalConfig,
            ...(config?.options || {})
        };
        document.addEventListener('click', (e) => this.#handleGlobalClick(e));
    }


    #handleGlobalClick(e) {
        for (const instance of this.activePickers) {
            const clickedInside      = e.composedPath().includes(instance.popover);
            const clickedTrigger     = instance.triggerElm.contains(e.target);
            const clickedHiddenInput = instance.originalSelect.contains(e.target); // z.B. durch Label oder JS vom Nutzer

            if (!clickedInside && !clickedTrigger && !clickedHiddenInput) {
                if (instance.isOpen) { instance.saveAndClose(); }
                continue;
            }

            if (clickedTrigger || clickedHiddenInput) { instance.open(instance); continue; }

            if (clickedInside) {
                if (e.target.closest('.sp_btn_close')) { instance.close();        continue; }
                if (e.target.closest('.sp_btn_reset')) { instance.reset();        continue; }
                if (e.target.closest('.sp_btn_save'))  { instance.saveAndClose(); continue; }
            }
        }
    }

    /**
     * Erstellt einen Picker für ein existierendes HTML-Select-Element.
     * @param {HTMLSelectElement}   selectElement - Das originale <select>-Element.
     * @param {SelectPickerOptions} options       - Konfiguration für diesen Picker.
     * @returns {SelectInstance}
     */
    create(selectElement, options = {}) {
        if (!selectElement) return null;

        options = {
            ...this.globalConfig,
            ...(options || {})
        };

        const groupName      = options.group;
        const showSearch     = options.search;
        const showSaveButton = options.saveButton;
        const title          = this.resolveLangString(options.title || "Option wählen");

        /** @type {SelectInstance} */
        const instance = {
            id:               'sp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            originalSelect:   selectElement,
            isMulti:          selectElement.multiple,
            group:            groupName,
            isOpen:           false,
            existDefaultData: false,
            tempValue:        [],
            triggerElm:       null,
            popover:          null,
            defaultValues:    [],

            open:         () => this.openPicker(instance),
            close:        () => this.closePicker(instance),
            saveAndClose: () => this.savePicker(instance),
            reset:        () => this.resetPicker(instance)
        };

        const observer = new MutationObserver(() => {
            this.#updateTriggerRender(instance);
        });
        observer.observe(instance.originalSelect, { subtree: true, childList: true });

        selectElement.style.display = 'none';
        this.#readInitialValues(instance);

        // Trigger-Element erstellen
        instance.triggerElm                    = document.createElement('div');
        instance.triggerElm.className          = 'sp_trigger';
        instance.triggerElm.tabIndex           = 0;
        instance.triggerElm.style.anchorName   = `--${instance.id}`;

        this.#updateTriggerRender(instance);

        // Barrierefreiheit: Enter/Space öffnet
        instance.triggerElm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                instance.open();
            }
        });

        selectElement.insertAdjacentElement("afterend", instance.triggerElm);
        this.#buildPopover(instance, showSearch, showSaveButton, title);
        this.activePickers.push(instance);
        return instance;
    }

    /**
     * Liest die definierten Startwerte ein.
     * @param {SelectInstance} instance
     */
    #readInitialValues(instance) {
        const defaultAttr = instance.originalSelect.dataset.default;
        if (defaultAttr) {
            instance.defaultValues    = JSON.parse(defaultAttr);
            instance.existDefaultData = true;
        } else {
            instance.existDefaultData = false;
            instance.defaultValues    = Array.from(instance.originalSelect.options)
                .filter(opt => opt.selected)
                .map(opt => opt.value);
        }
    }

    /**
     * Baut das Popover-Element und schreibt es in die Instance.
     * @param {SelectInstance} instance
     * @param {boolean} showSearch
     * @param {boolean} showSaveButton
     * @param {string}  title
     */
    #buildPopover(instance, showSearch, showSaveButton, title) {
        const popover              = document.createElement('dialog');
        popover.className          = `sp_popover ${this.groups[instance.group] || ''}`.trim();
        popover.popover            = "manual";
        popover.style.positionAnchor = `--${instance.id}`;

        let html = `
            <div class="sp_header">
                <h2 class="sp_title">${title}</h2>
                <div class="sp_actions">
                    <button class="sp_btn sp_btn_reset" title="${this.t('reset')}" type="button">
                        <span class="sp_msr">refresh</span>
                    </button>
                    <button class="sp_btn sp_btn_close" type="button">
                        <span class="sp_msr">close</span>
                    </button>
                </div>
            </div>
        `;

        if (showSearch) {
            html += `<input type="text" class="sp_search" placeholder="${this.t('search')}">`;
        }

        html += `<ul class="sp_content"></ul>`;

        if (showSaveButton) {
            html += `
                <div class="sp_footer">
                    <button class="sp_btn sp_btn_save" type="button">${this.t('save')}</button>
                </div>
            `;
        }

        popover.innerHTML = html;
        instance.popover  = popover;

        if (showSearch) {
            popover.querySelector('.sp_search').addEventListener('input', (e) =>
                this.#filterOptions(instance, e.target.value)
            );
        }
    }

    /**
     * Rendert die Optionen im Picker.
     * @param {SelectInstance} instance
     */
    #renderOptions(instance) {
        const list = instance.popover.querySelector('.sp_content');
        list.innerHTML = '';

        Array.from(instance.originalSelect.options).forEach(opt => {
            const icon     = opt.dataset.icon;
            const selected = instance.tempValue.includes(opt.value);
            const html = `
                <li class="sp_option ${selected ? 'sp_selected' : ''}"
                    data-value="${opt.value}"
                    data-label="${opt.text.toLocaleLowerCase()}">
                    ${icon
                        ? (icon.trim().startsWith('<')
                            ? icon
                            : `<span class="sp_msr" style="font-size:20px;">${icon}</span>`)
                        : ''}
                    <span>${opt.text}</span>
                    ${selected ? '<span class="sp_msr sp_checkmark">check</span>' : ''}
                </li>
            `;
            const li = document.createRange().createContextualFragment(html).firstElementChild;

            li.addEventListener('click', () => {
                if (instance.isMulti) {
                    if (instance.tempValue.includes(opt.value)) {
                        instance.tempValue = instance.tempValue.filter(v => v !== opt.value);
                    } else {
                        instance.tempValue.push(opt.value);
                    }
                    this.#renderOptions(instance);
                } else {
                    instance.tempValue = [opt.value];
                    this.#renderOptions(instance);
                    setTimeout(() => instance.saveAndClose(), 100);
                }
            });

            list.appendChild(li);
        });

        list.insertAdjacentHTML("beforeend", `
            <li class="sp_option sp_option_hidden" data-nodata>
                <span class="sp_msr" style="font-size:20px;">apps_outage</span>
                <span>${this.t("search_nodata")}</span>
            </li>
        `);
    }

    /**
     * Filtert die Optionen nach dem Suchbegriff.
     * @param {SelectInstance} instance
     * @param {string} query
     */
    #filterOptions(instance, query) {
        const listItems  = instance.popover.querySelectorAll('.sp_option');
        const lowerQuery = query.toLowerCase();
        let flagNoData   = true;

        for (const li of listItems) {
            if (li.hasAttribute("data-nodata")) { li.classList.add("sp_option_hidden"); continue; }
            const match = li.dataset.label.includes(lowerQuery);
            if (match) {
                li.classList.remove('sp_option_hidden');
                flagNoData = false;
            } else {
                li.classList.add('sp_option_hidden');
            }
        }

        if (flagNoData) {
            instance.popover.querySelector('.sp_option[data-nodata]').classList.remove("sp_option_hidden");
        }
    }

    /**
     * Öffnet den Picker.
     * @param {SelectInstance} instance
     */
    openPicker(instance) {
        if (!CSS.supports('anchor-name', '--test')) {
            const rect      = instance.triggerElm.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            instance.popover.style.top      = (rect.bottom + scrollTop + 5) + 'px';
            instance.popover.style.left     = rect.left + 'px';
            instance.popover.style.minWidth = rect.width + 'px';
        }

        instance.tempValue = Array.from(instance.originalSelect.options)
            .filter(o => o.selected)
            .map(o => o.value);

        this.#renderOptions(instance);

        if (instance.triggerElm.closest("label")) {
            instance.triggerElm.closest("label").insertAdjacentElement("afterend", instance.popover);
        } else {
            instance.triggerElm.insertAdjacentElement("afterend", instance.popover);
        }

        instance.popover.showPopover();
        instance.popover.classList.add('sp_open');
        instance.isOpen = true;

        const search = instance.popover.querySelector('.sp_search');
        if (search) setTimeout(() => search.focus(), 50);

        document.querySelectorAll('.sp_btn_reset').forEach(e => e.hidden = !instance.existDefaultData);
    }

    /**
     * Schließt den Picker.
     * @param {SelectInstance} instance
     */
    closePicker(instance) {
        instance.popover.remove();
        instance.popover.classList.remove('sp_open');
        instance.isOpen = false;
        const search = instance.popover.querySelector('.sp_search');
        if (search) search.value = '';
    }

    /**
     * Speichert die Auswahl und schließt den Picker.
     * @param {SelectInstance} instance
     */
    savePicker(instance) {
        Array.from(instance.originalSelect.options).forEach(opt => {
            opt.selected = instance.tempValue.includes(opt.value);
        });
        instance.originalSelect.dispatchEvent(new Event('change'));
        this.#updateTriggerRender(instance);
        this.closePicker(instance);
    }

    /**
     * Setzt den Picker auf die Standardwerte zurück.
     * @param {SelectInstance} instance
     */
    resetPicker(instance) {
        instance.tempValue = [...instance.defaultValues];
        this.#renderOptions(instance);
    }

    /**
     * Rendert die Trigger-Anzeige (Chip / Single Value / Placeholder).
     * @param {SelectInstance} instance
     */
    #updateTriggerRender(instance) {
        instance.triggerElm.innerHTML = '';

        const selectedOptions = Array.from(instance.originalSelect.options)
            .filter(o => o.selected);

        if (selectedOptions.length === 0) {
            instance.triggerElm.innerHTML = `<span class="sp_placeholder">${this.t('empty')}</span>`;
            return;
        }

        // Multiselect: Chips
        if (instance.isMulti) {
            selectedOptions.forEach(opt => {
                const icon = opt.dataset.icon;
                instance.triggerElm.insertAdjacentHTML("beforeend", `
                    <div class="sp_chip">
                        ${icon ? `<span class="sp_msr" style="font-size:20px;">${icon}</span>` : ''}
                        <span>${opt.text}</span>
                    </div>
                `);
            });
        }
        // Single Select: Icon + Text
        else {
            const opt  = selectedOptions[0];
            const icon = opt.dataset.icon;
            instance.triggerElm.insertAdjacentHTML("beforeend", `
                <div class="sp_single_value">
                    ${icon ? `<span class="sp_msr" style="font-size:20px;">${icon}</span>` : ''}
                    <span>${opt.text}</span>
                </div>
            `);
        }
    }
}