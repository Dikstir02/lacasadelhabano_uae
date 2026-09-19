/* =========================================================
   LA CASA DEL HABANO UAE
   Reference-aligned interactions
   ========================================================= */

/* Set a robust viewport-height unit for the full-screen hero */
function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
}
setVH();
window.addEventListener('resize', setVH);

/* ===== AGE GATE (21+) — YES / NO ===== */
/* Verification is kept in sessionStorage only, so it expires as soon as
   the visitor exits (closes the tab or browser) and every new visit
   must confirm again. */
const AGE_KEY = 'lcdh_age_verified';

const ageGate = document.getElementById('age-gate');
const ageCard = ageGate ? ageGate.querySelector('.age-gate-card') : null;
const ageError = document.getElementById('age-gate-error');
const ageYesBtn = document.getElementById('age-yes');
const ageNoBtn = document.getElementById('age-no');

function ageGatePassed() {
    try {
        return !!sessionStorage.getItem(AGE_KEY);
    } catch (error) {
        return false;
    }
}

function openAgeGate() {
    if (!ageGate) return;
    document.body.classList.add('age-gate-open');
    ageGate.classList.add('visible');
    ageGate.setAttribute('aria-hidden', 'false');
    if (ageYesBtn) ageYesBtn.focus();
}

function closeAgeGate() {
    if (!ageGate) return;
    document.body.classList.remove('age-gate-open');
    ageGate.classList.remove('visible');
    ageGate.setAttribute('aria-hidden', 'true');
}

function nudgeCard() {
    if (!ageCard) return;
    ageCard.classList.remove('shake');
    void ageCard.offsetWidth;   /* restart the animation */
    ageCard.classList.add('shake');
}

function markAgeVerified() {
    try { sessionStorage.setItem(AGE_KEY, '1'); } catch (storageError) { /* storage unavailable — still let them in */ }
    if (ageError) ageError.textContent = '';
    closeAgeGate();
    document.dispatchEvent(new CustomEvent('lcdh:age-verified'));
}

if (ageGate && !ageGatePassed()) openAgeGate();

if (ageYesBtn) ageYesBtn.addEventListener('click', markAgeVerified);

if (ageNoBtn) ageNoBtn.addEventListener('click', () => {
    if (ageError) ageError.textContent = 'Sorry — this site is for adults aged 21 and over only.';
    nudgeCard();
});

/* ===== STICKY HEADER ===== */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 25);
}, { passive: true });

/* ===== MOBILE MENU ===== */
const menu = document.getElementById('mobile-menu');
const openMenu = document.getElementById('menu-button');
const closeMenu = document.getElementById('menu-close');

openMenu.addEventListener('click', () => {
    menu.classList.add('open');
    openMenu.setAttribute('aria-expanded', 'true');
});
closeMenu.addEventListener('click', () => {
    menu.classList.remove('open');
    openMenu.setAttribute('aria-expanded', 'false');
});
document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => closeMenu.click());
});

/* ===== SCROLLSPY (active nav link) ===== */
const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
const sections = document.querySelectorAll('main section[id]');

const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
    });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
sections.forEach(section => spyObserver.observe(section));

/* ===== REVEAL ON SCROLL ===== */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('visible');
        /* Settle the animation, then release the compositor layer so future
           scrolls over this element stay cheap. */
        window.setTimeout(() => el.classList.add('reveal-settled'), 750);
        revealObserver.unobserve(el);
    });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ===== EVENT CAROUSEL (smooth sliding track) ===== */
const carousel = document.getElementById('event-carousel');
const track = document.getElementById('event-track');
const dotsContainer = document.getElementById('event-dots');

/* ===== RECENT EVENTS CONTENT (managed via /admin, exported to js/events-data.js) ===== */

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

/* In-file event "database". Edit js/events-data.js to change events site-wide. */
let eventsData = Array.isArray(window.LCDH_EVENTS) ? window.LCDH_EVENTS.slice() : [];

if (eventsData.length > 0) {
    track.innerHTML = eventsData.map((item) => (
        '<article class="event-slide">' +
            '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title || 'Casa event') + '" loading="lazy">' +
            '<div class="event-content">' +
                (item.category ? '<p class="event-category">' + escapeHtml(item.category) + '</p>' : '') +
                '<h3 class="event-title display">' + escapeHtml(item.title) + '</h3>' +
                (item.copy ? '<p class="event-copy">' + escapeHtml(item.copy) + '</p>' : '') +
                (item.date ? '<p class="event-date">' + escapeHtml(item.date) + '</p>' : '') +
                '<a href="#contact" class="event-link">ENQUIRE ABOUT EVENTS &rarr;</a>' +
            '</div>' +
        '</article>'
    )).join('');
} else {
    const eventsSection = document.getElementById('events');
    if (eventsSection) eventsSection.style.display = 'none';
}

/* ===== SITE SETTINGS (managed via /admin → js/site-settings.js) ===== */
/* The live site renders its contact details, locations and music from
   window.LCDH_SETTINGS so every page load reflects the latest export. */
const SETTINGS = (window.LCDH_SETTINGS && typeof window.LCDH_SETTINGS === 'object')
    ? window.LCDH_SETTINGS
    : { contact: {}, audio: {}, locations: [] };

