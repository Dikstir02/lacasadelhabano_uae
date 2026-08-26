/* =========================================================
   LA CASA DEL HABANO UAE
   Background audio autoplay
   ========================================================= */

(() => {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    let isReady = false;  // has the user interacted (unmuted yet)?

        audio.volume = 0.3; // 30% — background ambiance
    audio.loop = true;

    // Best-effort: try playing with sound right away. Some browsers /
    // sessions allow this (e.g. when the user has visited before).
    audio.play().catch(() => {
        // Autoplay-with-sound was blocked — fall back to muted so the
        // element is at least buffering and ready to unmute instantly.
        audio.muted = true;
        audio.play().catch(() => {});
    });

    // --- Mute toggle button -----------------------------------------
    const toggle = document.getElementById('audio-toggle');
    const updateToggle = () => {
        if (!toggle) return;
        toggle.setAttribute('aria-label', audio.muted ? 'Unmute background music' : 'Mute background music');
    };
    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            audio.muted = !audio.muted;
            updateToggle();
        });
    }

    // --- Unlock audio (unmute) on first interaction -----------------
    // We listen to a broad set of events so the music starts with sound
    // as soon as the visitor does *anything* — scroll, click, mouse
    // movement, tap, or keypress. Pointermove fires almost instantly
    // when a real mouse user lands on the page.
    const unlock = () => {
        if (isReady) return;
        isReady = true;
        audio.muted = false;
        audio.play().catch(() => {});
        updateToggle();

        // Clean up — only need to fire once
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
})();
