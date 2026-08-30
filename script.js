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

/* ===== AGE GATE (21+) ===== */
/* Verification is kept in sessionStorage only, so it expires as soon as
   the visitor exits (closes the tab or browser) and every new visit
   must pass the DOB check again. */
const AGE_KEY = 'lcdh_age_verified';
const AGE_LIMIT_YEARS = 21;

const ageGate = document.getElementById('age-gate');
const ageCard = ageGate.querySelector('.age-gate-card');
const dobDay = document.getElementById('dob-day');
const dobMonth = document.getElementById('dob-month');
const dobYear = document.getElementById('dob-year');
const ageError = document.getElementById('age-gate-error');

function ageGatePassed() {
    try {
        return !!sessionStorage.getItem(AGE_KEY);
    } catch (error) {
        return false;
    }
}

function openAgeGate() {
    document.body.classList.add('age-gate-open');
    ageGate.classList.add('visible');
    ageGate.setAttribute('aria-hidden', 'false');
    dobDay.focus();
}

function closeAgeGate() {
    document.body.classList.remove('age-gate-open');
    ageGate.classList.remove('visible');
    ageGate.setAttribute('aria-hidden', 'true');
}

function calculateAge(birthDate) {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age--;
    return age;
}

function nudgeCard() {
    ageCard.classList.remove('shake');
    void ageCard.offsetWidth;   /* restart the animation */
    ageCard.classList.add('shake');
}

/* Digits only + auto-advance between DD / MM / YYYY segments */
[dobDay, dobMonth, dobYear].forEach((input, index, list) => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, input.maxLength);
        if (input.value.length === input.maxLength && list[index + 1]) list[index + 1].focus();
    });
    input.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Backspace' && input.value.length === 0 && list[index - 1]) {
            list[index - 1].focus();
        }
    });
});

if (!ageGatePassed()) openAgeGate();

document.getElementById('age-gate-form').addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault();

    const day = dobDay.value.trim();
    const month = dobMonth.value.trim();
    const year = dobYear.value.trim();

    if (day.length !== 2 || month.length !== 2 || year.length !== 4 || Number(year) < 1900) {
        ageError.textContent = 'Please enter your full date of birth (DD / MM / YYYY).';
        nudgeCard();
        return;
    }

    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const isRealDate = birthDate.getFullYear() === Number(year) &&
                       birthDate.getMonth() === Number(month) - 1 &&
                       birthDate.getDate() === Number(day);

    if (!isRealDate || birthDate > new Date()) {
        ageError.textContent = 'That date does not exist — please check DD / MM / YYYY.';
        nudgeCard();
        return;
    }

    if (calculateAge(birthDate) >= AGE_LIMIT_YEARS) {
        try { sessionStorage.setItem(AGE_KEY, '1'); } catch (storageError) { /* storage unavailable */ }
        ageError.textContent = '';
        closeAgeGate();
    } else {
        ageCard.classList.add('denied');
        dobDay.disabled = true;
        dobMonth.disabled = true;
        dobYear.disabled = true;
        ageError.textContent = 'Sorry — you must be 21 or older to enter this website.';
    }
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

    const LOCATIONS = {
        'City Walk — Dubai': {
            lat: 25.2056,
            lng: 55.2570,
            name: 'City Walk',
            city: 'DUBAI',
            address: 'City Walk, Dubai, United Arab Emirates',
            hours: 'Please contact the Casa for current opening hours.',
            directions: 'https://maps.app.goo.gl/KonTfdo48PyqwFJo8'
        },
        'JBR — Dubai': {
            lat: 25.0795,
            lng: 55.1400,
            name: 'JBR',
            city: 'DUBAI',
            address: 'The Walk, Jumeirah Beach Residence, Dubai',
            hours: 'Please contact the Casa for current opening hours.',
            directions: 'https://maps.app.goo.gl/SEFQf9YabRu11QU6A'
        },
        'Abu Dhabi Mall — Abu Dhabi': {
            lat: 24.5006,
            lng: 54.3961,
            name: 'Abu Dhabi Mall',
            city: 'ABU DHABI',
            address: 'Abu Dhabi Mall, Abu Dhabi, United Arab Emirates',
            hours: 'Please contact the Casa for current opening hours.',
            directions: 'https://maps.app.goo.gl/787X3kXX6VPw44zs8'
        }
    };

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

/* ===== CONTACT FORM ===== */
const form = document.getElementById('enquiry-form');
const statusEl = document.getElementById('form-status');
const submitButton = document.getElementById('submit-button');

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
const WA_NUMBER = '971542137706';
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
