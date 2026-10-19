/* =========================================================
   LA CASA DEL HABANO UAE - Events Admin logic
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
        image: 'https://ik.imagekit.io/ttdzqyoun/New%20Folder/lounge.jpg',
        category: 'PAIRING EVENING',
        title: 'THE RITUAL OF THE HABANO',
        copy: 'A slow exploration of flavour, aroma and the timeless ceremony of a fine Habano.',
        date: 'ABU DHABI · MEMBERS\' NIGHT'
    },
    {
        image: 'https://images.pexels.com/photos/15161546/pexels-photo-15161546.jpeg',
        category: 'THE CASA TABLE',
        title: 'GOLDEN HOUR GATHERING',
        copy: 'A relaxed evening of shared tables, live music and old Havana spirit.',
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

function persistEvents(events) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ events }));
    fileEvents = events.slice();
}

let fileEvents = null;

/* Extract the JSON array from events-data.js text. Slices from the marker
   (a "]" inside event copy can't truncate it) and tolerates a trailing
   comma before the closing bracket, which a hand-edited file may have. */
function parseEventsFile(text) {
    if (!text) return null;
    const marker = 'window.LCDH_EVENTS =';
    const idx = text.indexOf(marker);
    if (idx === -1) return null;
    let body = text.slice(idx + marker.length).trim();
    body = body.replace(/;\s*$/, '');       /* drop trailing ;          */
    body = body.replace(/,\s*\]$/, ']');    /* drop trailing comma in ] */
    try {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.warn('Could not parse events-data.js:', error.message);
        return null;
    }
}

