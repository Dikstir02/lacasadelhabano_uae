/* =========================================================
   LA CASA DEL HABANO UAE
   Background audio autoplay (with admin-managed URL)
   ========================================================= */

(() => {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    /* The track is whatever is set on the admin panel:
       1) the panel's latest save (localStorage `lcdh_settings_v1`), so a
          change in /admin applies on next reload without exporting, then
       2) the exported js/site-settings.js value, then
       3) the <source> already in index.html.
       The panel also has an ON/OFF switch (`audio.enabled`, default ON);
       when OFF the player is disabled and hidden. */
    const SETTINGS_KEY = 'lcdh_settings_v1';

    function readAdminAudio() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const audio = parsed && parsed.settings && parsed.settings.audio;
                if (audio && typeof audio === 'object') {
                    return {
                        url: audio.url && String(audio.url).trim() ? String(audio.url).trim() : '',
                        enabled: audio.enabled !== false
                    };
                }
            }
        } catch (e) { /* storage unavailable — fall through */ }
        const fileAudio = window.LCDH_SETTINGS && window.LCDH_SETTINGS.audio;
        return {
            url: fileAudio && fileAudio.url && String(fileAudio.url).trim() ? String(fileAudio.url).trim() : '',
            enabled: !(fileAudio && fileAudio.enabled === false)
        };
    }

    let adminAudio = readAdminAudio();
    const sourceEl = audio.querySelector('source');

    /* The URL shipped in index.html, captured before anything can rewrite it
       — the last-resort fallback track. */
    const htmlSourceUrl = sourceEl
        ? (sourceEl.getAttribute('src') || '')
        : (audio.getAttribute('src') || '');

    function applyAdminUrl(url) {
        if (!url) return false;
        const current = sourceEl ? (sourceEl.getAttribute('src') || '') : (audio.getAttribute('src') || audio.currentSrc || '');
        if (current === url) return false;
        if (sourceEl) sourceEl.src = url;
        else audio.src = url;
        audio.load();
        return true;
    }
    applyAdminUrl(adminAudio.url);

    /* A saved track that has since been deleted (S3 `AccessDenied`, expired
       upload) used to leave the site silent AND the toggle dead, so the music
       could never be turned back on. Keep the admin-saved URL first, then the
       exported settings file, then the <source> in index.html, and step down
       that list on error — the toggle only goes dead when all of them fail. */
    const settingsFileAudio = window.LCDH_SETTINGS && window.LCDH_SETTINGS.audio;
    const settingsFileUrl = settingsFileAudio && settingsFileAudio.url
        ? String(settingsFileAudio.url).trim()
        : '';

    function buildCandidates(savedUrl) {
        const out = [];
        [savedUrl, settingsFileUrl, htmlSourceUrl].forEach((url) => {
            if (url && out.indexOf(url) === -1) out.push(url);
        });
        return out;
    }

    let candidates = buildCandidates(adminAudio.url);
    let candidateIndex = 0;

    /* OFF in the panel = hide the toggle + never attempt playback. */
    const toggle = document.getElementById('audio-toggle');
    if (!adminAudio.enabled) {
        if (toggle) toggle.style.display = 'none';
        try { audio.pause(); } catch (e) { /* noop */ }
        audio.removeAttribute('src');
        if (sourceEl) sourceEl.removeAttribute('src');
        return;
    }

    /* If the panel is saved in another tab while this page is open,
       honour the new switch + track without a reload (keeps mute state). */
    window.addEventListener('storage', (e) => {
        if (e.key !== SETTINGS_KEY) return;
        const next = readAdminAudio();
        if (!next.enabled) {
            if (toggle) toggle.style.display = 'none';
            try { audio.pause(); } catch (err) { /* noop */ }
            return;
        }
        if (toggle) toggle.style.display = '';
        if (next.url && next.url !== adminAudio.url) {
            adminAudio = next;
            candidates = buildCandidates(next.url);
            candidateIndex = 0;
            const wasMuted = audio.muted;
            const wasPlaying = !audio.paused;
            if (applyAdminUrl(next.url) && wasPlaying) {
                audio.muted = wasMuted;
                audio.play().catch(() => { /* wait for gesture */ });
            }
        } else {
            adminAudio = next;
        }
    });

    let failed = false;
    let started = false;

    /* Set when the visitor mutes via the toggle, so the gesture listeners
       below never override their choice. */
    let userMuted = false;

    audio.volume = 0.35;
    audio.loop = true;
    audio.muted = false;
    audio.preload = 'auto';

    const icon = toggle ? toggle.querySelector('.audio-icon') : null;

    const updateToggle = () => {
        if (!toggle) return;
        const muted = audio.muted || audio.paused;
        toggle.setAttribute('aria-label', muted ? 'Unmute background music' : 'Mute background music');
        toggle.style.opacity = muted ? '0.85' : '1';
        if (icon) icon.textContent = muted ? '🔇' : '🔊';
    };

    const markFailed = () => {
        failed = true;
        if (toggle) {
            toggle.setAttribute('aria-label', 'Background music unavailable');
            toggle.style.opacity = '0.45';
            toggle.style.cursor = 'not-allowed';
            if (icon) icon.textContent = '🔇';
        }
    };

    /* If the track becomes loadable again (re-uploaded, or the panel switched
       to a working URL) the failure is cleared so playback can start. */
    const clearFailed = () => {
        if (!failed) return;
        failed = false;
        if (toggle) {
            toggle.style.opacity = '';
            toggle.style.cursor = '';
        }
        updateToggle();
    };

    const tryPlay = async () => {
        if (failed) return false;
        try {
            audio.muted = false;
            await audio.play();
            started = true;
            updateToggle();
            return true;
        } catch (err) {
            updateToggle();
            return false;
        }
    };

    /* If the current track fails (expired link, hotlink block, S3
       `AccessDenied`), step down to the next candidate rather than going
       straight to a dead toggle — that is what left the live site silent and
       unmutable. Only when every candidate has failed is the music considered
       unavailable. */
    const advanceTrack = () => {
        if (candidateIndex >= candidates.length - 1) {
            markFailed();
            return;
        }
        candidateIndex += 1;
        const next = candidates[candidateIndex];
        /* `load()` stops the element, so remember it was rolling. */
        const wasRolling = !audio.paused;
        if (sourceEl) sourceEl.src = next;
        else audio.src = next;
        audio.load();
        updateToggle();
        /* Keep the fallback rolling exactly like the initial start: audible
           when the browser allows it, otherwise muted so the first real
           gesture unlocks it. A deliberate mute is left alone. */
        if (wasRolling && !userMuted) startPlayback();
    };
    audio.addEventListener('error', advanceTrack);
    if (sourceEl) sourceEl.addEventListener('error', advanceTrack);
    audio.addEventListener('loadedmetadata', clearFailed);
    audio.addEventListener('canplay', clearFailed);

    /* Music is ON by default. Try audible playback first — that succeeds on
       return visits, where the browser remembers the visitor already
       interacted with the site — then fall back to a muted start that
       unmutes on the first real user gesture (including the age-gate YES
       click). This is the closest a browser-autoplay-policy allows to
       "music on from the first second". */
    async function startPlayback() {
        try {
            audio.muted = false;
            await audio.play();
            started = true;
            updateToggle();
        } catch (err) {
            /* Blocked: no sound allowed yet. Play muted so the track is
               already rolling; `unlock` below takes it audible on the first
               real user gesture. */
            try { audio.muted = true; } catch (e) { /* noop */ }
            audio.play().then(updateToggle).catch(updateToggle);
        }
    }
    startPlayback();

    /* Only real user-activation events may un-mute. `pointermove` and `scroll`
       are NOT activations in Chrome/Firefox: un-muting on them leaves the
       track playing silently, and disarming these listeners on that fake
       "success" is why the music never came on for the first real click. */
    const hasActivation = () => {
        const ua = navigator.userActivation;
        return ua ? !!ua.isActive : true;   /* no API → trust the event type */
    };

    const detachUnlock = () => {
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        document.removeEventListener('lcdh:age-verified', unlock);
    };

    const unlock = async () => {
        /* The visitor muted it with the toggle — never override that. */
        if (userMuted) {
            detachUnlock();
            return;
        }
        /* Playback is already audible (or the file failed) — nothing to do. */
        if (failed || started) {
            detachUnlock();
            return;
        }
        /* Not a user activation: leave the muted playback alone so the toggle
           keeps telling the truth and a later real click can still unlock. */
        if (!hasActivation()) return;
        const ok = await tryPlay();
        if (ok) detachUnlock();
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    /* The YES button on the age gate counts as the gesture. */
    document.addEventListener('lcdh:age-verified', unlock);

    if (toggle) {
        toggle.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (failed) return;
            if (audio.paused) {
                userMuted = false;
                await tryPlay();
            } else {
                audio.muted = !audio.muted;
                userMuted = audio.muted;
                if (!audio.muted) {
                    try { await audio.play(); } catch (err) { /* stay muted */ }
                }
            }
            updateToggle();
        });
    }

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && !failed && !audio.muted && audio.paused && started) {
            try { await audio.play(); } catch (err) { /* ignore */ }
            updateToggle();
        }
    });

    updateToggle();
})();
