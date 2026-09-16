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
        if (entry.isIntersecting) entry.target.classList.add('visible');
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
    if (c.email) {
        setLink('contact-email', 'mailto:' + c.email, 'EMAIL — ' + String(c.email).toUpperCase());
        setLink('footer-email', 'mailto:' + c.email, c.email);
    }
    const widget = document.getElementById('whatsapp-widget');
    if (widget && c.whatsapp) widget.href = 'https://wa.me/' + c.whatsapp;

    /* Footer locations list */
    const footerLocs = document.getElementById('footer-locations');
    if (footerLocs && locs.length) {
        footerLocs.innerHTML = locs.map((l) => escapeHtml(l.name || l.title)).join('<br>');
    }

    /* Contact form location dropdown */
    const locSelect = document.getElementById('location');
    if (locSelect && locs.length) {
        locSelect.innerHTML =
            '<option value="" disabled selected>Select a location</option>' +
            locs.map((l) => '<option value="' + escapeHtml(l.label) + '">' + escapeHtml(l.label) + '</option>').join('');
    }

    /* Desktop clickable list — one trigger per Casa. Contact Store is an
       option INSIDE that Casa's own CONTACT LOCATION popover, not its own button. */
    const linksWrap = document.getElementById('location-links');
    if (linksWrap && locs.length) {
        linksWrap.innerHTML = locs.map((loc) => {
            const storeWa = (loc.whatsapp || '').replace(/\D/g, '');
            const storeHref = storeWa ? 'https://wa.me/' + storeWa + '?text=' + encodeURIComponent('Hello ' + (loc.title || loc.name || 'La Casa del Habano') + '! I have a question.') : '';
            const storeItem = storeHref
                ? '<a class="loc-pop-option loc-pop-store" href="' + escapeHtml(storeHref) + '" target="_blank" rel="noopener noreferrer">CONTACT STORE ↗</a>'
                : '';
            return '<div class="location-link-item">' +
                '<button type="button" class="location-link" data-location="' + escapeHtml(loc.label) + '" data-map-url="' + escapeHtml(loc.mapsUrl || '') + '" aria-expanded="false" aria-haspopup="true">' +
                    '<span class="location-link-top">' +
                        '<span class="location-city">' + escapeHtml(loc.city) + '</span>' +
                        '<span class="location-link-arrow" aria-hidden="true">→</span>' +
                    '</span>' +
                    '<h3 class="location-title display">' + escapeHtml(loc.title) + '</h3>' +
                    '<p class="location-copy">' + escapeHtml(loc.copy) + '</p>' +
                '</button>' +
                '<div class="loc-popover" role="menu" hidden>' +
                    storeItem +
                    '<button type="button" class="loc-pop-option loc-pop-maps" data-map-url="' + escapeHtml(loc.mapsUrl || '') + '" data-location="' + escapeHtml(loc.label) + '" role="menuitem">OPEN IN GOOGLE MAPS →</button>' +
                    '<a class="loc-pop-option" href="#about" role="menuitem">ABOUT THIS CASA →</a>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* Contact Store is one of the choices INSIDE the same CONTACT LOCATION
       options — never a separate button on the card/row itself. */
    const gridWrap = document.getElementById('locations-grid');
    if (gridWrap && locs.length) {
        gridWrap.innerHTML = locs.map((loc) => {
            const storeWa = (loc.whatsapp || '').replace(/\D/g, '');
            const storeHref = storeWa ? 'https://wa.me/' + storeWa + '?text=' + encodeURIComponent('Hello ' + (loc.title || loc.name || 'La Casa del Habano') + '! I have a question.') : '';
            const storeItem = storeHref
                ? '<a class="loc-pop-option loc-pop-store" href="' + escapeHtml(storeHref) + '" target="_blank" rel="noopener noreferrer">CONTACT STORE ↗</a>'
                : '';
            return '<article class="location-card">' +
                '<div class="location-img"><img src="' + escapeHtml(loc.image || '') + '" alt="' + escapeHtml(loc.title) + ' Casa" loading="lazy"></div>' +
                '<div class="location-body">' +
                    '<p class="location-city">' + escapeHtml(loc.city) + '</p>' +
                    '<h3 class="location-title display">' + escapeHtml(loc.title) + '</h3>' +
                    '<p class="location-copy">' + escapeHtml(loc.copy) + '</p>' +
                    '<hr class="location-rule" aria-hidden="true">' +
                    '<p class="location-address">' + escapeHtml(loc.address) + '</p>' +
                    '<p class="location-hours">' + escapeHtml(loc.hours) + '</p>' +
                    '<div class="location-contact-wrap">' +
                        '<button type="button" data-location="' + escapeHtml(loc.label) + '" data-map-url="' + escapeHtml(loc.mapsUrl || '') + '" class="location-contact" aria-expanded="false" aria-haspopup="true">CONTACT LOCATION →</button>' +
                        '<div class="loc-popover" role="menu" hidden>' +
                            storeItem +
                            '<button type="button" class="loc-pop-option loc-pop-maps" data-map-url="' + escapeHtml(loc.mapsUrl || '') + '" data-location="' + escapeHtml(loc.label) + '" role="menuitem">OPEN IN GOOGLE MAPS →</button>' +
                            '<a class="loc-pop-option" href="#about" role="menuitem">ABOUT THIS CASA →</a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    /* Each Casa's CONTACT LOCATION trigger opens its own small options menu;
       CONTACT STORE is one choice inside it (plus Maps / About). One open at
       a time; Escape / outside click closes. */
    (function initLocationPopovers() {
        const closeAll = (except) => {
            document.querySelectorAll('.loc-popover:not([hidden])').forEach((pop) => {
                if (pop !== except) pop.hidden = true;
            });
            document.querySelectorAll('.location-link[aria-expanded="true"], .location-contact[aria-expanded="true"]').forEach((btn) => {
                const pop = btn.parentElement ? btn.parentElement.querySelector('.loc-popover') : null;
                if (pop !== except) btn.setAttribute('aria-expanded', 'false');
            });
            document.querySelectorAll('.location-link-item.open, .location-contact-wrap.open').forEach((wrap) => {
                const pop = wrap.querySelector('.loc-popover');
                if (pop !== except) wrap.classList.remove('open');
            });
        };

        document.querySelectorAll('.location-link-item, .location-contact-wrap').forEach((wrap) => {
            const trigger = wrap.querySelector('.location-link, .location-contact');
            const pop = wrap.querySelector('.loc-popover');
            if (!trigger || !pop) return;
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const willOpen = pop.hidden;
                closeAll(pop);
                pop.hidden = !willOpen;
                wrap.classList.toggle('open', willOpen);
                trigger.setAttribute('aria-expanded', String(willOpen));
            });
            pop.querySelectorAll('.loc-pop-maps').forEach((mapsBtn) => {
                mapsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mapUrl = mapsBtn.getAttribute('data-map-url') || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((mapsBtn.getAttribute('data-location') || '') + ', United Arab Emirates');
                    window.open(mapUrl, '_blank', 'noopener,noreferrer');
                    pop.hidden = true;
                    wrap.classList.remove('open');
                    trigger.setAttribute('aria-expanded', 'false');
                });
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.location-link-item') && !e.target.closest('.location-contact-wrap')) closeAll(null);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAll(null);
        });
    })();
}

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

function startAutoplay() {
    clearInterval(autoplay);
    autoplay = setInterval(() => step(1), 5000);
}

document.getElementById('next-event').addEventListener('click', () => step(1));
document.getElementById('prev-event').addEventListener('click', () => step(-1));

carousel.addEventListener('mouseenter', () => clearInterval(autoplay));
carousel.addEventListener('mouseleave', startAutoplay);

let touchStart = 0;
let touchStartY = 0;
let isSwiping = false;

carousel.addEventListener('touchstart', (event) => {
    touchStart = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    isSwiping = false;
    clearInterval(autoplay);
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
        startAutoplay();
        return;
    }
    const difference = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(difference) > 30) step(difference < 0 ? 1 : -1);
    startAutoplay();
});

window.addEventListener('resize', () => render(false));

/* Re-render carousel after layout/images are ready (fixes 0-width on load) */
window.addEventListener('load', () => render(false));
if (document.readyState === 'complete') render(false);

updateDots();
render(false);
startAutoplay();

/* ===== LOCATIONS MAP (Leaflet + OpenStreetMap) ===== */
(function initLocationsMap() {
    const mapEl = document.getElementById('locations-map');
    const links = Array.prototype.slice.call(document.querySelectorAll('.location-link'));
    if (!mapEl) return;

    /* The map + list layout only exists on desktop (≥1024px); on mobile we keep the
       original photo-card style, so the interactive map should not initialize. */
    if (window.matchMedia && !window.matchMedia('(min-width: 1024px)').matches) return;

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
            directions: item.mapsUrl || ''
        };
    });

    const map = L.map(mapEl, {
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

        loc.marker.bindPopup(
            '<span class="lp-kicker">' + loc.city + '</span>' +
            '<span class="lp-title">' + loc.name + '</span>' +
            '<span class="lp-address">' + loc.address + '</span>' +
            '<span class="lp-hours">' + loc.hours + '</span>' +
            '<a class="lp-link" href="' + loc.directions + '" target="_blank" rel="noopener noreferrer">View in Google Maps →</a>',
            { closeButton: true, className: 'location-popup' }
        );

        loc.marker.on('click', () => activate(key, false));
    });

    /* Show all three Casas at once initially, then zoom on selection */
    map.fitBounds(allKeys.map(function (key) {
        return [LOCATIONS[key].lat, LOCATIONS[key].lng];
    }), { padding: [48, 48] });

    function activate(key, pan) {
        const loc = LOCATIONS[key];
        if (!loc) return;
        links.forEach(function (link) {
            link.classList.toggle('active', link.dataset.location === key);
        });
        if (pan !== false) map.flyTo([loc.lat, loc.lng], 15, { duration: 1.1 });
        loc.marker.openPopup();
    }

    /* Desktop rows are CONTACT LOCATION triggers (their options popover is
       toggled by initLocationPopovers above). Also highlight the Casa map. */
    links.forEach(function (link) {
        link.addEventListener('click', () => {
            activate(link.dataset.location, true);
            /* Also pre-select this Casa in the contact form */
            const locationInput = document.getElementById('location');
            if (locationInput) locationInput.value = link.dataset.location;
        });
    });

    /* Re-measure the map once everything is laid out (reveal animations etc.) */
    if (map.invalidateSize) {
        window.addEventListener('load', () => map.invalidateSize());
        setTimeout(() => map.invalidateSize(), 400);
    }
})();