function applySiteSettings() {
    const c = SETTINGS.contact || {};
    const locs = Array.isArray(SETTINGS.locations) ? SETTINGS.locations : [];

    const setLink = (id, href, text) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (href) el.href = href;
        if (text) el.textContent = text;
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
    };

    /* Contact + footer links */
    if (c.whatsapp) setLink('contact-wa', 'https://wa.me/' + c.whatsapp);
    if (c.whatsappBot) setLink('footer-whatsapp', 'https://wa.me/' + c.whatsappBot);
    if (c.instagram) setLink('contact-ig', c.instagram);
    if (c.instagram) {
        const handle = '@' + String(c.instagram).split('/').filter(Boolean).pop();
        setLink('footer-instagram', c.instagram, 'Follow us on Instagram  ');
    }
    if (c.email) {
        setLink('contact-email', 'mailto:' + c.email, 'EMAIL — ' + String(c.email).toUpperCase());
    }
    const widget = document.getElementById('whatsapp-widget');
    if (widget && c.whatsapp) widget.href = 'https://wa.me/' + c.whatsapp;

    /* Footer locations list — clickable deep-links into #locations.
       Each link carries its Casa label so the footer handler below can
       select the matching map pin (desktop) or card (mobile). */
    const footerLocs = document.getElementById('footer-locations');
    if (footerLocs && locs.length) {
        footerLocs.innerHTML = locs.map((l) =>
            '<a class="footer-link footer-location-link" href="#locations" data-location="' + escapeHtml(l.label) + '">' +
                escapeHtml(l.name || l.title) +
            '</a>'
        ).join('');
    }

    /* Contact form location dropdown */
    const locSelect = document.getElementById('location');
    if (locSelect && locs.length) {
        locSelect.innerHTML =
            '<option value="" disabled selected>Select a location</option>' +
            locs.map((l) => '<option value="' + escapeHtml(l.label) + '">' + escapeHtml(l.label) + '</option>').join('');
    }

    /* Desktop clickable list — plain selector only; Contact Store + Maps
       live inside the map pin popup details */
    const linksWrap = document.getElementById('location-links');
    if (linksWrap && locs.length) {
        linksWrap.innerHTML = locs.map((loc) =>
            '<div class="location-link-item">' +
                '<button type="button" class="location-link" data-location="' + escapeHtml(loc.label) + '" data-map-url="' + escapeHtml(loc.mapsUrl || '') + '">' +
                    '<span class="location-link-top">' +
                        '<span class="location-city">' + escapeHtml(loc.city) + '</span>' +
                        '<span class="location-link-arrow" aria-hidden="true">→</span>' +
                    '</span>' +
                    '<h3 class="location-title display">' + escapeHtml(loc.title) + '</h3>' +
                    '<p class="location-copy">' + escapeHtml(loc.copy) + '</p>' +
                '</button>' +
            '</div>'
        ).join('');
    }

                /* Mobile location cards — on mobile the locations-grid renders a
       compact, info-only card (no image), mirroring the desktop
       location-link row style. Each card carries its own tappable
       Contact Store (WhatsApp) + View in Google Maps buttons,
       giving mobile users the same quick actions that desktop users
       reach via the map-pin popups. */
    const waNumbers = {
        'City Walk — Dubai': '971558001577',
        'JBR — Dubai': '971558002731',
        'Abu Dhabi Mall — Abu Dhabi': '971507093183'
    };
    const gridWrap = document.getElementById('locations-grid');
    if (gridWrap && locs.length) {
        gridWrap.innerHTML = locs.map((loc) =>
            '<article class="location-card" data-location="' + escapeHtml(loc.label) + '">' +
                '<div class="location-body">' +
                    '<div class="loc-mobile-head">' +
                        '<p class="location-city">' + escapeHtml(loc.city) + '</p>' +
                        '<h3 class="location-title display">' + escapeHtml(loc.title) + '</h3>' +
                    '</div>' +
                    '<p class="location-copy">' + escapeHtml(loc.copy) + '</p>' +
                    '<hr class="location-rule" aria-hidden="true">' +
                    '<p class="location-address">' + escapeHtml(loc.address) + '</p>' +
                    '<p class="location-hours">' + escapeHtml(loc.hours) + '</p>' +
                    '<div class="loc-mobile-actions">' +
                        '<a href="https://wa.me/' + (loc.whatsapp || waNumbers[loc.label] || '') + '?text=' + encodeURIComponent('Hello ' + (loc.title || loc.name || loc.label) + '! I have a question.') + '" class="loc-mobile-btn loc-mobile-whatsapp" data-chat-store="true" data-location="' + escapeHtml(loc.label) + '" data-number="' + (loc.whatsapp || waNumbers[loc.label] || '') + '" data-store="' + escapeHtml(loc.title || loc.name || loc.label) + '" target="_blank" rel="noopener noreferrer">Contact Store ↗</a>' +
                        '<a href="' + escapeHtml(loc.mapsUrl || 'https://www.google.com/maps') + '" class="loc-mobile-btn loc-mobile-maps" target="_blank" rel="noopener noreferrer">View in Google Maps →</a>' +
                    '</div>' +
                '</div>' +
            '</article>'
        ).join('');
    }
}