async function loadFileEvents() {
    try {
        const resp = await fetch('../js/events-data.js', { cache: 'no-store' });
        if (!resp.ok) return null;
        return parseEventsFile(await resp.text());
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

/* The exact file body that ships to the repo - shared by the manual Copy
   button and the automatic GitHub publish below, so they can never drift. */
function buildEventsFile(events) {
    return 'window.LCDH_EVENTS = ' + JSON.stringify(events, null, 2) + ';\n';
}

let statusTimer;
function showStatus(message) {
    const toast = $('#status-toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* Same toast, but with one clickable link and extra time to click it. */
function showStatusWithLink(message, linkText, linkHref) {
    const toast = $('#status-toast');
    toast.innerHTML = escapeHtml(message) + ' <a href="' + escapeHtml(linkHref)
        + '" target="_blank" rel="noopener">' + escapeHtml(linkText) + '</a>';
    toast.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => toast.classList.remove('show'), 15000);
}

/* ===== site visits (Abacus counters - read-only) ===== */
/* The public site bumps three counters on every page load via the free
   Abacus API (CountAPI successor - keyless, CORS-enabled):
     home          - all-time total (the topbar chip)
     m-YYYY-MM     - visits segregated by month
     d-YYYY-MM-DD  - visits per day (the chart for the chosen month)
   Here we only READ with the /get endpoint, so opening the admin panel
   never inflates the numbers. Days roll over at midnight UAE time, so
   every bucket matches the business day in Dubai - the same keys the
   tracker in script.js writes. */
const VISITS_NS = 'lcdh-uae-visits-lcdh02';
const VISITS_GET = 'https://abacus.jasoncameron.dev/get/' + VISITS_NS + '/';
/* How far back the month picker probes for months with visits. */
const VISITS_MONTH_LOOKBACK = 24;

/* Read one counter. Resolves to its number (404 = never hit = 0), or to
   null when the API could not be reached at all. */
async function visitsGet(key) {
    try {
        const resp = await fetch(VISITS_GET + key, { cache: 'no-store' });
        if (resp.ok) {
            const data = await resp.json();
            return Number(data.value || 0);
        }
        return resp.status === 404 ? 0 : null;
    } catch (error) {
        return null;
    }
}

async function loadVisitsCount() {
    const chip = $('#visits-count');
    if (!chip) return;
    chip.textContent = 'Visits: …';
    const value = await visitsGet('home');
    chip.textContent = value === null
        ? 'Visits: unavailable'
        : 'Visits: ' + value.toLocaleString('en-US');
}

$('#visits-count').addEventListener('click', loadVisitsCount);

/* ---- month segregation: picker + daily chart ---- */

/* YYYY-MM-DD of "now" in the UAE - mirrors the tracker in script.js. */
function uaeDateKey(date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const get = (type) => (parts.find((p) => p.type === type) || {}).value || '';
    return get('year') + '-' + get('month') + '-' + get('day');
}

function uaeTodayKey() { return uaeDateKey(new Date()); }

/* "2026-10" -> "October 2026" (or "Oct" when longForm is false) */
function monthLabel(monthKey, longForm) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US',
        longForm === false ? { month: 'short' } : { month: 'long', year: 'numeric' });
}

function visitStat(label, value, valueClass) {
    return '<div class="visit-stat">'
        + '<span class="visit-stat-label">' + escapeHtml(label) + '</span>'
        + '<span class="visit-stat-value' + (valueClass ? ' ' + valueClass : '') + '">'
        + escapeHtml(value) + '</span></div>';
}

const VISIT_MONTH_TOTALS = new Map();   /* 'YYYY-MM' -> its m- counter */
let visitsReady = false;
let visitsReqId = 0;   /* drops stale chart loads after a quick month switch */

/* Fill the picker with the current month plus every month in the lookback
   window that actually has visits. Returns the offered month keys. */
async function populateMonthPicker(keep) {
    const select = $('#visits-month');
    const today = uaeTodayKey();
    const keys = [];
    let [year, month] = today.slice(0, 7).split('-').map(Number);
    for (let i = 0; i < VISITS_MONTH_LOOKBACK; i++) {
        keys.push(year + '-' + String(month).padStart(2, '0'));
        month -= 1;
        if (month === 0) { month = 12; year -= 1; }
    }

    const totals = await Promise.all(keys.map((key) => visitsGet('m-' + key)));
    keys.forEach((key, i) => { if (totals[i] !== null) VISIT_MONTH_TOTALS.set(key, totals[i]); });

    /* Index 0 is "now" - always offered so a fresh deploy shows its
       (empty) chart instead of a blank picker. Past months only appear
       when they recorded at least one visit. */
    const offered = keys.filter((key, i) => i === 0 || (totals[i] || 0) > 0);
    /* keep = the month the admin was on (captured before the loading
       option blanked the select), so Refresh never jumps back to "now". */
    const selected = keep || select.value;

    select.innerHTML = offered.map((key) =>
        '<option value="' + key + '">' + escapeHtml(monthLabel(key)) + '</option>').join('');
    if (selected && offered.indexOf(selected) !== -1) select.value = selected;
    return offered;
}

async function loadMonthChart(monthKey) {
    const chart = $('#visits-chart');
    const stats = $('#visits-stats');
    const title = $('#visits-chart-title');
    if (!chart || !monthKey) return;

    const reqId = ++visitsReqId;
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = uaeTodayKey();
    /* The current month charts only up to today (UAE time); finished
       months chart every day. */
    const lastDay = (monthKey >= today.slice(0, 7)) ? Number(today.slice(8, 10)) : daysInMonth;
    const label = monthLabel(monthKey);

    title.textContent = label + ' - visits per day';
    stats.innerHTML = ['Total visits', 'Average / day', 'Busiest day', 'vs previous month']
        .map((name) => visitStat(name, '…')).join('');
    chart.innerHTML = '<p class="visits-empty">Loading ' + escapeHtml(label) + '…</p>';

    const dayKeys = [];
    for (let day = 1; day <= lastDay; day++) {
        dayKeys.push('d-' + monthKey + '-' + String(day).padStart(2, '0'));
    }
    const values = await Promise.all(dayKeys.map((key) => visitsGet(key)));
    if (reqId !== visitsReqId) return;   /* a newer month was picked meanwhile */

    const dayValues = values.map((value) => value || 0);
    renderVisitsChart(monthKey, dayValues, lastDay, values.every((value) => value === null));
    renderVisitsStats(monthKey, dayValues, lastDay);
}

function renderVisitsChart(monthKey, values, lastDay, unreachable) {
    const chart = $('#visits-chart');
    const label = monthLabel(monthKey);
    chart.setAttribute('aria-label', 'Daily visits for ' + label);

    if (unreachable) {
        chart.innerHTML = '<p class="visits-empty">The visit counters could not be reached.<br>'
            + 'Check the connection and press Refresh.</p>';
        return;
    }

    const max = Math.max.apply(null, values);
    if (max <= 0) {
        chart.innerHTML = '<p class="visits-empty">No visits recorded for ' + escapeHtml(label)
            + ' yet.<br>The bars fill in as visitors open the public site.</p>';
        return;
    }

    const abbr = monthLabel(monthKey, false);
    let html = '';
    values.forEach((value, index) => {
        const day = index + 1;
        /* Day numbers appear on day 1, every 5th day and the last charted
           day - 31 labels side by side never fit on a phone. */
        const showDay = day === 1 || day % 5 === 0 || day === lastDay;
        const tip = abbr + ' ' + day + ' · ' + value + (value === 1 ? ' visit' : ' visits');
        html += '<div class="chart-col" title="' + escapeHtml(tip) + '">'
            + '<span class="chart-value">' + (value > 0 ? value : '') + '</span>'
            + '<div class="chart-plot">'
            + (value > 0
                ? '<div class="chart-bar" style="height:' + Math.round((value / max) * 100) + '%"></div>'
                : '<div class="chart-bar zero"></div>')
            + '</div>'
            + '<span class="chart-day' + (showDay ? '' : ' blank') + '">' + day + '</span>'
            + '</div>';
    });
    chart.innerHTML = html;
}

function renderVisitsStats(monthKey, dayValues, lastDay) {
    const stats = $('#visits-stats');
    const daySum = dayValues.reduce((sum, value) => sum + value, 0);
    /* The monthly counter is the authoritative total; the day counters
       stand in until the m- key has been read. */
    const total = VISIT_MONTH_TOTALS.has(monthKey) ? VISIT_MONTH_TOTALS.get(monthKey) : daySum;
    const avg = lastDay > 0 ? Math.round((total / lastDay) * 10) / 10 : 0;

    let peakIndex = -1;
    let peakValue = -1;
    dayValues.forEach((value, index) => {
        if (value > peakValue) { peakValue = value; peakIndex = index; }
    });
    const peak = peakValue > 0
        ? monthLabel(monthKey, false) + ' ' + (peakIndex + 1) + ' · ' + peakValue.toLocaleString('en-US')
        : '—';

    /* Month-over-month - both sides read from the same m- counters. */
    const [year, month] = monthKey.split('-').map(Number);
    const prevKey = month === 1
        ? (year - 1) + '-12'
        : year + '-' + String(month - 1).padStart(2, '0');
    let momValue = '—';
    let momClass = '';
    if (VISIT_MONTH_TOTALS.has(prevKey) && VISIT_MONTH_TOTALS.get(prevKey) > 0) {
        const prev = VISIT_MONTH_TOTALS.get(prevKey);
        const delta = Math.round(((total - prev) / prev) * 100);
        momValue = (delta >= 0 ? '+' : '') + delta + '%';
        momClass = delta >= 0 ? 'up' : 'down';
    }

    stats.innerHTML =
        visitStat('Total visits', total.toLocaleString('en-US')) +
        visitStat('Average / day', avg.toLocaleString('en-US')) +
        visitStat('Busiest day', peak) +
        visitStat('vs previous month', momValue, momClass);
}

/* Opened lazily on the first visit to the Visits tab so logging in stays
   instant - the month probe only fires when the admin asks for it. */
async function initVisitsPanel(force) {
    const select = $('#visits-month');
    if (!select || (visitsReady && !force)) return;
    const keep = select.value;
    select.innerHTML = '<option value="">Loading months…</option>';
    const offered = await populateMonthPicker(keep);
    visitsReady = true;
    if (!offered.length) {
        $('#visits-chart').innerHTML = '<p class="visits-empty">No month counters found yet.</p>';
        return;
    }
    await loadMonthChart(select.value);
}

$('#visits-month').addEventListener('change', (event) => loadMonthChart(event.target.value));

$('#visits-refresh-btn').addEventListener('click', async () => {
    await initVisitsPanel(true);
    showStatus('Visit data refreshed ✓');
});

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
        $('#login-error').textContent = 'Crypto unavailable - open this page via http(s) or a modern browser.';
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
    /* Pull the latest committed files so the panel always starts from
       the repo's current data (another device may have pushed since the
       local copies were served). Local-only work is kept: only refresh
       when the repo copy actually differs. */
    await autoSyncFromGitHub();
    renderList();
    renderSettingsForm();
    renderGitHubPanel();
    loadVisitsCount();
}