/* ===== MOBILE LOCATION CARDS - LOCATION BUTTONS ===== */
/* Each card's CONTACT LOCATION opens that Casa's options (Contact Store /
   Maps / About). The raw Maps-open fallback is kept for cards that somehow
   render without their popover. */
document.querySelectorAll('.location-contact').forEach(button => {
    if (button.closest('.location-contact-wrap')) return; /* handled by initLocationPopovers */
    button.addEventListener('click', () => {
        const mapUrl = button.dataset.mapUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(button.dataset.location + ', United Arab Emirates');
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
        const aboutSection = document.getElementById('about');
        if (aboutSection) aboutSection.scrollIntoView({ behavior: 'smooth' });
    });
});

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
    if (open && chatInput) {
        setTimeout(() => chatInput.focus(), 250);
    }
}

if (chatWidget) {
    chatWidget.addEventListener('click', (e) => {
        /* Open the in-page chat popup instead of navigating straight to WhatsApp */
        e.preventDefault();
        e.stopPropagation();
        setChatOpen(!chatPanel.classList.contains('open'));
    });
}

if (chatClose) {
    chatClose.addEventListener('click', () => setChatOpen(false));
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatPanel && chatPanel.classList.contains('open')) {
        setChatOpen(false);
    }
});

document.addEventListener('click', (e) => {
    if (!chatPanel || !chatPanel.classList.contains('open')) return;
    if (!chatPanel.contains(e.target) && !chatWidget.contains(e.target)) {
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

function openWhatsAppWithMessage(text) {
    const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
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
        setTimeout(() => {
            if (typing) typing.remove();
            openWhatsAppWithMessage(text);
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