/* ===== MOBILE LOCATION CARD ACTION HANDLING ===== */
/* Contact-form pre-select is now handled centrally by the delegated
   [data-chat-store] click handler in the chatbot section (which also
   covers desktop map popups). This stub is kept only so the ordering
   quirk stays documented: it runs before applySiteSettings() renders
   the cards, so it intentionally does nothing. */
(function initMobileLocationActions() {
    return;
})();

applySiteSettings();

const realSlides = Array.from(track.children);
const slideCount = realSlides.length;

if (slideCount === 0) {
    const eventsSection = document.getElementById('events');
    if (eventsSection) eventsSection.style.display = 'none';
}

/* Build dots dynamically based on actual event count */
const dots = [];
if (dotsContainer && slideCount > 0) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'event-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Show event ' + (i + 1) + ' of ' + slideCount);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
        dots.push(dot);
    }
}

let currentSlide = 0;
let isMoving = false;
let autoplay;

function getCarouselWidth() {
    return carousel ? carousel.clientWidth : 0;
}

function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
}

function render(animate = true) {
    if (!carousel || !track) return;
    const w = getCarouselWidth();
    if (w === 0) return;
    if (!animate) {
        track.style.transition = 'none';
        track.style.webkitTransition = 'none';
    }
    const x = -currentSlide * w;
    track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
    track.style.webkitTransform = 'translate3d(' + x + 'px, 0, 0)';
    if (!animate) {
        void track.offsetWidth;
        track.style.transition = '';
        track.style.webkitTransition = '';
    }
}

function goToSlide(index) {
    if (isMoving || index === currentSlide) return;
    if (index < 0 || index >= slideCount) return;
    isMoving = true;
    currentSlide = index;
    updateDots();
    render(true);
    setTimeout(() => { isMoving = false; }, 700);
}

function step(delta) {
    let next = currentSlide + delta;
    if (next >= slideCount) next = 0;
    if (next < 0) next = slideCount - 1;
    goToSlide(next);
}

/* Autoplay every 3s, but only while the carousel is actually on screen.
   An IntersectionObserver gates the timer so nothing slides off-screen;
   hover / touch pauses, and manual arrows restart the 3s rhythm. */
let carouselVisible = false;
let userPaused = false;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startAutoplay() {
    if (autoplay || reduceMotion || slideCount < 2) return;
    autoplay = setInterval(() => step(1), 3000);
}

function stopAutoplay() {
    clearInterval(autoplay);
    autoplay = null;
}

function refreshAutoplay() {
    if (carouselVisible && !userPaused && !document.hidden) startAutoplay();
    else stopAutoplay();
}

document.getElementById('next-event').addEventListener('click', () => { step(1); stopAutoplay(); refreshAutoplay(); });
document.getElementById('prev-event').addEventListener('click', () => { step(-1); stopAutoplay(); refreshAutoplay(); });

carousel.addEventListener('mouseenter', () => { userPaused = true; stopAutoplay(); });
carousel.addEventListener('mouseleave', () => { userPaused = false; refreshAutoplay(); });

let touchStart = 0;
let touchStartY = 0;
let isSwiping = false;

carousel.addEventListener('touchstart', (event) => {
    touchStart = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    isSwiping = false;
    stopAutoplay();
}, { passive: true });

carousel.addEventListener('touchmove', (event) => {
    const diffX = Math.abs(event.touches[0].clientX - touchStart);
    const diffY = Math.abs(event.touches[0].clientY - touchStartY);
    if (diffX > diffY && diffX > 10) {
        isSwiping = true;
    }
}, { passive: true });

carousel.addEventListener('touchend', (event) => {
    if (!isSwiping) {
        refreshAutoplay();
        return;
    }
    const difference = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(difference) > 30) step(difference < 0 ? 1 : -1);
    stopAutoplay();
    refreshAutoplay();
});

window.addEventListener('resize', () => render(false));

/* Re-render carousel after layout/images are ready (fixes 0-width on load) */
window.addEventListener('load', () => render(false));
if (document.readyState === 'complete') render(false);

updateDots();
render(false);

/* Gate autoplay on visibility: no sliding until the carousel scrolls
   into view, then every 3s — and pause again when it scrolls away. */
if ('IntersectionObserver' in window && carousel) {
    new IntersectionObserver((entries) => {
        carouselVisible = entries.some((entry) => entry.isIntersecting);
        refreshAutoplay();
    }, { threshold: 0.25 }).observe(carousel);
} else {
    carouselVisible = true;
    refreshAutoplay();
}

/* Pause when the tab is hidden so slides don't queue up in the background. */
document.addEventListener('visibilitychange', refreshAutoplay);

/* ===== BRANDS MARQUEE — swipe / drag + gentle auto-drift ===== */
/* The strip is a CSS keyframe loop by default (no-JS fallback). When JS
   runs, it becomes a native horizontal scroller: touch-swipe on mobile,
   click-drag on desktop, arrow keys when focused, plus a slow auto-drift
   that pauses on interaction and only runs while the strip is visible. */
