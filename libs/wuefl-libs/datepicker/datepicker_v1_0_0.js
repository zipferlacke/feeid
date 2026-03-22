/**
 * DatePicker — Vanilla JS, kein Framework
 *
 * ── Erstellen ────────────────────────────────────────────────────────────────
 *   dp.create(input)            → Single, nur Startdatum
 *   dp.create([input])          → Single, nur Startdatum
 *   dp.create([startEl, endEl]) → Range, Von–Bis
 *
 * ── Optionen ─────────────────────────────────────────────────────────────────
 *   showDate:     true  → Kalender anzeigen (default: true)
 *   showTime:     false → Zeitpicker anzeigen (default: false)
 *   outputFormat: 'locale' | 'ms' | 'iso'
 *
 * ── Ausgabe ins Input ────────────────────────────────────────────────────────
 *   'locale' (default) → "13.03.2026" / "13.03.2026, 14:30"  (Regionalformat)
 *   'ms'               → Unix-Millisekunden als String
 *   'iso'              → "2026-03-13" / "2026-03-13T14:30"
 *   Nur Zeit           → immer "14:30" (unabhängig von outputFormat)
 *
 * ── Trigger-Anzeige ──────────────────────────────────────────────────────────
 *   Immer im lokalen Regionalformat, unabhängig von outputFormat
 */

