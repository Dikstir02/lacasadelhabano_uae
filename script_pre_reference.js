/* ===== NAVIGATION TOGGLE ===== */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

/* Close mobile menu when link is clicked */
navLinks?.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

/* ===== SCROLL SPY ===== */
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const scrollSpy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const id = entry.target.id;
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (entry.isIntersecting) {
            link?.classList.add('active');
        } else {
            link?.classList.remove('active');
        }
    });
}, observerOptions);

document.querySelectorAll('section[id]').forEach(section => {
    scrollSpy.observe(section);
});

/* ===== NAVBAR SCROLL ===== */
let lastScroll = 0;
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        nav.classList.add('nav-scrolled');
    } else {
        nav.classList.remove('nav-scrolled');
    }

    lastScroll = currentScroll;
});

/* ===== CONTACT FORM ===== */
const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    /* Collect form data */
    const formData = new FormData(contactForm);
    const data = {
        name: contactForm.querySelector('[placeholder="NAME"]')?.value,
        phone: contactForm.querySelector('[placeholder="PHONE"]')?.value,
        email: contactForm.querySelector('[placeholder="EMAIL"]')?.value,
        location: contactForm.querySelector('select')?.value,
        message: contactForm.querySelector('textarea')?.value
    };

    /* Validate required fields */
    if (!data.name || !data.email || !data.message) {
        alert('Please fill in all required fields.');
        return;
    }

    /* Show success message (in production, this would send to a backend) */
    alert('Thank you for your enquiry! We will be in touch soon.');
    contactForm.reset();
});

/* ===== SMOOTH SCROLL FOR ANCHOR LINKS ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