(function initBrandsMarquee() {
    const marquee = document.getElementById('brands-marquee');
    if (!marquee) return;
    const trackEl = marquee.querySelector('.brands-track');
    if (!trackEl) return;
    const sets = trackEl.querySelectorAll('.brands-set');
    if (sets.length < 2) return;

    /* A third copy gives seamless room in both directions; the middle
       copy is home. Images are decorative repeats — hide the clone. */
    const clone = sets[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    trackEl.appendChild(clone);
    trackEl.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
    trackEl.addEventListener('dragstart', (e) => e.preventDefault());

    marquee.classList.add('is-swipable');
    marquee.setAttribute('tabindex', '0');

    /* One set's width, from live layout (re-measured as logos load). */
    let setWidth = 0;
    const measure = () => {
        const first = trackEl.querySelector('.brands-set');
        if (first && first.offsetWidth > 0) {
            setWidth = first.offsetWidth;
            if (marquee.scrollLeft === 0) marquee.scrollLeft = setWidth;
        }
    };
    measure();
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    trackEl.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', measure, { once: true });
    });
    window.addEventListener('resize', () => {
        const first = trackEl.querySelector('.brands-set');
        if (first && first.offsetWidth > 0) setWidth = first.offsetWidth;
    });

    /* Seamless wrap: keep the viewport inside the middle copy's range. */
    marquee.addEventListener('scroll', () => {
        if (!setWidth) return;
        if (marquee.scrollLeft >= setWidth * 2) marquee.scrollLeft -= setWidth;
        else if (marquee.scrollLeft <= 0) marquee.scrollLeft += setWidth;
    }, { passive: true });

    /* Slow auto-drift, gated on visibility / interaction / tab state. */
    const reduceMotionBrands = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let brandsVisible = false;
    let brandsHeld = false;
    let lastT = 0;
    const DRIFT_PX_PER_SEC = 28;
    const tick = (t) => {
        if (!reduceMotionBrands && brandsVisible && !brandsHeld && !document.hidden && setWidth) {
            if (lastT) {
                let next = marquee.scrollLeft + DRIFT_PX_PER_SEC * ((t - lastT) / 1000);
                if (next >= setWidth * 2) next -= setWidth;
                marquee.scrollLeft = next;
            }
            lastT = t;
        } else {
            lastT = 0;
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            brandsVisible = entries.some((entry) => entry.isIntersecting);
        }, { threshold: 0.1 }).observe(marquee);
    } else {
        brandsVisible = true;
    }

    /* Desktop click-drag. */
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    marquee.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        dragging = true;
        brandsHeld = true;
        startX = e.clientX;
        startScroll = marquee.scrollLeft;
        marquee.classList.add('dragging');
        try { marquee.setPointerCapture(e.pointerId); } catch (captureError) { /* older browsers — drag still works */ }
    });
    marquee.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        marquee.scrollLeft = startScroll - (e.clientX - startX);
    });
    const endDrag = () => {
        dragging = false;
        brandsHeld = false;
        marquee.classList.remove('dragging');
    };
    marquee.addEventListener('pointerup', endDrag);
    marquee.addEventListener('pointercancel', endDrag);

    /* Hover pauses the drift (matches the old CSS hover-pause); touch
       scrolls natively, so just hold the drift while fingers are down. */
    marquee.addEventListener('mouseenter', () => { if (!dragging) brandsHeld = true; });
    marquee.addEventListener('mouseleave', () => { if (!dragging) brandsHeld = false; });
    marquee.addEventListener('touchstart', () => { brandsHeld = true; }, { passive: true });
    marquee.addEventListener('touchend', () => { brandsHeld = false; }, { passive: true });
    marquee.addEventListener('touchcancel', () => { brandsHeld = false; }, { passive: true });

    /* Keyboard: arrows move by ~40% of the visible strip. */
    marquee.addEventListener('keydown', (e) => {
        const step = Math.round(marquee.clientWidth * 0.4);
        if (e.key === 'ArrowRight') { marquee.scrollLeft += step; e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { marquee.scrollLeft -= step; e.preventDefault(); }
    });
})();