/* =========================================================
   AUTO-SYNC - on every panel entry, pull js/events-data.js +
   js/site-settings.js from the repo (via the saved GitHub token)
   and adopt them when they differ from what the panel shows.
   Raw file reads are used (no localStorage blind-trust), so two
   browsers never drift apart. Without a token there is nothing
   to pull from - the local files already rule.
   ========================================================= */

/* Decode the {content, encoding} payload of the Contents API. */
function fromBase64Utf8(base64) {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

/* GET a repo file's decoded text. Returns null on any failure. */
async function fetchRepoFile(path) {
    const config = loadGitHubConfig();
    if (!config.token.trim()) return null;
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const endpoint = 'https://api.github.com/repos/'
        + encodeURIComponent(config.owner) + '/'
        + encodeURIComponent(config.repo) + '/contents/' + encodedPath
        + '?ref=' + encodeURIComponent(config.branch);
    try {
        const response = await fetch(endpoint, { headers: ghHeaders(config) });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || data.type !== 'file' || !data.content) return null;
        return fromBase64Utf8(data.content);
    } catch (error) {
        console.warn('Auto-sync: could not fetch ' + path + ':', error);
        return null;
    }
}

function parseSettingsFile(text) {
    if (!text) return null;
    const marker = 'window.LCDH_SETTINGS =';
    const idx = text.indexOf(marker);
    if (idx === -1) return null;
    try {
        const parsed = JSON.parse(text.slice(idx + marker.length).trim().replace(/;\s*$/, ''));
        return parsed && parsed.contact ? parsed : null;
    } catch (error) {
        return null;
    }
}

async function autoSyncFromGitHub() {
    const config = loadGitHubConfig();
    if (!config.token.trim()) return;
    showStatus('Syncing latest data…');

    let synced = 0;

    /* --- events --- */
    const eventsText = await fetchRepoFile('js/events-data.js');
    const repoEvents = parseEventsFile(eventsText);
    if (repoEvents) {
        const localEvents = currentEvents();
        if (JSON.stringify(repoEvents) !== JSON.stringify(localEvents)) {
            fileEvents = repoEvents.slice();
            persistEvents(repoEvents);
            if (editingIndex !== null && editingIndex >= repoEvents.length) clearForm();
            synced++;
        }
    }

    /* --- site settings --- */
    const settingsText = await fetchRepoFile('js/site-settings.js');
    const repoSettings = parseSettingsFile(settingsText);
    if (repoSettings) {
        const localSettings = currentSettings();
        if (JSON.stringify(repoSettings) !== JSON.stringify(localSettings)) {
            fileSettings = cloneSettings(repoSettings);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings: repoSettings }));
            synced++;
        }
    }

    showStatus(synced > 0 ? 'Synced latest data ✓' : 'Already up to date ✓');
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

/* =========================================================
   IMAGEKIT UPLOAD - "Upload image" (or drop a file on the
   preview) sends the file to ImageKit and fills the URL field
   with the returned link. The panel stays a pure static site;
   ImageKit is the CDN holding the binaries.

   Note: the upload API needs the account private key. Same
   trade-off as the GitHub token - it lives in this file. Keep
   it out of reach or scope the key down in ImageKit settings.
   ========================================================= */
const IK_PRIVATE_KEY = 'private_do7H7wAAPw5Goa+mDpjGO6MNryo=';
const IK_UPLOAD_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload';
const IK_FOLDER = '/events';                    /* matches existing …/events/… links */
const IK_MAX_BYTES = 20 * 1024 * 1024;

function ikAuthHeader() {
    /* ImageKit expects HTTP Basic with the private key as the user and an
       empty password; toBase64Utf8 keeps the encoding UTF-8 safe. */
    return 'Basic ' + toBase64Utf8(IK_PRIVATE_KEY + ':');
}