const MONTHS = {
    de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
const WEEKDAYS = {
    de: ['Mo','Di','Mi','Do','Fr','Sa','So'],
    en: ['Mo','Tu','We','Th','Fr','Sa','Su'],
};

const pad     = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class DatePicker {
    #activePickers = [];
    #globalConfig  = {
        showDate:     true,
        showTime:     true,
        outputFormat: 'ms',
    };

    constructor(config = {}) {
        const browserLang = navigator.language.split('-')[0];
        this.lang   = config.lang || (MONTHS[browserLang] ? browserLang : 'en');
        this.locale = config.locale || navigator.language;

        this.translations = config.translations || {
            de: { save: 'Speichern', reset: 'Zurücksetzen', from: 'Von', to: 'Bis', placeholder: 'Datum wählen' },
            en: { save: 'Save',      reset: 'Reset',        from: 'From', to: 'To', placeholder: 'Pick a date'  },
        };
        this.txt = this.translations[this.lang] || this.translations['en'];
        this.#globalConfig = { ...this.#globalConfig, ...(config.options || {}) };

        this.#injectCss();
        document.addEventListener('click', e => this.#handleGlobalClick(e));
    }

    t(k) { return this.txt[k] ?? k; }

    #injectCss() {
        const url = new URL('./datepicker_v1_0_0.css', import.meta.url);
        if (document.querySelector(`link[href="${url.href}"]`)) return;
        document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${url.href}">`);
    }

    // ── create ──────────────────────────────────────────────────────────────────
    /**
     * @param {HTMLElement | HTMLElement[]} inputConfig
     *   - Element        → Single-Modus
     *   - [Element]      → Single-Modus
     *   - [start, end]   → Range-Modus
     */
    create(inputConfig, options = {}) {
        const opts = { ...this.#globalConfig, ...options };

        let fromInput, toInput;
        if (Array.isArray(inputConfig)) {
            fromInput = inputConfig[0] ?? null;
            toInput   = inputConfig.length >= 2 ? inputConfig[1] : null;
        } else {
            fromInput = inputConfig;
            toInput   = null;
        }

        const isRange  = toInput !== null;
        const showDate = opts.showDate !== false;
        const showTime = opts.showTime === true;
        const needSave = isRange || showTime;

        const now = new Date();

        const instance = {
            id:            'dp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            fromInput, toInput, isRange, showDate, showTime, needSave,
            outputFormat:  opts.outputFormat || 'locale',
            viewYear:      now.getFullYear(),
            viewMonth:     now.getMonth(),
            showYearPanel: false,
            selectedFrom:  showDate ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            selectedTo:    null,
            fromTime:      { h: 0,  m: 0  },
            toTime:        { h: 23, m: 59 },
            hoverDate:     null,
            selectingEnd:  false,
            triggerElm:    null,
            popover:       null,
            isOpen:        false,
        };

        if (fromInput?.value) {
            const parsed = this.#parseInput(fromInput.value);
            if (parsed) {
                instance.selectedFrom = parsed;
                instance.viewYear     = parsed.getFullYear();
                instance.viewMonth    = parsed.getMonth();
                instance.fromTime     = { h: parsed.getHours(), m: parsed.getMinutes() };
            }
        }
        if (toInput?.value) {
            const parsed = this.#parseInput(toInput.value);
            if (parsed) {
                instance.selectedTo = parsed;
                instance.toTime     = { h: parsed.getHours(), m: parsed.getMinutes() };
            }
        }

        if (fromInput) fromInput.style.display = 'none';
        if (toInput)   toInput.style.display   = 'none';

        instance.triggerElm = this.#buildTrigger(instance);
        fromInput.insertAdjacentElement('afterend', instance.triggerElm);

        instance.popover = document.createElement('div');
        instance.popover.className = 'dp_popover';
        instance.popover.setAttribute('popover', 'manual');

        instance.open  = () => this.#open(instance);
        instance.close = () => this.#close(instance);
        instance.save  = () => this.#save(instance);
        instance.reset = () => this.#reset(instance);

        this.#activePickers.push(instance);
        return instance;
    }

    // ── Eingabe parsen ───────────────────────────────────────────────────────────
    #parseInput(val) {
        if (!val) return null;
        const ms = Number(val);
        if (!isNaN(ms) && val.trim() !== '') return new Date(ms);
        const d = new Date(val);
        if (!isNaN(d)) return d;
        return null;
    }

    // ── Formatierung: Trigger-Anzeige ────────────────────────────────────────────
    #formatDisplay(instance) {
        if (!instance.showDate && instance.showTime) {
            return `${pad(instance.fromTime.h)}:${pad(instance.fromTime.m)}`;
        }
        if (!instance.selectedFrom) return null;
        const d       = instance.selectedFrom;
        const dateStr = d.toLocaleDateString(this.locale);
        if (instance.showTime) {
            return `${dateStr}, ${pad(instance.fromTime.h)}:${pad(instance.fromTime.m)}`;
        }
        return dateStr;
    }

    #formatDisplayTo(instance) {
        if (!instance.selectedTo) return null;
        const d       = instance.selectedTo;
        const dateStr = d.toLocaleDateString(this.locale);
        if (instance.showTime) {
            return `${dateStr}, ${pad(instance.toTime.h)}:${pad(instance.toTime.m)}`;
        }
        return dateStr;
    }

    // ── Formatierung: Output ins Input ──────────────────────────────────────────
    #formatOutput(d, timeObj, instance) {
        if (!instance.showDate && instance.showTime) {
            return `${pad(timeObj.h)}:${pad(timeObj.m)}`;
        }
        const dt = instance.showTime
            ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), timeObj.h, timeObj.m, 0, 0)
            : new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (instance.outputFormat === 'ms')  return String(dt.getTime());
        if (instance.outputFormat === 'iso') {
            return instance.showTime
                ? dt.toISOString().slice(0, 16)
                : dt.toISOString().slice(0, 10);
        }
        if (instance.showTime) {
            return dt.toLocaleString(this.locale, {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
            });
        }
        return dt.toLocaleDateString(this.locale);
    }

    // ── Trigger ──────────────────────────────────────────────────────────────────
    #buildTrigger(instance) {
        const el = document.createElement('div');
        el.className = 'dp_trigger';
        el.tabIndex  = 0;
        el.style.setProperty('anchor-name', `--${instance.id}`);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); instance.open(); }
        });
        this.#updateTrigger(instance, el);
        return el;
    }

    #updateTrigger(instance, el = instance.triggerElm) {
        if (!el) return;
        const from = this.#formatDisplay(instance);
        const to   = this.#formatDisplayTo(instance);

        if (instance.isRange) {
            el.innerHTML = `
                <span class="dp_trigger_seg">${from ?? this.t('from')}</span>
                <span class="dp_trigger_arrow">→</span>
                <span class="dp_trigger_seg">${to ?? this.t('to')}</span>
            `;
        } else {
            el.innerHTML = `<span class="dp_trigger_seg">${from ?? this.t('placeholder')}</span>`;
        }
    }

    // ── Popover rendern ───────────────────────────────────────────────────────────
    #renderPopover(instance) {
        const pop = instance.popover;
        pop.style.setProperty('position-anchor', `--${instance.id}`);

        const months   = MONTHS[this.lang]   ?? MONTHS['en'];
        const weekdays = WEEKDAYS[this.lang] ?? WEEKDAYS['en'];

        pop.innerHTML = `
            <div class="dp_header">
                ${instance.showDate ? `
                    <button class="dp_btn dp_btn_prev" type="button" aria-label="Vorheriger Monat">
                        <span class="dp_msr">chevron_left</span>
                    </button>
                    <div class="dp_month_year">
                        <span class="dp_month_lbl">${months[instance.viewMonth]}</span>
                        <button class="dp_btn dp_btn_year" type="button">${instance.viewYear}</button>
                    </div>
                    <button class="dp_btn dp_btn_next" type="button" aria-label="Nächster Monat">
                        <span class="dp_msr">chevron_right</span>
                    </button>
                ` : '<div></div>'}
                <div class="dp_header_actions">
                    <button class="dp_btn dp_btn_reset" type="button" title="${this.t('reset')}">
                        <span class="dp_msr">refresh</span>
                    </button>
                    <button class="dp_btn dp_btn_close" type="button" aria-label="Schließen">
                        <span class="dp_msr">close</span>
                    </button>
                </div>
            </div>

            ${instance.showDate && instance.showYearPanel ? `
                <div class="dp_year_panel">
                    <div class="dp_year_list">${this.#buildYearList(instance)}</div>
                </div>
            ` : ''}

            ${instance.showDate && !instance.showYearPanel ? `
                <div class="dp_weekdays">
                    ${weekdays.map(d => `<span>${d}</span>`).join('')}
                </div>
                <div class="dp_days">${this.#buildDayGrid(instance)}</div>
            ` : ''}

            ${instance.showTime ? this.#buildTimePicker(instance) : ''}

            ${instance.needSave ? `
                <div class="dp_footer">
                    <button class="dp_btn dp_btn_save" type="button">${this.t('save')}</button>
                </div>
            ` : ''}
        `;

        this.#attachEvents(instance);
    }

    // ── Jahr-Liste ────────────────────────────────────────────────────────────────
    #buildYearList(instance) {
        const cur   = instance.viewYear;
        const years = [];
        for (let y = cur - 80; y <= cur + 20; y++) {
            const active = y === cur ? ' dp_year_active' : '';
            years.push(`<button class="dp_btn dp_btn_year_item${active}" data-year="${y}" type="button">${y}</button>`);
        }
        return years.join('');
    }

    // ── Tag-Grid ──────────────────────────────────────────────────────────────────
    #buildDayGrid(instance) {
        const { viewYear: yr, viewMonth: mo } = instance;
        const today    = new Date(); today.setHours(0,0,0,0);
        const firstDay = new Date(yr, mo, 1);
        const lastDay  = new Date(yr, mo + 1, 0);
        const offset   = (firstDay.getDay() + 6) % 7;

        const cells = [];
        for (let i = 0; i < offset; i++)
            cells.push(this.#dayCell(new Date(yr, mo, i - offset + 1), instance, today, true));
        for (let d = 1; d <= lastDay.getDate(); d++)
            cells.push(this.#dayCell(new Date(yr, mo, d), instance, today, false));
        const rem = 42 - cells.length;
        for (let d = 1; d <= rem; d++)
            cells.push(this.#dayCell(new Date(yr, mo + 1, d), instance, today, true));

        return cells.join('');
    }

    #dayCell(date, instance, today, faded) {
        const ts      = date.getTime();
        const todayTs = today.getTime();
        const fromTs  = instance.selectedFrom ? new Date(dateKey(instance.selectedFrom) + 'T00:00:00').getTime() : null;
        const toTs    = instance.selectedTo   ? new Date(dateKey(instance.selectedTo)   + 'T00:00:00').getTime() : null;
        const hovTs   = instance.hoverDate    ? new Date(dateKey(instance.hoverDate)     + 'T00:00:00').getTime() : null;

        const isToday   = ts === todayTs;
        const isSelFrom = fromTs !== null && ts === fromTs;
        const isSelTo   = toTs   !== null && ts === toTs;

        let rangeClass = '';
        if (instance.isRange && fromTs !== null) {
            const rangeEnd = instance.selectingEnd ? (hovTs ?? toTs) : toTs;
            if (rangeEnd !== null) {
                const lo = Math.min(fromTs, rangeEnd);
                const hi = Math.max(fromTs, rangeEnd);
                if      (ts === lo)           rangeClass = 'dp_range_start';
                else if (ts === hi)           rangeClass = 'dp_range_end';
                else if (ts > lo && ts < hi) rangeClass = 'dp_in_range';
            } else if (isSelFrom) {
                rangeClass = 'dp_range_start';
            }
        }

        const cls = [
            'dp_day',
            faded     ? 'dp_faded'    : '',
            isToday   ? 'dp_today'    : '',
            isSelFrom ? 'dp_sel_from' : '',
            isSelTo   ? 'dp_sel_to'   : '',
            rangeClass,
        ].filter(Boolean).join(' ');

        return `<button class="${cls}" data-date="${dateKey(date)}" type="button"><span>${date.getDate()}</span></button>`;
    }

    // ── Zeit-Picker ───────────────────────────────────────────────────────────────
    #buildTimePicker(instance) {
        const field = (hKey, mKey, timeObj) => `
            <div class="dp_time_fields">
                <input class="dp_t" type="text" inputmode="numeric" maxlength="2"
                    value="${pad(timeObj.h)}" data-t="${hKey}" data-max="23" placeholder="hh">
                <span class="dp_time_sep">:</span>
                <input class="dp_t" type="text" inputmode="numeric" maxlength="2"
                    value="${pad(timeObj.m)}" data-t="${mKey}" data-max="59" placeholder="mm">
            </div>
        `;

        if (instance.isRange) {
            return `
                <div class="dp_time dp_time_range">
                    <div class="dp_time_col">
                        <span class="dp_time_label">${this.t('from')}</span>
                        ${field('fh', 'fm', instance.fromTime)}
                    </div>
                    <div class="dp_time_col">
                        <span class="dp_time_label">${this.t('to')}</span>
                        ${field('th', 'tm', instance.toTime)}
                    </div>
                </div>
            `;
        }
        return `<div class="dp_time">${field('fh', 'fm', instance.fromTime)}</div>`;
    }

    // ── Events ────────────────────────────────────────────────────────────────────
    #attachEvents(instance) {
        const pop = instance.popover;

        pop.querySelector('.dp_btn_prev')?.addEventListener('click', () => {
            if (--instance.viewMonth < 0) { instance.viewMonth = 11; instance.viewYear--; }
            this.#renderPopover(instance);
        });
        pop.querySelector('.dp_btn_next')?.addEventListener('click', () => {
            if (++instance.viewMonth > 11) { instance.viewMonth = 0; instance.viewYear++; }
            this.#renderPopover(instance);
        });

        pop.querySelector('.dp_btn_year')?.addEventListener('click', () => {
            instance.showYearPanel = !instance.showYearPanel;
            this.#renderPopover(instance);
            if (instance.showYearPanel) {
                requestAnimationFrame(() => pop.querySelector('.dp_year_active')?.scrollIntoView({ block: 'center' }));
            }
        });
        pop.querySelectorAll('.dp_btn_year_item').forEach(btn =>
            btn.addEventListener('click', () => {
                instance.viewYear      = parseInt(btn.dataset.year);
                instance.showYearPanel = false;
                this.#renderPopover(instance);
            })
        );

        this.#attachDayEvents(instance);

        pop.querySelectorAll('.dp_t').forEach(inp => {
            inp.addEventListener('focus', () => inp.select());

            inp.addEventListener('input', () => {
                inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
                const v   = parseInt(inp.value) || 0;
                const max = parseInt(inp.dataset.max);
                const key = inp.dataset.t;
                const val = clamp(v, 0, max);

                switch (key) {
                    case 'fh': instance.fromTime.h = val; break;
                    case 'fm': instance.fromTime.m = val; break;
                    case 'th': instance.toTime.h   = val; break;
                    case 'tm': instance.toTime.m   = val; break;
                }

                if (inp.value.length === 2) {
                    const nextKey = { fh: 'fm', th: 'tm' }[key];
                    if (nextKey) {
                        const next = inp.closest('.dp_time_fields')?.querySelector(`[data-t="${nextKey}"]`);
                        if (next) { next.focus(); next.select(); }
                    }
                }
            });

            inp.addEventListener('blur', () => {
                inp.value = pad(clamp(parseInt(inp.value) || 0, 0, parseInt(inp.dataset.max)));
            });
        });

        pop.querySelector('.dp_btn_save')?.addEventListener('click',  () => instance.save());
        pop.querySelector('.dp_btn_close')?.addEventListener('click', () => instance.close());
        pop.querySelector('.dp_btn_reset')?.addEventListener('click', () => instance.reset());
    }

    // ── Tag-Events ────────────────────────────────────────────────────────────────
    #attachDayEvents(instance) {
        const days = instance.popover?.querySelector('.dp_days');
        if (!days) return;

        days.querySelectorAll('.dp_day').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                if (btn.classList.contains('dp_faded')) return;
                this.#handleDayClick(instance, new Date(btn.dataset.date + 'T00:00:00'));
            });

            btn.addEventListener('touchstart', e => {
                e.preventDefault();
            }, { passive: false });

            btn.addEventListener('touchend', e => {
                e.preventDefault();
                if (btn.classList.contains('dp_faded')) return;
                this.#handleDayClick(instance, new Date(btn.dataset.date + 'T00:00:00'));
            }, { passive: false });

            btn.addEventListener('mouseenter', () => {
                if (instance.isRange && instance.selectedFrom && instance.selectingEnd) {
                    instance.hoverDate = new Date(btn.dataset.date + 'T00:00:00');
                    this.#refreshDays(instance);
                }
            });
        });

        days.addEventListener('mouseleave', () => {
            if (instance.hoverDate) { instance.hoverDate = null; this.#refreshDays(instance); }
        });
    }

    #refreshDays(instance) {
        const days = instance.popover?.querySelector('.dp_days');
        if (!days) return;
        days.innerHTML = this.#buildDayGrid(instance);
        this.#attachDayEvents(instance);
    }

    #handleDayClick(instance, date) {
        if (!instance.isRange) {
            instance.selectedFrom = date;
            this.#refreshDays(instance);
            if (!instance.needSave) setTimeout(() => instance.save(), 150);
            return;
        }

        if (instance.selectingEnd) {
            let [from, to] = [instance.selectedFrom, date];
            if (to < from) [from, to] = [to, from];
            instance.selectedFrom = from;
            instance.selectedTo   = to;
            instance.hoverDate    = null;
            instance.selectingEnd = false;
        } else {
            instance.selectedFrom = date;
            instance.selectedTo   = date;
            instance.hoverDate    = null;
            instance.selectingEnd = true;
        }
        this.#refreshDays(instance);
    }

    // ── Open ──────────────────────────────────────────────────────────────────────
    #open(instance) {
        if (instance.isOpen) return;

        if (!CSS.supports('anchor-name', '--test')) {
            const rect      = instance.triggerElm.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            instance.popover.style.position = 'absolute';
            instance.popover.style.top      = (rect.bottom + scrollTop + 6) + 'px';
            instance.popover.style.left     = rect.left + 'px';
        }

        this.#renderPopover(instance);
        instance.triggerElm.insertAdjacentElement('afterend', instance.popover);
        instance.popover.showPopover();
        instance.isOpen = true;
    }

    // ── Close ─────────────────────────────────────────────────────────────────────
    #close(instance) {
        instance.popover.remove();
        instance.isOpen        = false;
        instance.showYearPanel = false;
    }

    // ── Save ──────────────────────────────────────────────────────────────────────
    #save(instance) {
        const fromDate = instance.selectedFrom ?? new Date();
        instance.fromInput.value = this.#formatOutput(fromDate, instance.fromTime, instance);
        instance.fromInput.dispatchEvent(new Event('change', { bubbles: true }));

        if (instance.isRange && instance.selectedTo && instance.toInput) {
            instance.toInput.value = this.#formatOutput(instance.selectedTo, instance.toTime, instance);
            instance.toInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this.#updateTrigger(instance);
        this.#close(instance);
    }

    // ── Reset ─────────────────────────────────────────────────────────────────────
    #reset(instance) {
        const now = new Date();
        instance.selectedFrom = instance.showDate
            ? null
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        instance.selectedTo   = null;
        instance.hoverDate    = null;
        instance.selectingEnd = false;
        instance.fromTime     = { h: 0,  m: 0  };
        instance.toTime       = { h: 23, m: 59 };

        instance.fromInput.value = '';
        instance.fromInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (instance.toInput) {
            instance.toInput.value = '';
            instance.toInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this.#updateTrigger(instance);
        this.#renderPopover(instance);
    }

    // ── Globaler Klick ────────────────────────────────────────────────────────────
    #handleGlobalClick(e) {
        for (const inst of this.#activePickers) {
            const inPop     = inst.popover?.isConnected && e.composedPath().includes(inst.popover);
            const inTrigger = inst.triggerElm?.contains(e.target);
            const inFrom    = inst.fromInput?.contains(e.target);
            const inTo      = inst.toInput?.contains(e.target);

            if (!inPop && !inTrigger && !inFrom && !inTo) {
                if (inst.isOpen) inst.close();
            } else if ((inTrigger || inFrom || inTo) && !inst.isOpen) {
                inst.open();
            }
        }
    }
}