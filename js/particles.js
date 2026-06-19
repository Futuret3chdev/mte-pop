const ParticleSystem = (() => {
  let canvas, ctx;
  let particles = [];
  let animating = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 4 + Math.random() * 6,
        color,
        gravity: 0.15
      });
    }
    startLoop();
  }

  function sparkle(x, y) {
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        size: 2 + Math.random() * 4,
        color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`,
        gravity: 0.05,
        star: true
      });
    }
    startLoop();
  }

  function startLoop() {
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      p.vx *= 0.98;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.star) {
        drawStar(p.x, p.y, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  function drawStar(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.4;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function getBoardOffset(boardEl) {
    const wrapper = canvas.parentElement;
    const wRect = wrapper.getBoundingClientRect();
    const bRect = boardEl.getBoundingClientRect();
    return {
      left: bRect.left - wRect.left,
      top: bRect.top - wRect.top
    };
  }

  function burstAtCell(boardEl, row, col, rows, cols, color) {
    const offset = getBoardOffset(boardEl);
    const cellSize = parseFloat(getComputedStyle(boardEl).getPropertyValue('--cell-size')) || 42;
    const gap = 3;
    const pad = 6;
    const x = offset.left + pad + col * (cellSize + gap) + cellSize / 2;
    const y = offset.top + pad + row * (cellSize + gap) + cellSize / 2;
    burst(x, y, color);
  }

  return { init, burst, sparkle, burstAtCell, resize };
})();