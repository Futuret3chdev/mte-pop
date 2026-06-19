const AudioEngine = (() => {
  let ctx = null;
  let sfxEnabled = true;
  let musicEnabled = false;
  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;

  const CHORDS = [
    [261.63, 329.63, 392.00],
    [293.66, 369.99, 440.00],
    [329.63, 415.30, 493.88],
    [246.94, 311.13, 369.99]
  ];

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.025;
      musicGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, duration, type = 'sine', volume = 0.05, dest = null) {
    if (!ctx) return;
    const target = dest || ctx.destination;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(target);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, volume = 0.06) {
    if (!sfxEnabled || !ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function startMusic() {
    if (!musicEnabled || !ctx || musicTimer) return;
    const tick = () => {
      if (!musicEnabled || !ctx) return;
      const chord = CHORDS[musicStep % CHORDS.length];
      chord.forEach((freq, i) => {
        playTone(freq, 1.8, 'sine', 0.04 - i * 0.008, musicGain);
      });
      musicStep++;
    };
    tick();
    musicTimer = setInterval(tick, 2400);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('mtepop_audio') || '{}');
      sfxEnabled = p.sfx !== false;
      musicEnabled = p.music === true;
    } catch { /* defaults */ }
  }

  function savePrefs() {
    localStorage.setItem('mtepop_audio', JSON.stringify({ sfx: sfxEnabled, music: musicEnabled }));
  }

  loadPrefs();

  return {
    init,
    isEnabled() { return sfxEnabled; },
    isMusicEnabled() { return musicEnabled; },

    setEnabled(v) {
      sfxEnabled = v;
      savePrefs();
    },

    setMusicEnabled(v) {
      musicEnabled = v;
      savePrefs();
      if (musicEnabled) { init(); startMusic(); }
      else stopMusic();
    },

    toggleMusic() {
      this.setMusicEnabled(!musicEnabled);
      return musicEnabled;
    },

    startMusic() { init(); startMusic(); },
    stopMusic,

    pop() {
      if (!sfxEnabled || !ctx) return;
      playTone(520, 0.05, 'sine', 0.035);
    },

    match(count) {
      if (!sfxEnabled || !ctx) return;
      const base = 380 + Math.min(count, 5) * 25;
      playTone(base, 0.06, 'sine', 0.04);
    },

    powerUp() {
      if (!sfxEnabled || !ctx) return;
      playTone(523, 0.1, 'sine', 0.08);
      setTimeout(() => playTone(659, 0.12, 'sine', 0.07), 70);
    },

    explode(type = 'bomb') {
      if (!sfxEnabled || !ctx) return;
      const big = type === 'tnt' || type === 'bomb';
      playNoise(big ? 0.2 : 0.1, big ? 0.1 : 0.05);
      playTone(big ? 120 : 180, big ? 0.25 : 0.15, 'sine', big ? 0.1 : 0.06);
    },

    fall() {
      if (!sfxEnabled || !ctx) return;
      playTone(280, 0.03, 'sine', 0.03);
    },

    win() {
      if (!sfxEnabled || !ctx) return;
      [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'sine', 0.1), i * 140));
    },

    lose() {
      if (!sfxEnabled || !ctx) return;
      playTone(349, 0.25, 'sine', 0.08);
      setTimeout(() => playTone(294, 0.3, 'sine', 0.07), 160);
    },

    invalid() {
      if (!sfxEnabled || !ctx) return;
      playTone(200, 0.08, 'sine', 0.05);
    },

    combo(level) {
      if (!sfxEnabled || !ctx) return;
      playTone(500 + level * 40, 0.1, 'sine', 0.08);
    },

    coin() {
      if (!sfxEnabled || !ctx) return;
      playTone(880, 0.07, 'sine', 0.07);
    },

    purchase() {
      if (!sfxEnabled || !ctx) return;
      playTone(587, 0.1, 'sine', 0.08);
      setTimeout(() => playTone(784, 0.1, 'sine', 0.07), 80);
    },

    click() {
      if (!sfxEnabled || !ctx) return;
      playTone(440, 0.03, 'sine', 0.02);
    }
  };
})();