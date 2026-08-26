/* =========================================================
   LA CASA DEL HABANO UAE
   Background audio autoplay
   ========================================================= */

(() => {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    let isReady = false;

    audio.volume = 0.3;
    audio.loop = true;

    const tryPlay = async (muted = false) => {
        try {
            audio.muted = muted;
            await audio.play();
            return true;
        } catch {
            return false;
        }
    };

    (async () => {
        const played = await tryPlay(false);
        if (!played) {
            await tryPlay(true);
        }
    })();

    const toggle = document.getElementById('audio-toggle');
    const updateToggle = () => {
        if (!toggle) return;
        toggle.setAttribute('aria-label', audio.muted ? 'Unmute background music' : 'Mute background music');
        toggle.style.opacity = audio.muted ? '0.85' : '1';
    };

    if (toggle) {
        toggle.addEventListener('click', async (e) => {
            e.preventDefault();
            audio.muted = !audio.muted;
            if (!audio.muted) {
                await tryPlay(false);
            }
            updateToggle();
        });
    }

    const unlock = async () => {
        if (isReady) return;
        isReady = true;
        audio.muted = false;
        audio.currentTime = 0;
        await tryPlay(false);
        updateToggle();

        window.removeEventListener('scroll', unlock, { passive: true });
        window.removeEventListener('click', unlock, { passive: true });
        window.removeEventListener('pointermove', unlock, { passive: true });
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock, { passive: true });
    };

    window.addEventListener('scroll', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('pointermove', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && !audio.muted && audio.paused) {
            await tryPlay(false);
        }
    });

    document.body.addEventListener('click', async (e) => {
        if (audio.muted || audio.paused) {
            audio.muted = false;
            await tryPlay(false);
            updateToggle();
            isReady = true;
        }
    }, { once: true });
})();
