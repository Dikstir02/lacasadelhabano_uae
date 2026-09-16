/* =========================================================
   LA CASA DEL HABANO UAE — Events Admin logic
   Edits are exported as js/events-data.js for the live site.
   ========================================================= */

const EVENTS_KEY = 'lcdh_events_v1';
const SESSION_KEY = 'lcdh_admin_ok';
/* SHA-256 of the default password "habano-admin" */
const ADMIN_HASH = '03419798f23010136167aa9b8b74cbdde18099c101aa47f0fc3bb48f43e5e73c';

/* Mirrors the three slides hardcoded in index.html */
const DEFAULT_EVENTS = [
    {
        image: 'https://images.pexels.com/photos/33731258/pexels-photo-33731258.jpeg',
        category: 'LIVE AT THE CASA',
        title: 'SON CUBANO SESSIONS',
        copy: 'An intimate night of cigar culture, live guitar and easy conversation under warm lights.',
        date: 'DUBAI · PRIVATE INVITATION'
    },
    {
        image: 'https://images.pexels.com/photos/28539666/pexels-photo-28539666.jpeg',
        category: 'PAIRING EVENING',
        title: 'THE RITUAL OF RUM',
        copy: 'A slow exploration of flavour, aroma and the classic companions to a fine Habano.',
        date: 'ABU DHABI · MEMBERS\' NIGHT'
    },
    {
        image: 'https://images.pexels.com/photos/15161546/pexels-photo-15161546.jpeg',
        category: 'THE CASA TABLE',
        title: 'GOLDEN HOUR GATHERING',
        copy: 'A relaxed evening of shared tables, bright cocktails and old Havana spirit.',
        date: 'UAE · BY INVITATION'
    }
];

const $ = (selector) => document.querySelector(selector);

let editingIndex = null;

/* ===== helpers ===== */
function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadEvents() {
    try {
        const raw = localStorage.getItem(EVENTS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && Array.isArray(parsed.events) ? parsed.events : null;
    } catch (error) {
        console.warn('Could not read saved events:', error);
        return null;
    }
}

function currentEvents() {
    return DEFAULT_EVENTS.slice();
}

function persistEvents(events) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ events }));
    fileEvents = events.slice();
}

let fileEvents = null;

async function loadFileEvents() {
    try {
        const resp = await fetch('../js/events-data.js', { cache: 'no-store' });
        if (!resp.ok) return null;
        const text = await resp.text();
        const match = text.match(/window\.LCDH_EVENTS\s*=\s*(\[[\s\S]*?\])\s*;?/);
        if (!match) return null;
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.warn('Could not load events-data.js:', error);
        return null;
    }
}

function currentEvents() {
    if (fileEvents && fileEvents.length > 0) return fileEvents.slice();
    const stored = loadEvents();
    return stored && stored.length > 0 ? stored : DEFAULT_EVENTS.slice();
}

let statusTimer;
function showStatus(message) {
    const toast = $('#status-toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ===== login ===== */

$('#login-form').addEventListener('submit', async (formEvent) => {
    formEvent.preventDefault();
    const passwordInput = $('#password');
    try {
        const attempt = await sha256(passwordInput.value);
        if (attempt === ADMIN_HASH) {
            sessionStorage.setItem(SESSION_KEY, '1');
            await openAdmin();
        } else {
            $('#login-error').textContent = 'Incorrect password. Try again.';
            passwordInput.select();
        }
    } catch (error) {
        $('#login-error').textContent = 'Crypto unavailable — open this page via http(s) or a modern browser.';
    }
    passwordInput.value = '';
});

$('#logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
});

async function openAdmin() {
    $('#login-view').classList.add('hidden');
    $('#admin-view').classList.remove('hidden');
    fileEvents = await loadFileEvents();
    fileSettings = await loadFileSettings();
    renderList();
    renderSettingsForm();
}

/* ===== form ===== */
const fields = {
    image: $('#f-image'),
    category: $('#f-category'),
    title: $('#f-title'),
    copy: $('#f-copy'),
    date: $('#f-date')
};

function clearForm() {
    Object.values(fields).forEach((input) => { input.value = ''; });
    $('#image-preview').classList.add('hidden');
    editingIndex = null;
    $('#form-title').textContent = 'Add new event';
    $('#save-btn').textContent = 'Save event';
    $('#cancel-edit-btn').classList.add('hidden');
}

fields.image.addEventListener('change', () => {
    const preview = $('#image-preview');
    if (!fields.image.value) { preview.classList.add('hidden'); return; }
    preview.src = fields.image.value;
    preview.classList.remove('hidden');
});

$('#event-form').addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();

    const event = {
        image: fields.image.value.trim(),
        category: fields.category.value.trim(),
        title: fields.title.value.trim(),
        copy: fields.copy.value.trim(),
        date: fields.date.value.trim()
    };

    const events = currentEvents();
    if (editingIndex === null) {
        events.push(event);
        showStatus('Event added ✓');
    } else {
        events[editingIndex] = event;
        showStatus('Event updated ✓');
    }

    persistEvents(events);
    clearForm();
    renderList();
});

