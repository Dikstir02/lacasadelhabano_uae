/* =========================================================
   LA CASA DEL HABANO UAE
   Background audio autoplay (with admin-managed URL)
   ========================================================= */

(() => {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    /* The track is whatever was last set — the admin URL from
       js/site-settings.js (managed via /admin → Site Settings). */
    const fromSettings = window.LCDH_SETTINGS && window.LCDH_SETTINGS.audio && window.LCDH_SETTINGS.audio.url;
    const sourceEl = audio.querySelector('source');
    if (fromSettings && sourceEl && sourceEl.getAttribute('src') !== fromSettings) {
        sourceEl.src = fromSettings;
        audio.load();
    }

    let failed = false;
    let started = false;

    audio.volume = 0.35;
    audio.loop = true;
    audio.muted = false;
    audio.preload = 'auto';

    const toggle = document.getElementById('audio-toggle');
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

    /* Keep the last-used track — no swapping in another song. If the file
       fails (expired link, hotlink block), surface it on the toggle. */
    audio.addEventListener('error', markFailed);
    if (sourceEl) sourceEl.addEventListener('error', markFailed);

    /* Browsers block autoplay with sound — start muted-safe, then unmute on
       the first real user gesture (including the age-gate YES click). */
    try { audio.muted = true; } catch (e) { /* noop */ }
    audio.play().then(() => {
        updateToggle();
    }).catch(() => {
        updateToggle();
    });

    const unlock = async () => {
        if (failed || started) {
            if (started) {
                try { audio.muted = false; await audio.play(); } catch (e) { /* keep muted */ }
                updateToggle();
            }
            return;
        }
        const ok = await tryPlay();
        if (ok) {
            window.removeEventListener('scroll', unlock);
            window.removeEventListener('click', unlock);
            window.removeEventListener('pointermove', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
            document.removeEventListener('lcdh:age-verified', unlock);
        }
    };

    window.addEventListener('scroll', unlock, { passive: true });
    window.addEventListener('click', unlock);
    window.addEventListener('pointermove', unlock, { passive: true });
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
                await tryPlay();
            } else {
                audio.muted = !audio.muted;
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