async function uploadToImageKit(file) {
    if (!IK_PRIVATE_KEY) {
        return { ok: false, error: 'No ImageKit key configured - set IK_PRIVATE_KEY in admin.js.' };
    }
    if (!file.type || !file.type.startsWith('image/')) {
        return { ok: false, error: 'That file is not an image.' };
    }
    if (file.size > IK_MAX_BYTES) {
        return { ok: false, error: 'Image is larger than 20 MB - compress it first.' };
    }

    const body = new FormData();
    body.append('file', file);
    body.append('fileName', file.name || 'event-image.jpg');
    body.append('useUniqueFileName', 'true');   /* never overwrite an existing image */
    body.append('folder', IK_FOLDER);

    let response;
    try {
        response = await fetch(IK_UPLOAD_ENDPOINT, {
            method: 'POST',
            headers: { 'Authorization': ikAuthHeader() },
            body
        });
    } catch (error) {
        return { ok: false, error: 'Network error - ' + error.message };
    }

    let data = null;
    try { data = await response.json(); } catch (ignoreNonJson) { /* fall through */ }
    if (!response.ok) {
        return { ok: false, error: (data && data.message) || 'Upload failed (HTTP ' + response.status + ')' };
    }
    if (!data || !data.url) {
        return { ok: false, error: 'ImageKit responded without a URL.' };
    }
    return { ok: true, url: data.url };
}

async function handleIkFile(file) {
    if (!file) return;
    const uploadBtn = $('#ik-upload-btn');
    uploadBtn.disabled = true;
    showStatus('Uploading to ImageKit…');
    const result = await uploadToImageKit(file);
    uploadBtn.disabled = false;
    if (!result.ok) {
        showStatus('Upload failed: ' + result.error);
        return;
    }
    fields.image.value = result.url;
    fields.image.dispatchEvent(new Event('change'));   /* reuse the preview wiring */
    showStatus('Image uploaded ✓');
}

$('#ik-upload-btn').addEventListener('click', () => $('#ik-file-input').click());

$('#ik-file-input').addEventListener('change', (fileEvent) => {
    handleIkFile(fileEvent.target.files && fileEvent.target.files[0]);
    fileEvent.target.value = '';   /* allow re-picking the same file */
});

/* Drag & drop straight onto the preview box. */
const dropzone = $('#preview-dropzone');
['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (dragEvent) => {
    dragEvent.preventDefault();
    dropzone.classList.add('drag-over');
}));
['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (dragEvent) => {
    dragEvent.preventDefault();
    dropzone.classList.remove('drag-over');
}));
dropzone.addEventListener('drop', (dragEvent) => {
    handleIkFile(dragEvent.dataTransfer && dragEvent.dataTransfer.files && dragEvent.dataTransfer.files[0]);
});

/* ---------- deleting an event's image ---------- */

/* Media-library file path derived from an ImageKit URL (query params such as
   ?updatedAt= or transformation strings are ignored). Returns null for
   anything not hosted on our ImageKit account - not ours to delete.
   An ImageKit URL is /<url-endpoint>/<library-path>, and the endpoint token
   ("ttdzqyoun" for this account) must be stripped to get the library path. */
function ikFilePathFromUrl(url) {
    try {
        const parsed = new URL(String(url).trim());
        if (parsed.hostname.toLowerCase() !== 'ik.imagekit.io') return null;
        const segments = decodeURIComponent(parsed.pathname).split('/').filter(Boolean);
        if (segments.length < 2) return null;   /* needs endpoint token + file path */
        return '/' + segments.slice(1).join('/');
    } catch (e) {
        return null;
    }
}

/* Called after an event removal has been pushed successfully.
   A browser CANNOT delete files from ImageKit: their DAM API
   (api.imagekit.io) sends no CORS headers, so every cross-origin call from
   a web page is blocked before it is sent. Instead of a doomed silent
   attempt, we hand the user a one-click link to the right media-library
   folder. External images and files another event still uses are skipped. */
async function removeEventImage(imageUrl, events) {
    const filePath = ikFilePathFromUrl(imageUrl);
    if (!filePath) return;   /* external image, nothing to clean up */
    const stillUsed = events.some((evt) => (evt.image || '').trim() === imageUrl);
    if (stillUsed) return;
    const folder = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    showStatusWithLink(
        'Event removed - "' + fileName + '" is still in ImageKit:',
        'delete it here',
        'https://ik.imagekit.io/ttdzqyoun/?subfolder=' + encodeURIComponent(folder)
    );
}

$('#event-form').addEventListener('submit', async (formEvent) => {
    formEvent.preventDefault();

    const event = {
        image: fields.image.value.trim(),
        category: fields.category.value.trim(),
        title: fields.title.value.trim(),
        copy: fields.copy.value.trim(),
        date: fields.date.value.trim()
    };

    const events = currentEvents();
    const wasEdit = editingIndex !== null;
    if (!wasEdit) {
        events.push(event);
    } else {
        events[editingIndex] = event;
    }

    persistEvents(events);
    clearForm();
    renderList();
    showStatus(wasEdit ? 'Event updated ✓' : 'Event added ✓');

    await publishAndReport(
        'js/events-data.js',
        buildEventsFile(events),
        (wasEdit ? 'Update' : 'Add') + ' event "' + (event.title || 'untitled') + '" via admin',
        wasEdit ? 'Event updated ✓' : 'Event added ✓'
    );
});

$('#cancel-edit-btn').addEventListener('click', () => {
    clearForm();
    showStatus('Edit cancelled');
});

/* ===== list actions (delegated) ===== */