/* ===== LOCATIONS MAP (Leaflet + OpenStreetMap) ===== */
(function initLocationsMap() {
    const mapEl = document.getElementById('locations-map');
    const links = Array.prototype.slice.call(document.querySelectorAll('.location-link'));
    if (!mapEl) return;

    /* Map pin details provide store actions on desktop and mobile. */

    /* If Leaflet failed to load, fall back to plain direction links */
    if (typeof L === 'undefined') {
        mapEl.innerHTML =
            '<div class="locations-map-fallback">' +
            '<p>Map unavailable. Open a Casa directly:</p>' +
            links.map(function (link) {
                const url = link.dataset.mapUrl || 'https://www.google.com/maps';
                return '<a class="locations-map-fallback-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' + link.dataset.location + '</a>';
            }).join('') +
            '</div>';
        return;
    }

    /* Locations come from js/site-settings.js (managed via /admin) */
    const settingsLocs = Array.isArray(SETTINGS.locations) ? SETTINGS.locations : [];
    const LOCATIONS = {};
    settingsLocs.forEach(function (item) {
        if (!item || !item.label) return;
        LOCATIONS[item.label] = {
            lat: Number(item.lat) || 0,
            lng: Number(item.lng) || 0,
            name: item.name || item.title || item.label,
            city: item.city || '',
            address: item.address || '',
            hours: item.hours || '',
            directions: item.mapsUrl || '',
            whatsapp: String(item.whatsapp || '').replace(/\D/g, ''),
            storeName: item.title || item.name || item.label
        };
    });


    /* The inline map is desktop-only: below 1024px the CSS hides
       .locations-layout and the cards link straight to Google Maps.
       Leaflet cannot measure a hidden container, so the map is mounted
       only while the desktop layout is active — and mounted later if the
       viewport grows back. */
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    let map = null;

    function mountInlineMap() {
        if (map || !desktopQuery.matches) return;

        map = L.map(mapEl, {
            scrollWheelZoom: false,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        }).addTo(map);

        const allKeys = Object.keys(LOCATIONS);

        allKeys.forEach(function (key) {
            const loc = LOCATIONS[key];
            loc.marker = L.marker([loc.lat, loc.lng], {
                icon: L.divIcon({
                    className: 'location-marker',
                    html: '<span class="location-pin"></span>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 18],
                    popupAnchor: [0, -24]
                }),
                title: loc.name,
                riseOnHover: true
            }).addTo(map);

            const storeHref = loc.whatsapp
                ? 'https://wa.me/' + loc.whatsapp + '?text=' + encodeURIComponent('Hello ' + loc.storeName + '! I have a question.')
                : '';
            const storeLink = storeHref
                ? '<a class="lp-link lp-store" href="' + storeHref + '" target="_blank" rel="noopener noreferrer" data-chat-store="true" data-location="' + key.replace(/"/g, '') + '" data-number="' + loc.whatsapp + '" data-store="' + loc.storeName.replace(/"/g, '') + '">Contact Store ↗</a>'
                : '';
            loc.marker.bindPopup(
                '<span class="lp-kicker">' + loc.city + '</span>' +
                '<span class="lp-title">' + loc.name + '</span>' +
                '<span class="lp-address">' + loc.address + '</span>' +
                '<span class="lp-hours">' + loc.hours + '</span>' +
                '<span class="lp-actions">' +
                    storeLink +
                    '<a class="lp-link" href="' + loc.directions + '" target="_blank" rel="noopener noreferrer">View in Google Maps →</a>' +
                '</span>',
                { closeButton: true, className: 'location-popup' }
            );

            loc.marker.on('click', () => activate(key, false));
        });

        /* Show all three Casas at once initially, then zoom on selection */
        map.fitBounds(allKeys.map(function (key) {
            return [LOCATIONS[key].lat, LOCATIONS[key].lng];
        }), { padding: [48, 48] });

        /* Re-measure the map once everything is laid out (reveal animations etc.) */
        window.addEventListener('load', () => map.invalidateSize());
        setTimeout(() => map.invalidateSize(), 400);
    }

    /* Mount now if the desktop layout is active, and again if it becomes
       active later (rotate / resize back to desktop). */
    mountInlineMap();
    if (desktopQuery.addEventListener) {
        desktopQuery.addEventListener('change', mountInlineMap);
    } else if (desktopQuery.addListener) {
        desktopQuery.addListener(mountInlineMap);
    }

    function activate(key, pan) {
        const loc = LOCATIONS[key];
        if (!loc || !map || !loc.marker) return;
        links.forEach(function (link) {
            link.classList.toggle('active', link.dataset.location === key);
        });
        if (pan !== false) {
            /* Offset the center upward so the pin lands lower on screen,
               leaving full room for the popup above it. */
            const targetZoom = 15;
            const pt = map.project([loc.lat, loc.lng], targetZoom).subtract([0, 60]);
            map.flyTo(map.unproject(pt, targetZoom), targetZoom, { duration: 1.1 });
        }
        loc.marker.openPopup();
    }

    /* Desktop rows highlight the Casa on the map. */
    links.forEach(function (link) {
        link.addEventListener('click', () => {
            activate(link.dataset.location, true);
            /* Also pre-select this Casa in the contact form */
            const locationInput = document.getElementById('location');
            if (locationInput) locationInput.value = link.dataset.location;
        });
    });

    /* Footer location links deep-link into #locations and select the Casa:
       on desktop this flies the map to the pin; on mobile it scrolls to
       and flashes the matching card. Exposed globally for footer links. */
    window.LCDH_showCasa = function (label) {
        if (!label) return;
        /* Desktop: the row click does everything (map fly + form select). */
        const row = links.filter(function (link) { return link.dataset.location === label; })[0];
        if (row) row.click();
        /* Mobile: no map rows exist — scroll to the card and flash it. */
        const card = document.querySelector('.location-card[data-location="' + label.replace(/"/g, '') + '"]');
        if (card) {
            setTimeout(function () {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.remove('location-card--flash');
                void card.offsetWidth; /* restart the flash animation */
                card.classList.add('location-card--flash');
            }, 450);
        }
    };
})();

/* ===== EXPERIENCE DETAILS ===== */
(function () {
    const modal = document.getElementById('experience-modal');
    if (!modal) return;
    const modalCard = modal.querySelector('.exp-modal-card');
    const details = {
        'torcedor-events': [
            ['Craft, live before your eyes', 'A master torcedor rolling at your event is pure theatre — watching hands that have shaped thousands of cigars coax a wrapper leaf into a flawless cylinder, then tasting one rolled minutes earlier. Guests remember it long after the evening ends.'],
            ['Shaped around your occasion', 'Corporate receptions, weddings, private milestones — we tailor the format to the night: live rolling stations, guided tastings, pairing sessions with rum or coffee, and short masterclasses in cutting, lighting and savouring.'],
            ['Request your event', 'Tell us the date, venue and headcount via the contact form or WhatsApp and we will design the evening with you — availability is limited, so early booking is recommended.']
        ],
        'casa-lounge': [
            ['Your armchair is waiting', 'Step out of the Dubai heat into cedar-scented calm: deep leather chairs, low lamplight, the quiet ceremony of the cut and light. Every Casa is a small Havana — unhurried, welcoming, and made for lingering.'],
            ['Hospitality, the Cuban way', 'Our hosts know every cigar in the humidor and every rum on the shelf. New to Habanos or a lifelong aficionado, you will be guided — never rushed — to the pour and vitola that suit your evening.'],
            ['Before you settle in', 'Check your chosen location for opening hours, lounge seating and reservation details — facilities differ between City Walk, JBR and Abu Dhabi Mall, so a quick message ahead guarantees your spot.']
        ],
        'premium-cigars': [
            ['Cuba’s great houses, under one roof', 'Cohiba, Montecristo, Partagás, Romeo y Julieta, Hoyo de Monterrey and more — every box sourced through official Habanos channels and rested in our walk-in humidors at perfect maturity.'],
            ['From first cigar to connoisseur', 'Mild and honeyed for a first exploration, full-bodied and complex for the seasoned palate — our team will match strength, format and smoking time to your taste and your evening.'],
            ['Ask before you visit', 'Rare formats and aged boxes move quickly. Message your Casa about the current selection or a specific cigar before visiting so we can have it ready for you.']
        ],
        'cigar-accessories': [
            ['Everything the ritual deserves', 'Precision double-blade cutters, torch and soft-flame lighters, cedar spills, travel cases and desktop humidors — a curated range chosen to cut clean, light true and keep every cigar at its best.'],
            ['For home, travel and gifting', 'From pocket essentials to cabinet humidors and presentation gift sets, we will help you choose pieces that suit your routine — and wrap them beautifully when they are destined for someone else.'],
            ['Chosen with expert hands', 'Unsure which cutter suits a figurado, or which humidor suits the UAE climate? Ask in store or on WhatsApp and we will point you to the right tool for the job.']
        ]
        };
    let opener = null;
    const closeButton = modal.querySelector('.exp-modal-close');

    /* Show the branded scrollbar only while the modal card is scrolled */
    function refreshScrollbar() {
        if (!modalCard) return;
        if (modalCard.scrollTop > 0) {
            modalCard.classList.add('scrolled');
        } else {
            modalCard.classList.remove('scrolled');
        }
    }
    if (modalCard) {
        modalCard.addEventListener('scroll', refreshScrollbar, { passive: true });
    }

    function close() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('experience-modal-open');
        if (modalCard) modalCard.classList.remove('scrolled');
        if (opener) {
            opener.setAttribute('aria-expanded', 'false');
            opener.focus({ preventScroll: true });
        }
    }
    function open(card) {
        const content = details[card.dataset.experience];
        if (!content) return;
        opener = card;
        const image = card.querySelector('img');
        document.getElementById('exp-modal-img').src = image.src;
        document.getElementById('exp-modal-img').alt = image.alt;
        document.getElementById('exp-modal-title').textContent = card.querySelector('.experience-title').textContent;
        document.getElementById('exp-modal-number').textContent = card.querySelector('.experience-number').textContent;
        document.getElementById('exp-modal-tagline').textContent = card.querySelector('.experience-copy').textContent;
        document.getElementById('exp-modal-text').innerHTML = content.map(([title, copy]) =>
            '<h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(copy) + '</p>').join('');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        card.setAttribute('aria-expanded', 'true');
        document.body.classList.add('experience-modal-open');
        if (modalCard) {
            modalCard.scrollTop = 0;
            modalCard.classList.remove('scrolled');
        }
        closeButton.focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-experience]').forEach(card => {
        card.setAttribute('aria-controls', 'experience-modal');
        card.addEventListener('click', () => open(card));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open(card);
            }
        });
    });
    modal.querySelectorAll('[data-exp-close]').forEach(button => button.addEventListener('click', close));
    document.addEventListener('keydown', event => {
        if (!modal.classList.contains('open')) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') { event.preventDefault(); closeButton.focus(); }
    });
    document.addEventListener('focusin', event => {
        if (modal.classList.contains('open') && !modal.contains(event.target)) closeButton.focus();
    });
})();

