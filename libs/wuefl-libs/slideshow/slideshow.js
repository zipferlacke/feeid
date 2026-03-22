/*
Slideshow JS
Copyright: Florian Wüllner 2023 / updated 2025
*/
import Gestures from '../js/gestures.js';

injectCss();
initAll();

function initAll() {
    document.querySelectorAll('.slideshow').forEach(el => initSlideshow(el));
}

function initSlideshow(slideshow) {
    const slides = Array.from(slideshow.querySelectorAll('.slide'));
    if (slides.length === 0) return;

    const showDots    = slideshow.dataset.dots    !== 'false';
    const showArrows  = slideshow.dataset.arrows  !== 'false';
    const autoplayMs  = slideshow.dataset.autoplay ? parseInt(slideshow.dataset.autoplay) : null;

    // State pro Slideshow
    let current = 0;
    let autoplayTimer = null;

    // Alte Navi entfernen (re-init safe)
    slideshow.querySelector('.slideshow_navi_dots')?.remove();
    slideshow.querySelector('.slideshow_navi_left')?.remove();
    slideshow.querySelector('.slideshow_navi_right')?.remove();

    // Slides initialisieren
    slides.forEach((slide, i) => {
        slide.setAttribute('data-index', i);
        if (i === 0) {
            slide.removeAttribute('close');
        } else {
            slide.setAttribute('close', '');
        }
    });

    // Dots
    let dots = [];
    if (showDots) {
        const dotWrapper = document.createElement('div');
        dotWrapper.className = 'slideshow_navi_dots';
        slides.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'slideshow_navi_dots__dot sld_msr';
            dot.setAttribute('data-index', i);
            dot.textContent = i === 0 ? 'radio_button_checked' : 'radio_button_unchecked';
            if (i !== 0) dot.setAttribute('close', '');
            dot.addEventListener('click', () => goTo(i));
            dotWrapper.appendChild(dot);
            dots.push(dot);
        });
        slideshow.appendChild(dotWrapper);
    }

    // Pfeile
    if (showArrows) {
        const left = document.createElement('span');
        left.className = 'slideshow_navi_arrow slideshow_navi_left sld_msr';
        left.textContent = 'chevron_left';
        left.addEventListener('click', () => { resetTimer(); goTo(current - 1); });
        slideshow.appendChild(left);

        const right = document.createElement('span');
        right.className = 'slideshow_navi_arrow slideshow_navi_right sld_msr';
        right.textContent = 'chevron_right';
        right.addEventListener('click', () => { resetTimer(); goTo(current + 1); });
        slideshow.appendChild(right);
    }

    // Gesten
    const gestures = new Gestures(slideshow);
    gestures.onLeft(() => { resetTimer(); goTo(current + 1); });
    gestures.onRight(() => { resetTimer(); goTo(current - 1); });

    // Dot-Klick Timer reset
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => resetTimer());
    });

    // Autoplay starten
    if (autoplayMs) startTimer();

    function goTo(index) {
        // Endlos durchlaufen
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;

        slides[current].setAttribute('close', '');
        if (dots[current]) {
            dots[current].setAttribute('close', '');
            dots[current].textContent = 'radio_button_unchecked';
        }

        current = index;

        slides[current].removeAttribute('close');
        if (dots[current]) {
            dots[current].removeAttribute('close');
            dots[current].textContent = 'radio_button_checked';
        }
    }

    function startTimer() {
        autoplayTimer = setInterval(() => goTo(current + 1), autoplayMs);
    }

    function resetTimer() {
        if (!autoplayMs) return;
        clearInterval(autoplayTimer);
        startTimer();
    }
}

function injectCss() {
    const cssUrl = new URL('./slideshow.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl.href;
    document.head.appendChild(link);
}