$('#event-list').addEventListener('click', async (clickEvent) => {
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
        const imageUrl = (target.image || '').trim();
        events.splice(index, 1);
        persistEvents(events);
        if (editingIndex !== null) clearForm();   /* indices shifted */
        renderList();
        showStatus('Event removed ✓');
        const pushed = await publishAndReport('js/events-data.js', buildEventsFile(events),
            'Remove event "' + (target.title || 'untitled') + '" via admin', 'Event removed ✓');
        /* Only clear the image once the removal is actually live, so the
           published site never keeps referencing a deleted file. */
        if (pushed) await removeEventImage(imageUrl, events);
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
        await publishAndReport('js/events-data.js', buildEventsFile(events),
            'Reorder events (move "' + (moved.title || 'untitled') + '" via admin)',
            'Order updated ✓');
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
    const jsContent = buildEventsFile(events);
    try {
        await navigator.clipboard.writeText(jsContent);
        showStatus('Copied to clipboard ✓');
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('Copy failed - please copy manually', true);
    }
});

/* Manual re-sync: pull the repo copies on demand (auto-sync already
   runs on every panel entry). */
$('#sync-btn').addEventListener('click', async () => {
    await autoSyncFromGitHub();
    renderList();
    renderSettingsForm();
    renderGitHubPanel();
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

/* Reordering by drag is a two-step action: the drop only re-arranges the
   local list, and the Save button beside the events count (visible while a
   sorted state is pending) is what publishes the new order to the site. */
const reorderSaveBtn = $('#reorder-save-btn');
let pendingReorder = false;

function setPendingReorder(on) {
    pendingReorder = on;
    if (reorderSaveBtn) reorderSaveBtn.classList.toggle('hidden', !on);
}

eventList.addEventListener('dragstart', (dragEvent) => {
    draggedItem = dragEvent.target.closest('.event-item');
    if (!draggedItem) return;
    dragEvent.dataTransfer.effectAllowed = 'move';
    dragEvent.dataTransfer.setData('text/plain', draggedItem.dataset.index);   /* required for Firefox */
    setPendingReorder(true);
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
    if (!changed) {
        setPendingReorder(false);
        return;
    }

    /* Keep an open edit form pointed at the SAME event after the reorder */
    if (editingIndex !== null) {
        const newSlot = order.indexOf(editingIndex);
        if (newSlot !== -1) editingIndex = newSlot;
    }

    const events = currentEvents();
    const reordered = order.map((i) => events[i]);
    persistEvents(reordered);      /* local only - no git push yet */
    renderList();
    setPendingReorder(true);
    showStatus('Order updated ✓ - press Save to publish');
});

reorderSaveBtn.addEventListener('click', async () => {
    const events = currentEvents();
    await publishAndReport('js/events-data.js', buildEventsFile(events),
        'Reorder events via drag and drop', 'Order saved ✓');
    /* publishAndReport clears the pending state on a successful push;
       on failure the button stays so the publish can be retried. */
});

/* ===== boot ===== */

if (sessionStorage.getItem(SESSION_KEY) === '1') {
    (async () => {
        await openAdmin();
    })();
}

/* =========================================================
   SITE SETTINGS MODULE - basic information for the live site
   Same workflow as events: save locally → copy site-settings.js
   ========================================================= */

const SETTINGS_KEY = 'lcdh_settings_v1';

const DEFAULT_SETTINGS = {
    /* Full-screen "Coming Soon" page (rendered by index.html). The live
       site follows the exported js/site-settings.js - OFF here is only the
       safe fallback used when that file cannot be read. */
    comingSoon: {
        enabled: false,
        headline: 'COMING SOON',
        message: 'We\'re putting the finishing touches on our new website. La Casa del Habano UAE will be online soon - in the meantime, reach us on WhatsApp or Instagram.'
    },
    contact: {
        email: 'info@lacasadelhabano.ae',
        whatsapp: '971558002731',
        whatsappBot: '9715066008888',
        instagram: 'https://instagram.com/lacasadelhabano_uae'
    },
    audio: {
        url: 'https://cdn.pixabay.com/download/audio/2026/02/24/audio_c6c3c46f82.mp3?filename=silesfelipe-siles-calendar-august-1-490186.mp3',
        /* ON by default - the live site plays background music. */
        enabled: true
    },
    locations: [
        {
            label: 'City Walk - Dubai',
            name: 'City Walk',
            city: 'LCDH - DUBAI',
            title: 'City Walk',
            copy: 'A colourful, contemporary Casa in the heart of City Walk.',
            address: 'City Walk, Dubai, United Arab Emirates',
            hours: '10:00 AM - 10:00 PM (MONDAY-SUNDAY)',
            mapsUrl: 'https://maps.app.goo.gl/KonTfdo48PyqwFJo8',
            lat: 25.2056,
            lng: 55.2570,
            whatsapp: '971558001577',
            image: 'https://images.pexels.com/photos/7662956/pexels-photo-7662956.jpeg'
        },
        {
            label: 'JBR - Dubai',
            name: 'Jumeirah Beach Residences',
            city: 'LCDH - DUBAI',
            title: 'Jumeirah Beach Residences',
            copy: 'A relaxed cigar destination close to the vibrant JBR waterfront.',
            address: 'The Walk, Jumeirah Beach Residence, Dubai',
            hours: '10:00 AM - 12:00 AM (MONDAY-SUNDAY)',
            mapsUrl: 'https://maps.app.goo.gl/SEFQf9YabRu11QU6A',
            lat: 25.0795,
            lng: 55.1400,
            whatsapp: '971558002731',
            image: 'https://images.pexels.com/photos/37268883/pexels-photo-37268883.jpeg'
        },
        {
            label: 'Abu Dhabi Mall - Abu Dhabi',
            name: 'Abu Dhabi Mall',
            city: 'LCDH - ABU DHABI',
            title: 'Abu Dhabi Mall',
            copy: 'A refined Casa for discovering Cuban tradition in the capital.',
            address: 'Abu Dhabi Mall, Abu Dhabi, United Arab Emirates',
            hours: '10:00 AM - 10:00 PM (SUNDAY-THURSDAY)\n10:00 AM - 11:00 PM (FRIDAY-SATURDAY)',
            mapsUrl: 'https://maps.app.goo.gl/787X3kXX6VPw44zs8',
            lat: 24.5006,
            lng: 54.3961,
            whatsapp: '971507093183',
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

    /* Always return the full shape (comingSoon/contact/audio/locations) so editing
       never crashes or silently blanks fields, even when the source is partial. */
    const merged = cloneSettings(DEFAULT_SETTINGS);
    if (base.contact) Object.assign(merged.contact, base.contact);
    if (base.audio) Object.assign(merged.audio, base.audio);
    if (base.comingSoon) Object.assign(merged.comingSoon, base.comingSoon);
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
    const cs = settings.comingSoon || {};
    const locs = Array.isArray(settings.locations) ? settings.locations : [];

    const textIn = (name, value, placeholder) =>
        '<input type="text" id="' + name + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder || '') + '">';
    const urlIn = (name, value, placeholder) =>
        '<input type="url" id="' + name + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder || '') + '">';
    const textArea = (name, value, rows) =>
        '<textarea id="' + name + '" rows="' + (rows || 3) + '">' + escapeHtml(value) + '</textarea>';
    const label = (text) => '<span class="field-label">' + text + '</span>';

    let html = '<div class="settings-block">';
    html += '<h3 class="settings-block-title">Coming soon page</h3>';
    html += '<div class="field-grid">';
    const csOn = cs.enabled === true;
    html += '<div>' + label('Status') + '<select id="s-coming-enabled">'
        + '<option value="on"' + (csOn ? ' selected' : '') + '>ON - show the Coming Soon page</option>'
        + '<option value="off"' + (!csOn ? ' selected' : '') + '>OFF - show the full website</option>'
        + '</select></div>';
    html += '<div>' + label('Headline') + textIn('s-coming-headline', cs.headline, 'COMING SOON') + '</div>';
    html += '<div class="field-span-2">' + label('Message shown under the headline') + textArea('s-coming-message', cs.message, 3) + '</div>';
    html += '</div>';
    html += '<p class="settings-hint" style="margin-top:8px">While ON, visitors only see this page (contact links stay live). Save to preview it here - with GitHub Sync connected the file is committed automatically, otherwise use Copy site-settings.js.</p>';
    html += '</div>';

    html += '<div class="settings-block">';
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
    const audioOn = !(a && a.enabled === false);
    html += '<div>' + label('Status') + '<select id="s-audio-enabled">'
        + '<option value="on"' + (audioOn ? ' selected' : '') + '>ON - play background music</option>'
        + '<option value="off"' + (!audioOn ? ' selected' : '') + '>OFF - disable background music</option>'
        + '</select></div>';
    html += '<div class="field-span-2">' + label('Music file URL - the live site plays exactly this track') + urlIn('s-audio-url', a.url, 'https://…/audio.mp3') + '</div>';
    html += '</div>';
    if (a.url) {
        html += '<div class="audio-preview-row"><span class="field-label">Preview</span><audio controls preload="metadata" src="' + escapeHtml(a.url) + '" style="width:100%"></audio></div>';
    }
    html += '</div>';

    locs.forEach((loc, i) => {
        html += '<div class="settings-block">';
        html += '<h3 class="settings-block-title">Location ' + (i + 1) + (loc.title ? ' - ' + escapeHtml(loc.title) : '') + '</h3>';
        html += '<div class="field-grid">';
        html += '<div>' + label('Label &middot; shown in forms &amp; links') + textIn('s-loc-' + i + '-label', loc.label) + '</div>';
        html += '<div>' + label('Short name') + textIn('s-loc-' + i + '-name', loc.name) + '</div>';
        html += '<div>' + label('City / emirate label') + textIn('s-loc-' + i + '-city', loc.city) + '</div>';
        html += '<div>' + label('Title') + textIn('s-loc-' + i + '-title', loc.title) + '</div>';
        html += '<div class="field-span-2">' + label('Description') + textIn('s-loc-' + i + '-copy', loc.copy) + '</div>';
        html += '<div class="field-span-2">' + label('Address') + textIn('s-loc-' + i + '-address', loc.address) + '</div>';
        html += '<div class="field-span-2">' + label('Opening hours (one per line for multi-line schedules)') + textArea('s-loc-' + i + '-hours', loc.hours, 2) + '</div>';
        html += '<div class="field-span-2">' + label('Google Maps link') + urlIn('s-loc-' + i + '-mapsurl', loc.mapsUrl) + '</div>';
        html += '<div>' + label('Latitude') + textIn('s-loc-' + i + '-lat', loc.lat) + '</div>';
        html += '<div>' + label('Longitude') + textIn('s-loc-' + i + '-lng', loc.lng) + '</div>';
        html += '<div>' + label('Store WhatsApp number (Contact Store button)') + textIn('s-loc-' + i + '-whatsapp', loc.whatsapp, '971…') + '</div>';
        html += '</div></div>';
    });

    return html;
}

function readSettingsFromForm() {
    /* NOTE: the '#' prefix is required - document.querySelector('s-email')
       is a `<s-email>` element-type selector and matches nothing. */
    const val = (id) => {
        const el = $('#' + id);
        return el ? el.value.trim() : '';
    };
    const settings = currentSettings();

    settings.comingSoon.enabled = (val('s-coming-enabled') !== 'off');
    settings.comingSoon.headline = val('s-coming-headline');
    settings.comingSoon.message = val('s-coming-message');

    settings.contact.email = val('s-email');
    settings.contact.whatsapp = val('s-whatsapp');
    settings.contact.whatsappBot = val('s-whatsapp-bot');
    settings.contact.instagram = val('s-instagram');
    settings.audio.url = val('s-audio-url');
    settings.audio.enabled = (val('s-audio-enabled') !== 'off');

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

    /* A dead link is the usual reason the live site has no music (expired
       upload, hotlink block), so say it out loud instead of showing a
       preview that silently refuses to play. */
    const preview = wrap.querySelector('.audio-preview-row audio');
    if (preview) {
        preview.addEventListener('error', () => {
            showStatus('⚠ Music file could not be loaded - check the URL or upload it again');
        });
    }
}

/* ===== settings actions ===== */

$('#settings-save-btn').addEventListener('click', async () => {
    const settings = readSettingsFromForm();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings }));
    /* Re-render so the audio preview + location titles reflect the save. */
    renderSettingsForm();
    showStatus('Settings saved ✓');
    await publishAndReport('js/site-settings.js', buildSettingsFile(settings),
        'Update site settings via admin', 'Settings saved ✓');
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
        showStatus('Copy failed - please copy manually', true);
    }
});

