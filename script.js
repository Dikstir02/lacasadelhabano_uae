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
    /* No events at all – hide the whole section */
    const eventsSection = document.getElementById('events');
    if (eventsSection) eventsSection.style.display = 'none';
}

const realSlides = Array.from(track.children);
const slideCount = realSlides.length;

/* Clone the first and last slides so prev/next wraps around seamlessly */
const headClone = realSlides[0].cloneNode(true);
const tailClone = realSlides[slideCount - 1].cloneNode(true);
headClone.setAttribute('aria-hidden', 'true');
tailClone.setAttribute('aria-hidden', 'true');
track.appendChild(headClone);
track.insertBefore(tailClone, realSlides[0]);

const slides = Array.from(track.children);   /* real slides + 2 clones */
let position = 1;        /* physical position within the track (clones included) */
let currentSlide = 0;    /* logical slide index driving the dots */
let isMoving = false;
let autoplay;

/* Build dots dynamically based on actual event count */
const dots = [];
if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'event-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Show event ' + (i + 1) + ' of ' + slideCount);
        dot.addEventListener('click', () => showSlide(i));
        dotsContainer.appendChild(dot);
        dots.push(dot);
    }
}

/* Translate the track to the current position; animate=false snaps instantly */
function render(animate = true) {
    if (!animate) track.style.transition = 'none';
    track.style.transform = 'translate3d(' + (-position * carousel.clientWidth) + 'px, 0, 0)';
    if (!animate) {
        void track.offsetWidth;   /* flush styles so the snap is never animated */
        track.style.transition = '';
    }
}

function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
}

/* After a slide finishes, silently jump off any clone onto its real twin */
track.addEventListener('transitionend', (event) => {
    if (event.target !== track || !isMoving) return;
    if (position === slides.length - 1) {           /* resting on head clone */
        position = 1;
        currentSlide = 0;
        render(false);
    } else if (position === 0) {                    /* resting on tail clone */
        position = slideCount;
        currentSlide = slideCount - 1;
        render(false);
    }
    isMoving = false;
});

/* Move one slide forward (delta=1) or backward (delta=-1) */
function step(delta) {
    if (isMoving) return;
    isMoving = true;
    position += delta;
    currentSlide = (((position - 1) % slideCount) + slideCount) % slideCount;
    updateDots();
    render();
}

/* Jump straight to a slide via the dots */
function showSlide(index) {
    if (isMoving || index === currentSlide) return;
    isMoving = true;
    position = index + 1;
    currentSlide = index;
    updateDots();
    render();
}

function startAutoplay() {
    clearInterval(autoplay);
    autoplay = setInterval(() => step(1), 6000);
}

document.getElementById('next-event').addEventListener('click', () => step(1));
document.getElementById('prev-event').addEventListener('click', () => step(-1));

carousel.addEventListener('mouseenter', () => clearInterval(autoplay));
carousel.addEventListener('mouseleave', startAutoplay);

let pointerStart = 0;
let pointerStartY = 0;
let isSwiping = false;

carousel.addEventListener('pointerdown', (event) => {
    pointerStart = event.clientX;
    pointerStartY = event.clientY;
    isSwiping = false;
    carousel.setPointerCapture(event.pointerId);
}, { passive: true });

carousel.addEventListener('pointermove', (event) => {
    const diffX = Math.abs(event.clientX - pointerStart);
    const diffY = Math.abs(event.clientY - pointerStartY);
    if (diffX > diffY && diffX > 10) {
        isSwiping = true;
        event.preventDefault();
    }
}, { passive: false });

carousel.addEventListener('pointerup', (event) => {
    if (!isSwiping) return;
    const difference = event.clientX - pointerStart;
    if (Math.abs(difference) > 20) step(difference < 0 ? 1 : -1);
});

window.addEventListener('resize', () => render(false));

updateDots();
render(false);
startAutoplay();

/* ===== LOCATION CONTACT BUTTONS ===== */
document.querySelectorAll('.location-contact').forEach(button => {
    button.addEventListener('click', () => {
        const locationInput = document.getElementById('location');
        if (locationInput) locationInput.value = button.dataset.location;
        const mapUrl = button.dataset.mapUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(button.dataset.location + ', United Arab Emirates');
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
        const contactSection = document.getElementById('contact');
        if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    });
});

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