$('#cancel-edit-btn').addEventListener('click', () => {
    clearForm();
    showStatus('Edit cancelled');
});

/* ===== list actions (delegated) ===== */

$('#event-list').addEventListener('click', (clickEvent) => {
    const button = clickEvent.target.closest('button[data-action]');
    if (!button) return;

    const index = Number(button.dataset.index);
    const events = currentEvents();
    const target = events[index];
    if (!target) return;

    if (button.dataset.action === 'edit') {
        editingIndex = index;
        fields.image.value = target.image || '';
        fields.category.value = target.category || '';
        fields.title.value = target.title || '';
        fields.copy.value = target.copy || '';
        fields.date.value = target.date || '';
        $('#image-preview').src = target.image || '';
        $('#image-preview').classList.toggle('hidden', !target.image);
        $('#form-title').textContent = 'Editing: ' + (target.title || 'event');
        $('#save-btn').textContent = 'Update event';
        $('#cancel-edit-btn').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (button.dataset.action === 'delete') {
        if (!confirm('Remove "' + (target.title || 'this event') + '" from recent events?')) return;
        events.splice(index, 1);
        persistEvents(events);
        if (editingIndex !== null) clearForm();   /* indices shifted */
        renderList();
        showStatus('Event removed ✓');
    }

    if (button.dataset.action === 'move-up' || button.dataset.action === 'move-down') {
        const delta = button.dataset.action === 'move-up' ? -1 : 1;
        const swapWith = index + delta;
        if (swapWith < 0 || swapWith >= events.length) return;
        const moved = events.splice(index, 1)[0];
        events.splice(swapWith, 0, moved);
        persistEvents(events);
        if (editingIndex === index) editingIndex = swapWith;          /* keep edit target in sync */
        else if (editingIndex === swapWith) editingIndex = index;
        renderList();
        showStatus('Order updated ✓');
    }
});

/* ===== topbar actions ===== */

$('#restore-btn').addEventListener('click', async () => {
    if (!confirm('Discard all saved changes and restore the original three events?')) return;
    localStorage.removeItem(EVENTS_KEY);
    fileEvents = await loadFileEvents();
    clearForm();
    renderList();
    showStatus('Original events restored ✓');
});

$('#export-btn').addEventListener('click', async () => {
    const events = currentEvents();
    const jsContent = 'window.LCDH_EVENTS = ' + JSON.stringify(events, null, 2) + ';\n';
    try {
        await navigator.clipboard.writeText(jsContent);
        showStatus('Copied to clipboard ✓');
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('Copy failed — please copy manually', true);
    }
});

/* ===== render ===== */

function renderList() {
    const events = currentEvents();
    const usingDefaults = loadEvents() === null;
    $('#events-count').textContent = events.length + ' event' + (events.length === 1 ? '' : 's') +
        (usingDefaults ? ' · showing originals (nothing customised yet)' : ' · published');

    if (events.length === 0) {
        $('#event-list').innerHTML =
            '<p class="empty-note">No events saved.<br>The “Recent Events” section is currently hidden on the website.</p>';
        return;
    }

    $('#event-list').innerHTML = events.map((event, index) => (
        '<article class="event-item" draggable="true" data-index="' + index + '">' +
            '<span class="grip" aria-hidden="true">⠿</span>' +
            '<img class="thumb" src="' + escapeHtml(event.image) + '" alt="" draggable="false" onerror="this.style.visibility=\'hidden\'">' +
            '<div class="item-body">' +
                (event.category ? '<span class="chip">' + escapeHtml(event.category) + '</span>' : '') +
                '<h3 class="item-title">' + escapeHtml(event.title) + '</h3>' +
                (event.date ? '<p class="item-meta">' + escapeHtml(event.date) + '</p>' : '') +
                (event.copy ? '<p class="item-copy">' + escapeHtml(event.copy) + '</p>' : '') +
            '</div>' +
            '<div class="item-actions">' +
                '<div class="move-row">' +
                    '<button type="button" class="btn btn-ghost btn-small" data-action="move-up" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + ' title="Move up">&#9650;</button>' +
                    '<button type="button" class="btn btn-ghost btn-small" data-action="move-down" data-index="' + index + '"' + (index === events.length - 1 ? ' disabled' : '') + ' title="Move down">&#9660;</button>' +
                '</div>' +
                '<button type="button" class="btn btn-ghost btn-small" data-action="edit" data-index="' + index + '">Edit</button>' +
                '<button type="button" class="btn btn-danger-ghost btn-small" data-action="delete" data-index="' + index + '">Delete</button>' +
            '</div>' +
        '</article>'
    )).join('');
}

/* ===== drag & drop reordering ===== */

const eventList = $('#event-list');
let draggedItem = null;

eventList.addEventListener('dragstart', (dragEvent) => {
    draggedItem = dragEvent.target.closest('.event-item');
    if (!draggedItem) return;
    dragEvent.dataTransfer.effectAllowed = 'move';
    dragEvent.dataTransfer.setData('text/plain', draggedItem.dataset.index);   /* required for Firefox */
    requestAnimationFrame(() => draggedItem.classList.add('dragging'));       /* keep the drag ghost clean */
});

eventList.addEventListener('dragover', (dragEvent) => {
    if (!draggedItem) return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = 'move';
    const overItem = dragEvent.target.closest('.event-item');
    if (!overItem || overItem === draggedItem) return;
    const rect = overItem.getBoundingClientRect();
    const insertAfter = (dragEvent.clientY - rect.top) > rect.height / 2;
    eventList.insertBefore(draggedItem, insertAfter ? overItem.nextSibling : overItem);
});

eventList.addEventListener('drop', (dragEvent) => dragEvent.preventDefault());

eventList.addEventListener('dragend', () => {
    if (!draggedItem) return;
    draggedItem.classList.remove('dragging');
    draggedItem = null;

    /* Commit whatever order the cards currently sit in */
    const order = Array.from(eventList.querySelectorAll('.event-item')).map((el) => Number(el.dataset.index));
    const changed = order.some((originalIndex, slot) => originalIndex !== slot);
    if (!changed) return;

    /* Keep an open edit form pointed at the SAME event after the reorder */
    if (editingIndex !== null) {
        const newSlot = order.indexOf(editingIndex);
        if (newSlot !== -1) editingIndex = newSlot;
    }

    const events = currentEvents();
    persistEvents(order.map((i) => events[i]));
    renderList();
    showStatus('Order updated ✓');
});

/* ===== boot ===== */

if (sessionStorage.getItem(SESSION_KEY) === '1') {
    (async () => {
        await openAdmin();
    })();
}

/* =========================================================
   SITE SETTINGS MODULE — basic information for the live site
   Same workflow as events: save locally → copy site-settings.js
   ========================================================= */

const SETTINGS_KEY = 'lcdh_settings_v1';

const DEFAULT_SETTINGS = {
    contact: {
        email: 'info@lacasadelhabano.ae',
        whatsapp: '971542137706',
        whatsappBot: '9715066008888',
        instagram: 'https://instagram.com/lacasadelhabano_uae'
    },
    audio: {
        url: 'https://uploads.pastewaves.com/uploads/c574f98a-dd73-4954-b8b8-3914f1840958/audio.mp3'
    },
    locations: [
        {
            label: 'City Walk — Dubai',
            name: 'City Walk',
            city: 'DUBAI',
            title: 'CITY WALK',
            copy: 'A colourful, contemporary Casa in the heart of City Walk.',
            address: 'City Walk, Dubai, United Arab Emirates',
            hours: 'Please contact the Casa for current opening hours.',
            mapsUrl: 'https://maps.app.goo.gl/KonTfdo48PyqwFJo8',
            lat: 25.2056,
            lng: 55.2570,
            whatsapp: '971542137706',
            image: 'https://images.pexels.com/photos/7662956/pexels-photo-7662956.jpeg'
        },
        {
            label: 'JBR — Dubai',
            name: 'JBR',
            city: 'DUBAI',
            title: 'JBR',
            copy: 'A relaxed cigar destination close to the vibrant JBR waterfront.',
            address: 'The Walk, Jumeirah Beach Residence, Dubai',
            hours: 'Please contact the Casa for current opening hours.',
            mapsUrl: 'https://maps.app.goo.gl/SEFQf9YabRu11QU6A',
            lat: 25.0795,
            lng: 55.1400,
            whatsapp: '9715066008888',
            image: 'https://images.pexels.com/photos/37268883/pexels-photo-37268883.jpeg'
        },
        {
            label: 'Abu Dhabi Mall — Abu Dhabi',
            name: 'Abu Dhabi Mall',
            city: 'ABU DHABI',
            title: 'ABU DHABI MALL',
            copy: 'A refined Casa for discovering Cuban tradition in the capital.',
            address: 'Abu Dhabi Mall, Abu Dhabi, United Arab Emirates',
            hours: 'Please contact the Casa for current opening hours.',
            mapsUrl: 'https://maps.app.goo.gl/787X3kXX6VPw44zs8',
            lat: 24.5006,
            lng: 54.3961,
            whatsapp: '971558002731',
            image: 'https://images.pexels.com/photos/10603649/pexels-photo-10603649.jpeg'
        }
    ]
};

let fileSettings = null;

function cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings));
}