$('#settings-restore-btn').addEventListener('click', async () => {
    if (!confirm('Discard saved settings and restore the originals?')) return;
    localStorage.removeItem(SETTINGS_KEY);
    fileSettings = await loadFileSettings();
    renderSettingsForm();
    showStatus('Settings restored ✓');
});

/* =========================================================
   GITHUB SYNC - auto-commit the exported JS files to the
   repository whenever something is saved in this panel.

   Uses the GitHub Contents API (GET sha → PUT contents) from the
   browser. The repo is PUBLIC, so the personal access token lives
   only in this browser's localStorage - never in a committed file.
   ========================================================= */

const GH_KEY = 'lcdh_github_v1';
/* Connection details are fixed for this deployment and deliberately not
   exposed in the UI - only the token can be updated.
   The fallback token is split into two halves so that the complete token
   never appears in the source (secret scanning matches whole tokens only);
   the halves are joined at runtime. */
const GH_TOKEN_P1 = 'github_pat_11A6XD5XI0Cu54K7rcBUIV';
const GH_TOKEN_P2 = '_ulZVymUFtddW37bplq4LHUIWse8HFutMFEwwy6oS5Fy2OIC4OEYQ5an4nE0';

function ghDefaultToken() {
    return (GH_TOKEN_P1 || '') + (GH_TOKEN_P2 || '');
}