/* ===== HERITAGE STORY MODAL ===== */
/* Reuses the .exp-modal look & behaviour from the Experience modal, so the
   "Our Story" button opens a dialog identical in style. The heritage image
   is pulled from the #heritage section (single source of truth) and the
   long-form history copy lives as static HTML inside the modal body. */
(function () {
    const modal = document.getElementById('heritage-modal');
    const opener = document.getElementById('heritage-story');
    if (!modal) return;
    const card = modal.querySelector('.exp-modal-card');
    const closeBtn = modal.querySelector('.exp-modal-close');
    const heroImg = document.getElementById('heritage-modal-img');
    const sectionImg = document.querySelector('#heritage .heritage-media img');

    function experienceModal() {
        const em = document.getElementById('experience-modal');
        return (em && em.classList.contains('open')) ? em : null;
    }

    function openStory() {
        const other = experienceModal();
        if (other) {
            other.classList.remove('open');
            other.setAttribute('aria-hidden', 'true');
        }
        if (heroImg && sectionImg) {
            heroImg.src = sectionImg.src;
            heroImg.alt = sectionImg.alt || '';
        }
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('experience-modal-open');
        if (card) {
            card.scrollTop = 0;
        }
        if (opener) {
            opener.setAttribute('aria-expanded', 'true');
        }
        if (closeBtn) {
            closeBtn.focus({ preventScroll: true });
        }
    }

    function closeStory() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('experience-modal-open');
        if (opener) {
            opener.setAttribute('aria-expanded', 'false');
            opener.focus({ preventScroll: true });
        }
    }

    /* Close via the backdrop or the X button (both carry data-heritage-close) */
    modal.querySelectorAll('[data-heritage-close]').forEach(el => {
        el.addEventListener('click', closeStory);
    });

    /* Branded scrollbar only while the card is scrolled (mirrors Experience) */
    if (card) {
        card.addEventListener('scroll', () => {
            if (card.scrollTop > 0) {
                card.classList.add('scrolled');
            } else {
                card.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    /* Close on Escape / basic Tab trap, only while this modal is open */
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeStory();
        }
        if (e.key === 'Tab' && closeBtn) {
            e.preventDefault();
            closeBtn.focus();
        }
    });

    if (opener) {
        opener.addEventListener('click', openStory);
        opener.addEventListener('keydown', (e) => {
            if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openStory();
            }
        });
    }
})();