function loadSettingsFromStorage() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.settings && parsed.settings.contact ? parsed.settings : null;
    } catch (error) {
        return null;
    }
}

function currentSettings() {
    let base = null;
    if (fileSettings && fileSettings.contact) base = fileSettings;
    else base = loadSettingsFromStorage() || DEFAULT_SETTINGS;

    /* Always return the full shape (contact/audio/locations) so editing
       never crashes or silently blanks fields, even when the source is partial. */
    const merged = cloneSettings(DEFAULT_SETTINGS);
    if (base.contact) Object.assign(merged.contact, base.contact);
    if (base.audio) Object.assign(merged.audio, base.audio);
    if (Array.isArray(base.locations)) {
        merged.locations = base.locations.map((loc, i) => {
            const fallback = DEFAULT_SETTINGS.locations[i] || {};
            const withDefaults = Object.assign({}, fallback, loc);
            /* Back-fill per-store WhatsApp numbers for older exports. */
            if (!withDefaults.whatsapp) withDefaults.whatsapp = fallback.whatsapp || merged.contact.whatsapp || '';
            return withDefaults;
        });
    }
    return merged;
}

function buildSettingsFile(settings) {
    return 'window.LCDH_SETTINGS = ' + JSON.stringify(settings, null, 2) + ';\n';
}

