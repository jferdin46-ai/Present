
(() => {
    const $ = (id) => document.getElementById(id);

    // ==========================================
    // AUDIO CONFIGURATION
    // ==========================================

    const cfg = window.BEYOND_CONFIG || {};

    const MUSIC_PATH = cfg.musicPath || "Assets/Audios/ambient.mp3";
    const SFX_PATH = cfg.sfxPath || "Assets/Audios/";

    const sfxFiles = {
        descent: SFX_PATH + "descent.wav",
        whitehole: SFX_PATH + "whitehole.wav",
        transition: SFX_PATH + "transition.wav",
        letter: SFX_PATH + "letter.wav",
        finale: SFX_PATH + "finale.wav"
    };

    const music = new Audio();
    music.loop = true;
    // Do not fetch until the visitor starts playback (avoids a failed
    // request on load when the file is absent).
    music.preload = "none";
    music.src = MUSIC_PATH;
    music.volume = 0.55;

    let musicVolume = 0.55;
    let sfxVolume = 0.55;
    let sfxEnabled = true;
    let userPaused = false;
    let fadeToken = 0;

    const activeSfx = new Set();

    const musicToggle = $("musicToggle");
    const soundToggle = $("soundToggle");
    const volumeSlider = $("volumeSlider");
    const volumeToggle = $("volumeToggle");
    const volumeControl = $("volumeControl");
    const status = $("audioStatus");

    // ==========================================
    // STATUS
    // ==========================================

    function setStatus(message) {
        if (status) status.textContent = message;
    }

    function updateMusicButton() {
        if (!musicToggle) return;

        musicToggle.textContent = music.paused ? "▶" : "Ⅱ";
        musicToggle.setAttribute(
            "aria-label",
            music.paused ? "Play music" : "Pause music"
        );
    }

    function updateSoundButton() {
        if (!soundToggle) return;

        soundToggle.textContent = "SFX";
        soundToggle.classList.toggle("is-off", !sfxEnabled);
        soundToggle.setAttribute("aria-pressed", String(sfxEnabled));
        soundToggle.setAttribute(
            "aria-label",
            sfxEnabled ? "Sound effects on" : "Sound effects off"
        );
    }

    // ==========================================
    // MUSIC FADE
    // ==========================================

    function fadeMusic(target, duration = 1200, pauseAfter = false) {
        const token = ++fadeToken;
        const startVolume = music.volume;
        const startTime = performance.now();

        function animate(now) {
            if (token !== fadeToken) return;

            const progress = Math.min(
                (now - startTime) / duration,
                1
            );

            music.volume =
                startVolume + (target - startVolume) * progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (pauseAfter) {
                music.pause();
                updateMusicButton();
                setStatus("Music paused");
            }
        }

        requestAnimationFrame(animate);
    }

    // ==========================================
    // MUSIC CONTROLS
    // ==========================================

    // `auto` = started by the experience (not by the music button).
    // An automatic start never overrides a pause the visitor chose.
    async function playMusic(auto = false) {
        if (auto === true && userPaused) return;
        if (!music.paused) return;

        try {
            ++fadeToken;

            music.volume = 0;

            await music.play();

            fadeMusic(musicVolume, 1800);

            updateMusicButton();
            setStatus("Music playing");
        } catch (error) {
            updateMusicButton();
            setStatus("Music could not start");

            console.warn("Music playback error:", error);

            // Only tell the visitor when they asked for music themselves.
            if (auto !== true) {
                window.BeyondToast?.("Music is not available right now.");
            }
        }
    }

    function pauseMusic() {
        if (music.paused) return;

        fadeMusic(0, 800, true);
        setStatus("Pausing music...");
    }

    musicToggle?.addEventListener("click", () => {
        if (music.paused) {
            userPaused = false;
            playMusic(false);
        } else {
            userPaused = true;
            pauseMusic();
        }
    });

    // ==========================================
    // VOLUME CONTROLS
    // ==========================================

    volumeToggle?.addEventListener("click", () => {
        volumeControl?.classList.toggle("open");

        const isOpen =
            volumeControl?.classList.contains("open");

        volumeToggle.setAttribute(
            "aria-expanded",
            String(!!isOpen)
        );
    });

    volumeSlider?.addEventListener("input", () => {
        musicVolume = Number(volumeSlider.value);
        sfxVolume = musicVolume;

        if (!music.paused) {
            music.volume = musicVolume;
        }
    });

    // ==========================================
    // SFX CONTROLS
    // ==========================================

    function fadeOutSfx(sound) {
        activeSfx.delete(sound);

        const startVolume = sound.volume;
        const startTime = performance.now();
        const duration = 220;

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);

            sound.volume = startVolume * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                sound.pause();
            }
        }

        requestAnimationFrame(step);
    }

    function playSfx(name) {
        if (!sfxEnabled || !name) return;

        const path = sfxFiles[name];

        if (!path) {
            console.warn("Unknown SFX:", name);
            return;
        }

        // Sound effects never stack: whatever is still ringing out
        // is faded away as the next one begins.
        activeSfx.forEach(fadeOutSfx);

        const sound = new Audio(path);

        sound.volume = sfxVolume;
        activeSfx.add(sound);

        sound.addEventListener("ended", () => {
            activeSfx.delete(sound);
        });

        sound.addEventListener("error", () => {
            activeSfx.delete(sound);
            console.warn("SFX file could not load:", path);
        });

        sound.play().catch(error => {
            console.warn("SFX playback failed:", name, error);
        });
    }

    soundToggle?.addEventListener("click", () => {
        sfxEnabled = !sfxEnabled;

        if (!sfxEnabled) {
            activeSfx.forEach(sound => {
                sound.pause();
                sound.currentTime = 0;
            });

            activeSfx.clear();
        }

        updateSoundButton();

        setStatus(
            sfxEnabled
                ? "Sound effects enabled"
                : "Sound effects muted"
        );
    });

    // ==========================================
    // ERROR HANDLING
    // ==========================================

    music.addEventListener("error", () => {
        setStatus("Music file not found");
        console.warn("Missing music:", MUSIC_PATH);
    });

    music.addEventListener("play", updateMusicButton);
    music.addEventListener("pause", updateMusicButton);

    // ==========================================
    // PUBLIC API
    // ==========================================

    window.BeyondAudio = {
        playMusic,
        pauseMusic,
        playSfx,

        setMusicVolume(value) {
            musicVolume = Math.max(0, Math.min(1, value));

            if (!music.paused) {
                music.volume = musicVolume;
            }
        },

        setSfxVolume(value) {
            sfxVolume = Math.max(0, Math.min(1, value));
        }
    };

    if (volumeSlider) {
        musicVolume = Number(volumeSlider.value);
        sfxVolume = musicVolume;
    }

    updateMusicButton();
    updateSoundButton();

})();