/* ===== ENQUIRY FORM (only when present) ===== */
/* The About Us section replaced the old contact/enquiry form. Guard everything
   so removing the form can never throw and break the scripts below it. */
const form = document.getElementById('enquiry-form');
const statusEl = document.getElementById('form-status');
const submitButton = document.getElementById('submit-button');

if (form && statusEl && submitButton) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            statusEl.textContent = 'Please complete all fields correctly.';
            form.reportValidity();
            return;
        }

        submitButton.disabled = true;
        statusEl.textContent = 'Sending your enquiry…';

        const data = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            location: document.getElementById('location').value,
            message: document.getElementById('message').value.trim(),
            submitted_at: new Date().toISOString()
        };

        /* Static demo submission. In production, POST the payload or
           forward it (e.g. WhatsApp / a backend / an API route). */
        setTimeout(() => {
            submitButton.disabled = false;
            statusEl.textContent = 'Gracias — your enquiry has been received.';
            form.reset();
        }, 600);

        console.log('Enquiry payload:', data);
    });
}

/* ===== SMOOTH SCROLL FOR ANCHOR LINKS ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

/* ===== FOOTER LOCATION DEEP-LINKS ===== */
/* After the smooth-scroll above glides to #locations, select the matching
   Casa — desktop flies the map to its pin, mobile flashes its card. */
document.querySelectorAll('.footer-location-link[data-location]').forEach(link => {
    link.addEventListener('click', () => {
        if (typeof window.LCDH_showCasa === 'function') {
            window.LCDH_showCasa(link.dataset.location);
        }
    });
});

/* ===== WHATSAPP CHATBOT WIDGET ===== */
const WA_NUMBER = (SETTINGS.contact && SETTINGS.contact.whatsapp) ? SETTINGS.contact.whatsapp : '971542137706';
const chatWidget = document.getElementById('whatsapp-widget');
const chatPanel = document.getElementById('whatsapp-chatbot');
const chatClose = document.getElementById('chatbot-close');
const chatForm = document.getElementById('chatbot-form');
const chatInput = document.getElementById('chatbot-input');
const chatMessages = document.querySelector('.chatbot-messages');

function setChatOpen(open) {
    if (!chatPanel || !chatWidget) return;
    chatPanel.classList.toggle('open', open);
    chatPanel.setAttribute('aria-hidden', String(!open));
    chatWidget.setAttribute('aria-expanded', String(open));
    const footerLink = document.getElementById('footer-whatsapp');
    if (footerLink) footerLink.setAttribute('aria-expanded', String(open));
    if (open && chatInput) {
        setTimeout(() => chatInput.focus(), 250);
    }
}

if (chatClose) {
    chatClose.addEventListener('click', () => setChatOpen(false));
}

/* Footer "Chat on WhatsApp" opens the same in-page chat popup as the
   floating widget instead of navigating straight to wa.me. The link's
   href stays as a fallback (right-click / copy-link / no-JS). */
const footerChatLink = document.getElementById('footer-whatsapp');
if (footerChatLink) {
    footerChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetChatTarget();
        setChatOpen(true);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatPanel && chatPanel.classList.contains('open')) {
        setChatOpen(false);
    }
});