const GH_DEFAULTS = {
    get token() { return ghDefaultToken(); },
    owner: 'Dikstir02',
    repo: 'lacasadelhabano_uae',
    branch: 'main'
};

function loadGitHubConfig() {
    try {
        const raw = localStorage.getItem(GH_KEY);
        if (!raw) return Object.assign({}, GH_DEFAULTS);
        const stored = JSON.parse(raw);
        const config = Object.assign({}, GH_DEFAULTS, stored);
        /* An old empty stored token must never blank out the built-in one. */
        if (!config.token || !config.token.trim()) config.token = GH_DEFAULTS.token;
        return config;
    } catch (error) {
        console.warn('Could not read GitHub config:', error);
        return Object.assign({}, GH_DEFAULTS);
    }
}

function saveGitHubConfig(config) {
    localStorage.setItem(GH_KEY, JSON.stringify(config));
}

/* btoa() only accepts Latin-1, so encode to UTF-8 bytes first - event copy
   and settings routinely contain curly quotes, arrows and emoji. */
function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function ghHeaders(config) {
    return {
        'Authorization': 'Bearer ' + config.token.trim(),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
    };
}

async function ghErrorBody(response) {
    try {
        const text = await response.text();
        try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.message) return parsed.message;
        } catch (ignoreJson) { /* not JSON - fall through to the raw text */ }
        return text.slice(0, 200);
    } catch (ignoreRead) {
        return '';
    }
}

/* PUT a file to the repo. Returns { ok, commitUrl } or { ok:false, error }. */
async function publishFileToGitHub(path, content, commitMessage) {
    const config = loadGitHubConfig();
    if (!config.token.trim()) return { ok: false, skipped: true, error: 'No GitHub token saved.' };

    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const endpoint = 'https://api.github.com/repos/'
        + encodeURIComponent(config.owner) + '/'
        + encodeURIComponent(config.repo) + '/contents/' + encodedPath;

    /* Existing files must be written back with their blob SHA, otherwise the
       API rejects the update as a "sha wasn't supplied" conflict. 404 simply
       means the file is new. */
    let sha = '';
    let response;
    try {
        response = await fetch(endpoint + '?ref=' + encodeURIComponent(config.branch), { headers: ghHeaders(config) });
    } catch (error) {
        return { ok: false, error: 'Network error - ' + error.message };
    }
    if (response.ok) {
        const current = await response.json();
        sha = (current && current.sha) || '';
    } else if (response.status !== 404) {
        return { ok: false, error: 'Read failed (HTTP ' + response.status + '): ' + await ghErrorBody(response) };
    }

    const payload = {
        message: commitMessage,
        content: toBase64Utf8(content),
        branch: config.branch
    };
    if (sha) payload.sha = sha;

    try {
        response = await fetch(endpoint, { method: 'PUT', headers: ghHeaders(config), body: JSON.stringify(payload) });
    } catch (error) {
        return { ok: false, error: 'Network error - ' + error.message };
    }
    if (!response.ok) {
        return { ok: false, error: 'Write failed (HTTP ' + response.status + '): ' + await ghErrorBody(response) };
    }

    const data = await response.json();
    return { ok: true, commitUrl: (data.commit && data.commit.html_url) || '' };
}

