const Game = (() => {
  let board = null;
  let currentLevel = 1;
  let progress = loadProgress();

  const $ = id => document.getElementById(id);
  const screens = {
    menu: $('menu-screen'),
    level: $('level-screen'),
    game: $('game-screen')
  };

  const boardEl = $('board');
  const particlesCanvas = $('particles');

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem('toonblast_progress')) || { maxLevel: 1, stars: {}, totalStars: 0 };
    } catch {
      return { maxLevel: 1, stars: {}, totalStars: 0 };
    }
  }

  function saveProgress() {
    localStorage.setItem('toonblast_progress', JSON.stringify(progress));
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function calcStars(movesLeft) {
    if (movesLeft >= 5) return 3;
    if (movesLeft >= 2) return 2;
    return 1;
  }

  function updateMenuStats() {
    $('menu-level').textContent = progress.maxLevel;
    $('max-level').textContent = progress.maxLevel;
    $('total-stars').textContent = progress.totalStars;
  }

  function buildLevelGrid() {
    const grid = $('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const num = i + 1;
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      const unlocked = num <= progress.maxLevel;
      if (!unlocked) btn.classList.add('locked');
      if (progress.stars[num]) btn.classList.add('completed');

      const stars = progress.stars[num] || 0;
      btn.innerHTML = `${num}${stars ? `<span class="stars">${'⭐'.repeat(stars)}</span>` : ''}`;
      if (unlocked) {
        btn.addEventListener('click', () => startLevel(num));
      }
      grid.appendChild(btn);
    });
  }

  function calcCellSize(width, height) {
    const wrapper = boardEl.parentElement;
    const maxW = wrapper.clientWidth - 20;
    const maxH = wrapper.clientHeight - 20;
    const gap = 3, pad = 12;
    const sizeW = (maxW - pad - gap * (width - 1)) / width;
    const sizeH = (maxH - pad - gap * (height - 1)) / height;
    return Math.min(sizeW, sizeH, 52);
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const cellSize = calcCellSize(board.width, board.height);
    boardEl.style.setProperty('--cell-size', cellSize + 'px');
    boardEl.style.gridTemplateColumns = `repeat(${board.width}, ${cellSize}px)`;
    boardEl.style.gridTemplateRows = `repeat(${board.height}, ${cellSize}px)`;

    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const block = board.getBlock(row, col);
        if (block) {
          cell.appendChild(createBlockEl(block, row, col));
        } else {
          cell.classList.add('empty');
        }

        cell.addEventListener('click', () => onCellTap(row, col));
        boardEl.appendChild(cell);
      }
    }
    ParticleSystem.resize();
  }

  const CUBE_STYLES = {
    red:    { bg: 'linear-gradient(160deg, #ffb3be 0%, #ff4757 40%, #c0392b 100%)', face: '❤️' },
    green:  { bg: 'linear-gradient(160deg, #a8f5c8 0%, #2ed573 40%, #1e8449 100%)', face: '🍀' },
    blue:   { bg: 'linear-gradient(160deg, #8fa4ff 0%, #3742fa 40%, #1e3799 100%)', face: '💎' },
    yellow: { bg: 'linear-gradient(160deg, #ffe066 0%, #ffa502 40%, #e67e22 100%)', face: '⭐' },
    purple: { bg: 'linear-gradient(160deg, #d4b5ff 0%, #a55eea 40%, #6c3483 100%)', face: '🌸' }
  };

  function createBlockEl(block, row, col) {
    const el = document.createElement('div');
    el.className = `block ${block.type}`;
    el.dataset.id = block.id;
    el.dataset.row = row;
    el.dataset.col = col;

    const cube = CUBE_STYLES[block.type];
    if (cube) {
      el.style.background = cube.bg;
      const face = document.createElement('span');
      face.className = 'block-face';
      face.textContent = cube.face;
      el.appendChild(face);
    }
    return el;
  }

  function getCellEl(row, col) {
    return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  function getBlockEl(row, col) {
    const cell = getCellEl(row, col);
    return cell?.querySelector('.block');
  }

  function getCellCenter(row, col) {
    const wrapper = boardEl.parentElement;
    const wRect = wrapper.getBoundingClientRect();
    const cell = getCellEl(row, col);
    const cRect = cell.getBoundingClientRect();
    return {
      x: cRect.left - wRect.left + cRect.width / 2,
      y: cRect.top - wRect.top + cRect.height / 2
    };
  }

  function renderGoals() {
    const panel = $('goals-panel');
    panel.innerHTML = '';

    const goalIcons = { box: '📦', stone: '🪨', vase: '🏺' };
    const goalLabels = { box: 'Boxes', stone: 'Stones', vase: 'Vases' };

    Object.entries(board.goals).forEach(([type, count]) => {
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.dataset.goal = type;
      item.innerHTML = `
        <div class="goal-icon" style="background:${BLOCK_META[type]?.color || '#666'}">${goalIcons[type] || '?'}</div>
        <span>${goalLabels[type] || type}</span>
        <span class="goal-count">${board.goalProgress[type]}</span>
      `;
      panel.appendChild(item);
    });

    if (Object.keys(board.goals).length === 0) {
      panel.innerHTML = '<div class="goal-item">🎯 Clear all blocks!</div>';
    }
  }

  function updateHUD() {
    $('hud-level').textContent = board.levelNumber;
    const movesEl = $('moves-count');
    movesEl.textContent = board.moves;
    movesEl.classList.toggle('low', board.moves <= 3);
    $('score-value').textContent = board.score;
  }

  const callbacks = {
    getCellCenter,

    onBlockDestroy(row, col, block) {
      return new Promise(resolve => {
        const el = getBlockEl(row, col);
        if (!el) { resolve(); return; }
        const color = BLOCK_META[block.type]?.color || '#fff';
        ParticleSystem.burstAtCell(boardEl, row, col, board.height, board.width, color);
        el.classList.add('popping');
        AudioEngine.pop();
        setTimeout(() => {
          el.remove();
          getCellEl(row, col)?.classList.add('empty');
          resolve();
        }, 300);
      });
    },

    onBlockUpdated(row, col, block) {
      const cell = getCellEl(row, col);
      if (!cell) return;
      const old = getBlockEl(row, col);
      const el = createBlockEl(block, row, col);
      if (old) cell.replaceChild(el, old);
      else cell.appendChild(el);
    },

    onBlockCreated(row, col, block) {
      const cell = getCellEl(row, col);
      cell?.classList.remove('empty');
      const el = createBlockEl(block, row, col);
      el.style.transform = 'scale(0)';
      cell?.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transform = 'scale(1.2)';
        setTimeout(() => { el.style.transform = ''; }, 200);
      });
    },

    onBlockFall(fromRow, fromCol, toRow, toCol) {
      return new Promise(resolve => {
        const el = getBlockEl(fromRow, fromCol);
        if (!el) { resolve(); return; }

        const cellSize = parseFloat(getComputedStyle(boardEl).getPropertyValue('--cell-size')) || 42;
        const delta = (toRow - fromRow) * (cellSize + 3);
        el.style.transform = `translateY(${delta}px)`;

        setTimeout(() => {
          const toCell = getCellEl(toRow, toCol);
          const fromCell = getCellEl(fromRow, fromCol);
          el.style.transform = '';
          el.dataset.row = toRow;
          el.dataset.col = toCol;
          toCell?.classList.remove('empty');
          fromCell?.classList.add('empty');
          toCell?.appendChild(el);
          resolve();
        }, 220);
      });
    },

    onBlockSpawn(row, col, block) {
      return new Promise(resolve => {
        const cell = getCellEl(row, col);
        const el = createBlockEl(block, row, col);
        const cellSize = parseFloat(getComputedStyle(boardEl).getPropertyValue('--cell-size')) || 42;
        el.style.transform = `translateY(-${cellSize * 2}px)`;
        cell?.classList.remove('empty');
        cell?.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = '';
          setTimeout(resolve, 220);
        });
      });
    },

    onMovesChanged(moves) {
      $('moves-count').textContent = moves;
      $('moves-count').classList.toggle('low', moves <= 3);
    },

    onGoalUpdate(type, remaining) {
      const item = document.querySelector(`.goal-item[data-goal="${type}"]`);
      if (item) {
        item.querySelector('.goal-count').textContent = remaining;
        if (remaining <= 0) item.classList.add('done');
      }
    },

    onInvalidTap(row, col) {
      const el = getBlockEl(row, col);
      if (el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
      }
      AudioEngine.invalid();
    },

    onCombo(level) {
      const display = $('combo-display');
      $('combo-text').textContent = `COMBO x${level}!`;
      display.classList.remove('hidden');
      setTimeout(() => display.classList.add('hidden'), 800);
    },

    onHint(cells) {
      cells.forEach(({ row, col }) => {
        getBlockEl(row, col)?.classList.add('hint');
      });
    },

    onHintClear(cells) {
      cells.forEach(({ row, col }) => {
        getBlockEl(row, col)?.classList.remove('hint');
      });
    },

    onStateChange() {
      $('score-value').textContent = board.score;
    },

    onWin(score, movesLeft) {
      AudioEngine.win();
      const stars = calcStars(movesLeft);
      const prev = progress.stars[board.levelNumber] || 0;
      if (stars > prev) {
        progress.totalStars += stars - prev;
        progress.stars[board.levelNumber] = stars;
      }
      if (board.levelNumber >= progress.maxLevel && board.levelNumber < LEVELS.length) {
        progress.maxLevel = board.levelNumber + 1;
      }
      saveProgress();
      updateMenuStats();

      $('win-score').textContent = score;
      $('win-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      $('win-modal').classList.remove('hidden');
    },

    onLose() {
      AudioEngine.lose();
      $('lose-modal').classList.remove('hidden');
    }
  };

  async function onCellTap(row, col) {
    AudioEngine.init();
    await board.handleTap(row, col);
  }

  function startLevel(num) {
    currentLevel = num;
    const levelInfo = LEVELS[num - 1];
    if (!levelInfo) return;

    board = new GameBoard(levelInfo, callbacks);
    $('win-modal').classList.add('hidden');
    $('lose-modal').classList.add('hidden');
    $('combo-display').classList.add('hidden');

    showScreen('game');
    renderBoard();
    renderGoals();
    updateHUD();
    board.resetHintTimer();
  }

  function init() {
    ParticleSystem.init(particlesCanvas);
    updateMenuStats();

    $('play-btn').addEventListener('click', () => {
      AudioEngine.init();
      startLevel(progress.maxLevel);
    });

    $('level-select-btn').addEventListener('click', () => {
      buildLevelGrid();
      showScreen('level');
    });

    $('level-back').addEventListener('click', () => showScreen('menu'));
    $('game-back').addEventListener('click', () => {
      board?.clearHint();
      showScreen('menu');
    });

    $('next-level-btn').addEventListener('click', () => {
      const next = Math.min(board.levelNumber + 1, LEVELS.length);
      startLevel(next);
    });

    $('win-menu-btn').addEventListener('click', () => showScreen('menu'));
    $('retry-btn').addEventListener('click', () => startLevel(currentLevel));
    $('lose-menu-btn').addEventListener('click', () => showScreen('menu'));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) board?.clearHint();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);