async function loadFileSettings() {
    try {
        const resp = await fetch('../js/site-settings.js', { cache: 'no-store' });
        if (!resp.ok) return null;
        const text = await resp.text();
        const marker = 'window.LCDH_SETTINGS =';
        const idx = text.indexOf(marker);
        if (idx === -1) return null;
        const jsonText = text.slice(idx + marker.length).trim().replace(/;\s*$/, '');
        const parsed = JSON.parse(jsonText);
        return parsed && parsed.contact ? parsed : null;
    } catch (error) {
        console.warn('Could not load site-settings.js:', error);
        return null;
    }
}

function settingsFormHtml(settings) {
    const c = settings.contact || {};
    const a = settings.audio || {};
    const locs = Array.isArray(settings.locations) ? settings.locations : [];

    const textIn = (name, value, placeholder) =>
        '<input type="text" id="' + name + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder || '') + '">';
    const urlIn = (name, value, placeholder) =>
        '<input type="url" id="' + name + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder || '') + '">';
    const label = (text) => '<span class="field-label">' + text + '</span>';

    let html = '<div class="settings-block">';
    html += '<h3 class="settings-block-title">Contact details</h3>';
    html += '<div class="field-grid">';
    html += '<div>' + label('Email address') + textIn('s-email', c.email, 'info@…') + '</div>';
    html += '<div>' + label('WhatsApp number') + textIn('s-whatsapp', c.whatsapp, '971…') + '</div>';
    html += '<div>' + label('WhatsApp bot redirect number') + textIn('s-whatsapp-bot', c.whatsappBot, '971…') + '</div>';
    html += '<div>' + label('Instagram link') + urlIn('s-instagram', c.instagram, 'https://instagram.com/…') + '</div>';
    html += '</div></div>';

    html += '<div class="settings-block">';
    html += '<h3 class="settings-block-title">Background music</h3>';
    html += '<div class="field-grid">';
    html += '<div>' + label('Music file URL') + urlIn('s-audio-url', a.url, 'https://…/audio.mp3') + '</div>';
    html += '</div></div>';

    locs.forEach((loc, i) => {
        html += '<div class="settings-block">';
        html += '<h3 class="settings-block-title">Location ' + (i + 1) + (loc.title ? ' — ' + escapeHtml(loc.title) : '') + '</h3>';
        html += '<div class="field-grid">';
        html += '<div>' + label('Label &middot; shown in forms &amp; links') + textIn('s-loc-' + i + '-label', loc.label) + '</div>';
        html += '<div>' + label('Short name') + textIn('s-loc-' + i + '-name', loc.name) + '</div>';
        html += '<div>' + label('City / emirate label') + textIn('s-loc-' + i + '-city', loc.city) + '</div>';
        html += '<div>' + label('Title') + textIn('s-loc-' + i + '-title', loc.title) + '</div>';
        html += '<div class="field-span-2">' + label('Description') + textIn('s-loc-' + i + '-copy', loc.copy) + '</div>';
        html += '<div class="field-span-2">' + label('Address') + textIn('s-loc-' + i + '-address', loc.address) + '</div>';
        html += '<div class="field-span-2">' + label('Opening hours') + textIn('s-loc-' + i + '-hours', loc.hours) + '</div>';
        html += '<div class="field-span-2">' + label('Google Maps link') + urlIn('s-loc-' + i + '-mapsurl', loc.mapsUrl) + '</div>';
        html += '<div>' + label('Latitude') + textIn('s-loc-' + i + '-lat', loc.lat) + '</div>';
        html += '<div>' + label('Longitude') + textIn('s-loc-' + i + '-lng', loc.lng) + '</div>';
        html += '<div>' + label('Store WhatsApp number (Contact Store button)') + textIn('s-loc-' + i + '-whatsapp', loc.whatsapp, '971…') + '</div>';
        html += '</div></div>';
    });

    return html;
}

