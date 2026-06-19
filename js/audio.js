const AudioEngine = (() => {
  let ctx = null;
  let enabled = true;

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, duration, type = 'sine', volume = 0.15, decay = true) {
    if (!enabled || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (decay) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, volume = 0.1) {
    if (!enabled || !ctx) return;
    const bufferSize = ctx.sampleRate * duration;
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

  return {
    init,
    setEnabled(v) { enabled = v; },

    pop() {
      playTone(520, 0.08, 'sine', 0.12);
      setTimeout(() => playTone(780, 0.06, 'sine', 0.08), 30);
    },

    match(count) {
      const base = 300 + count * 40;
      for (let i = 0; i < Math.min(count, 6); i++) {
        setTimeout(() => playTone(base + i * 60, 0.07, 'triangle', 0.1), i * 40);
      }
    },

    powerUp() {
      playTone(440, 0.1, 'square', 0.1);
      setTimeout(() => playTone(660, 0.1, 'square', 0.1), 80);
      setTimeout(() => playTone(880, 0.15, 'square', 0.12), 160);
    },

    explode() {
      playNoise(0.2, 0.15);
      playTone(120, 0.25, 'sawtooth', 0.12);
    },

    fall() {
      playTone(200, 0.05, 'sine', 0.05);
    },

    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.15), i * 150));
    },

    lose() {
      playTone(392, 0.3, 'sine', 0.12);
      setTimeout(() => playTone(330, 0.4, 'sine', 0.12), 200);
    },

    invalid() {
      playTone(180, 0.15, 'sawtooth', 0.08);
    },

    combo(level) {
      playTone(400 + level * 80, 0.12, 'triangle', 0.14);
    }
  };
})();