document.addEventListener('click', (e) => {
    if (!chatPanel || !chatPanel.classList.contains('open')) return;
    const footerChatLink = document.getElementById('footer-whatsapp');
    if (chatWidget && chatWidget.contains(e.target)) return;
    if (footerChatLink && footerChatLink.contains(e.target)) return;
    if (!chatPanel.contains(e.target)) {
        setChatOpen(false);
    }
});

function addChatMessage(text, who) {
    if (!chatMessages) return null;
    const el = document.createElement('div');
    el.className = 'message ' + (who === 'user' ? 'message-user' : 'message-bot');
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

function showTypingIndicator() {
    if (!chatMessages) return null;
    const el = document.createElement('div');
    el.className = 'message message-bot';
    el.innerHTML = '<span class="message-typing"><span></span><span></span><span></span></span>';
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

function openWhatsAppWithMessage(text, number) {
    const digits = String(number || '').replace(/\D/g, '') || WA_NUMBER;
    const url = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
}

/* Per-store Contact buttons (desktop map popups + mobile cards) open the
   in-page chat popup, routed to that Casa's own WhatsApp number. The send
   handler above reads chatTarget for the destination; generic opens
   (floating widget, footer link) fall back to the main WA_NUMBER.
   Delegated on document so it works for admin-rendered markup and
   Leaflet popup content injected after page load. */
let chatTarget = null;

document.addEventListener('click', (e) => {
    const storeLink = e.target && e.target.closest ? e.target.closest('[data-chat-store="true"]') : null;
    if (!storeLink) return;
    e.preventDefault();
    e.stopPropagation();
    chatTarget = {
        number: storeLink.getAttribute('data-number') || '',
        store: storeLink.getAttribute('data-store') || '',
        location: storeLink.getAttribute('data-location') || ''
    };
    if (chatTarget.location) {
        const locationInput = document.getElementById('location');
        if (locationInput) locationInput.value = chatTarget.location;
    }
    setChatOpen(true);
    if (chatTarget.store) {
        setTimeout(() => addChatMessage('Chatting with ' + chatTarget.store + ' — type your message below and we\'ll continue on WhatsApp. 🏠', 'bot'), 300);
    }
});

function resetChatTarget() {
    chatTarget = null;
}

if (chatWidget) {
    chatWidget.addEventListener('click', (e) => {
        /* Open the in-page chat popup instead of navigating straight to WhatsApp */
        e.preventDefault();
        e.stopPropagation();
        resetChatTarget();
        setChatOpen(!chatPanel.classList.contains('open'));
    });
}

if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        addChatMessage(text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const typing = showTypingIndicator();
        const targetNumber = chatTarget && chatTarget.number ? chatTarget.number : null;
        setTimeout(() => {
            if (typing) typing.remove();
            openWhatsAppWithMessage(text, targetNumber);
            addChatMessage('Connecting you on WhatsApp… 💬', 'bot');
        }, 700);
    });

    /* Auto-grow textarea up to ~5 rows */
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 110) + 'px';
    });

    /* Enter sends · Shift+Enter adds a new line */
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (typeof chatForm.requestSubmit === 'function') {
                chatForm.requestSubmit();
            } else {
                document.getElementById('chatbot-send').click();
            }
        }
    });
}

/* ===== BRAND MARQUEE JS FALLBACK ===== */

(function initBrandMarquee() {
    const track = document.querySelector('.brands-track');
    if (!track) return;

    /* If CSS animation is running, no need for JS fallback */
    const computed = window.getComputedStyle(track);
    if (computed.animationName !== 'none') return;

    let pos = 0;
    const speed = 0.6; /* px per frame */
    let raf;

    function animate() {
        pos -= speed;
        const half = track.scrollWidth / 2;
        if (pos <= -half) pos = 0;
        track.style.transform = 'translate3d(' + pos + 'px, 0, 0)';
        track.style.webkitTransform = 'translate3d(' + pos + 'px, 0, 0)';
        raf = requestAnimationFrame(animate);
    }

    track.addEventListener('mouseenter', () => cancelAnimationFrame(raf));
    track.addEventListener('mouseleave', () => { raf = requestAnimationFrame(animate); });
    track.addEventListener('touchstart', () => cancelAnimationFrame(raf), { passive: true });
    track.addEventListener('touchend', () => { raf = requestAnimationFrame(animate); }, { passive: true });

    raf = requestAnimationFrame(animate);
})();
/* ===== DEVELOPER SIGNATURE ===== */
/* Hidden by default. Becomes visible only when "devdetshow" appears anywhere
   in the URL, e.g. https://lacasadelhabano.ae/?devdetshow or #devdetshow */
(function devSignature() {
    const DEV_KEY = 'devdetshow';
    const signatureEl = document.getElementById('dev-signature');
    if (!signatureEl) return;

    function syncDevSignature() {
        let url = '';
        try {
            url = String(window.location.href || '').toLowerCase();
        } catch (error) { /* location unavailable */ }
        const show = url.indexOf(DEV_KEY) !== -1;
        signatureEl.hidden = !show;
        signatureEl.setAttribute('aria-hidden', String(!show));
    }

    syncDevSignature();
    window.addEventListener('hashchange', syncDevSignature);
    window.addEventListener('popstate', syncDevSignature);
})();