function readSettingsFromForm() {
    /* NOTE: the '#' prefix is required — document.querySelector('s-email')
       is a `<s-email>` element-type selector and matches nothing. */
    const val = (id) => {
        const el = $('#' + id);
        return el ? el.value.trim() : '';
    };
    const settings = currentSettings();

    settings.contact.email = val('s-email');
    settings.contact.whatsapp = val('s-whatsapp');
    settings.contact.whatsappBot = val('s-whatsapp-bot');
    settings.contact.instagram = val('s-instagram');
    settings.audio.url = val('s-audio-url');

    settings.locations.forEach((loc, i) => {
        loc.label = val('s-loc-' + i + '-label');
        loc.name = val('s-loc-' + i + '-name');
        loc.city = val('s-loc-' + i + '-city');
        loc.title = val('s-loc-' + i + '-title');
        loc.copy = val('s-loc-' + i + '-copy');
        loc.address = val('s-loc-' + i + '-address');
        loc.hours = val('s-loc-' + i + '-hours');
        loc.mapsUrl = val('s-loc-' + i + '-mapsurl');
        loc.lat = Number(val('s-loc-' + i + '-lat')) || 0;
        loc.lng = Number(val('s-loc-' + i + '-lng')) || 0;
        loc.whatsapp = val('s-loc-' + i + '-whatsapp');
    });

    return settings;
}

function renderSettingsForm() {
    const wrap = $('#settings-forms');
    if (!wrap) return;
    wrap.innerHTML = settingsFormHtml(currentSettings());
}

/* ===== settings actions ===== */

$('#settings-save-btn').addEventListener('click', () => {
    const settings = readSettingsFromForm();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings }));
    showStatus('Settings saved ✓ — now copy site-settings.js');
});

$('#settings-export-btn').addEventListener('click', async () => {
    /* If the form failed to render, fall back to the known data rather than
       exporting blank values. */
    let settings;
    if ($('#settings-forms') && $('#settings-forms').querySelector('input')) {
        settings = readSettingsFromForm();
    } else {
        settings = currentSettings();
    }
    try {
        await navigator.clipboard.writeText(buildSettingsFile(settings));
        showStatus('Copied site-settings.js ✓');
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('Copy failed — please copy manually', true);
    }
});

$('#settings-restore-btn').addEventListener('click', async () => {
    if (!confirm('Discard saved settings and restore the originals?')) return;
    localStorage.removeItem(SETTINGS_KEY);
    fileSettings = await loadFileSettings();
    renderSettingsForm();
    showStatus('Settings restored ✓');
});

/* ===== admin tabs ===== */

document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        $('#panel-events').classList.toggle('hidden', btn.dataset.panel !== 'events');
        $('#panel-settings').classList.toggle('hidden', btn.dataset.panel !== 'settings');
        if (btn.dataset.panel === 'settings') renderSettingsForm();
    });
});