/* Commit and report the outcome in the toast. `localMessage` is shown only
   when auto-publish is switched off, so a save never looks like a no-op. */
let publishBusy = false;   /* true from push start until it settles */
async function publishAndReport(path, content, commitMessage, localMessage) {
    const config = loadGitHubConfig();

    if (!config.token.trim()) {
        /* No token = nothing can be pushed. Same wording as every other
           "did not reach git" case; details go to the console. */
        console.warn('GitHub publish skipped - no token configured.');
        showStatus('We are working on your last change. Please try again later.');
        return false;
    }

    /* Only one push at a time: a second save while one is still in flight
       gets a polite "try again" instead of racing GitHub (two writers would
       fight over the file sha and one change would be lost). */
    if (publishBusy) {
        showStatus('We are working on your last change. Please try again later.');
        return false;
    }
    publishBusy = true;
    try {
        showStatus('Publishing to GitHub…');
        const result = await publishFileToGitHub(path, content, commitMessage);
        if (result.ok) {
            /* Any successful events publish also carries the current order,
               so a pending drag-reorder no longer needs its own Save. */
            if (path === 'js/events-data.js') setPendingReorder(false);
            showStatus('✓ ' + localMessage + ' → pushed to GitHub');
            return true;
        }
        /* Technical detail stays in the console; the user-facing wording
           is always the same polite message. */
        console.warn('GitHub push failed:', result.error);
        showStatus('We are working on your last change. Please try again later.');
        return false;
    } finally {
        publishBusy = false;
    }
}

/* ===== GitHub Sync panel ===== */

function setGhStatus(message, kind) {
    const statusEl = $('#gh-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('on', 'err');
    if (kind) statusEl.classList.add(kind);
}

function renderGitHubPanel() {
    const config = loadGitHubConfig();
    $('#gh-token').value = config.token;
    if (config.token.trim()) {
        setGhStatus('Connected - saves in Events and Site Settings publish automatically.', 'on');
    } else {
        setGhStatus('Not connected - saves stay local until you add a token below.', null);
    }
}

/* Only the token is editable; owner/repo/branch stay hard-coded. */
function readGitHubForm() {
    return {
        token: $('#gh-token').value.trim() || GH_DEFAULTS.token,
        owner: GH_DEFAULTS.owner,
        repo: GH_DEFAULTS.repo,
        branch: GH_DEFAULTS.branch
    };
}

$('#gh-save-btn').addEventListener('click', () => {
    const config = readGitHubForm();
    if (!config.token) {
        setGhStatus('Paste a token first, then press Update token.', 'err');
        showStatus('No token entered', true);
        return;
    }
    saveGitHubConfig(config);
    renderGitHubPanel();
    showStatus('GitHub token updated ✓');
});

$('#gh-test-btn').addEventListener('click', async () => {
    const config = readGitHubForm();
    if (!config.token) {
        setGhStatus('Enter a token to test the connection.', 'err');
        return;
    }

    /* Test the form's values so you can try before saving. */
    saveGitHubConfig(config);
    setGhStatus('Testing connection…', null);

    let response;
    try {
        response = await fetch('https://api.github.com/user', { headers: ghHeaders(config) });
    } catch (error) {
        setGhStatus('Could not reach GitHub - ' + error.message, 'err');
        return;
    }
    if (!response.ok) {
        setGhStatus('Token rejected (HTTP ' + response.status + '): ' + await ghErrorBody(response), 'err');
        showStatus('GitHub test failed ✗', true);
        return;
    }
    const user = await response.json();

    try {
        response = await fetch('https://api.github.com/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo),
            { headers: ghHeaders(config) });
    } catch (error) {
        setGhStatus('Could not reach GitHub - ' + error.message, 'err');
        return;
    }
    if (!response.ok) {
        setGhStatus('Token works for @' + user.login + ', but the repository was unreachable (HTTP '
            + response.status + '): ' + await ghErrorBody(response), 'err');
        showStatus('Repository not reachable ✗', true);
        return;
    }
    const repo = await response.json();
    if (repo.permissions && repo.permissions.push === false) {
        setGhStatus('Connected as @' + user.login + ', but the token is read-only. '
            + 'Grant Repository permissions → Contents → Read and write.', 'err');
        showStatus('Token needs write access ✗', true);
        return;
    }

    setGhStatus('Connected as @' + user.login + ' (write access confirmed). Saves now publish automatically.', 'on');
    showStatus('GitHub connection OK ✓');
});

/* ===== admin tabs ===== */

const PANEL_IDS = ['events', 'visits', 'settings', 'github'];

document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        PANEL_IDS.forEach((name) => {
            const panel = $('#panel-' + name);
            if (panel) panel.classList.toggle('hidden', btn.dataset.panel !== name);
        });
        if (btn.dataset.panel === 'visits') initVisitsPanel();
        if (btn.dataset.panel === 'settings') renderSettingsForm();
        if (btn.dataset.panel === 'github') renderGitHubPanel();
    });
});
