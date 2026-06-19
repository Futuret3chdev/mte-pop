const Game = (() => {
  const SHOP_ITEMS = [
    { id: 'bomb', label: 'Bomb', icon: '💣', desc: 'Blasts a 5×5 area!', price: 100, type: 'bomb' },
    { id: 'rocket', label: 'Rocket', icon: '🚀', desc: 'Clears a full row or column', price: 150, type: 'rocket_h' },
    { id: 'disco', label: 'Disco Ball', icon: '🪩', desc: 'Destroys all blocks of one color', price: 200, type: 'disco' },
    { id: 'extra_moves', label: '+5 Moves', icon: '⚡', desc: 'Instantly add 5 extra moves', price: 250, type: 'extra_moves' }
  ];

  const STATION_DATA = [
    { name: 'Sunny Meadow', color: '#55efc4' },
    { name: 'Rocky Hills', color: '#74b9ff' },
    { name: 'Golden Desert', color: '#fdcb6e' },
    { name: 'Pine Forest', color: '#00b894' },
    { name: 'Royal Castle', color: '#a29bfe' },
    { name: 'Ocean Cove', color: '#0984e3' },
    { name: 'Ice Kingdom', color: '#dfe6e9' },
    { name: 'Volcano Peak', color: '#d63031' },
    { name: 'Cloud City', color: '#fd79a8' },
    { name: 'Final Station', color: '#ffeaa7' }
  ];

  let board = null;
  let currentLevel = 1;
  let placementMode = null;
  let progress = null;

  const $ = id => document.getElementById(id);
  const screens = {
    menu: $('menu-screen'),
    level: $('level-screen'),
    game: $('game-screen'),
    shop: $('shop-screen'),
    profile: $('profile-screen')
  };

  const boardEl = $('board');
  const particlesCanvas = $('particles');

  function reloadProgress() {
    progress = AuthManager.loadProgress();
    updateMenuStats();
    updateAuthUI();
  }

  function saveProgress() {
    AuthManager.saveProgress(progress);
  }

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2800);
  }

  function updateAuthUI() {
    const loggedIn = AuthManager.isLoggedIn();
    const user = AuthManager.getUser();
    const prof = AuthManager.getProfile();

    $('logout-btn')?.classList.toggle('hidden', !loggedIn);

    const providerLabels = { google: 'Google', facebook: 'Facebook', x: 'X' };
    const avatarColor = AuthManager.avatarColor(prof.avatar);
    if ($('profile-name')) $('profile-name').textContent = prof.name;
    if ($('profile-avatar')) {
      $('profile-avatar').textContent = prof.avatar;
      $('profile-avatar').style.background = avatarColor;
    }

    if ($('profile-frame')) $('profile-frame').style.setProperty('--frame-color', prof.frame);
    if ($('profile-provider')) {
      $('profile-provider').textContent = loggedIn
        ? `Signed in via ${providerLabels[user?.provider] || user?.provider}`
        : 'Playing locally — sign in to sync across devices';
    }
    if ($('profile-name-input')) $('profile-name-input').value = prof.name;
  }

  function renderProfilePickers() {
    const avatars = $('avatar-picker');
    const frames = $('frame-picker');
    if (!avatars || !frames) return;
    avatars.innerHTML = '';
    frames.innerHTML = '';
    const prof = AuthManager.getProfile();

    AuthManager.AVATARS.forEach(letter => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-opt${prof.avatar === letter ? ' active' : ''}`;
      btn.textContent = letter;
      btn.style.background = AuthManager.avatarColor(letter);
      btn.addEventListener('click', () => {
        avatars.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = AuthManager.avatarColor(letter);
        $('profile-avatar').textContent = letter;
        $('profile-avatar').style.background = color;

      });
      avatars.appendChild(btn);
    });

    AuthManager.FRAMES.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `frame-opt${prof.frame === color ? ' active' : ''}`;
      btn.style.background = color;
      btn.addEventListener('click', () => {
        frames.querySelectorAll('.frame-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('profile-frame').style.setProperty('--frame-color', color);
      });
      frames.appendChild(btn);
    });
  }

  function showScreen(name) {
    const targetId = `${name}-screen`;
    document.querySelectorAll('#app > .screen').forEach(s => {
      s.classList.toggle('active', s.id === targetId);
    });
    if (name !== 'game') clearPlacementMode();
    if (name === 'shop') renderShop();
    if (name === 'level') buildLevelMap();
    if (progress) updateMenuStats();
  }

  function openLevelMap() {
    AudioEngine.init();
    AudioEngine.click();
    try {
      showScreen('level');
    } catch (err) {
      console.error('Map open failed:', err);
      document.querySelectorAll('#app > .screen').forEach(s => s.classList.remove('active'));
      $('level-screen')?.classList.add('active');
      buildLevelMap();
    }
  }

  function getInviteUrl() {
    return MTEPOP_CONFIG.appUrl || window.location.href;
  }

  function showInviteModal() {
    const url = getInviteUrl();
    if ($('invite-url')) $('invite-url').textContent = url;
    const shareBtn = $('invite-share-btn');
    if (shareBtn) shareBtn.style.display = navigator.share ? '' : 'none';
    $('invite-modal')?.classList.remove('hidden');
  }

  function calcStars(movesLeft) {
    if (movesLeft >= 5) return 3;
    if (movesLeft >= 2) return 2;
    return 1;
  }

  function updateMenuStats() {
    const playLevel = AuthManager.getPlayLevel(progress);
    if ($('menu-level')) $('menu-level').textContent = playLevel;
    if ($('max-level')) $('max-level').textContent = progress.maxLevel;
    if ($('total-stars')) $('total-stars').textContent = progress.totalStars;
    if ($('menu-coins')) $('menu-coins').textContent = progress.coins;
    if ($('shop-coins')) $('shop-coins').textContent = progress.coins;
    updateInventoryHUD();
  }

  function updateInventoryHUD() {
    const inv = progress.inventory || {};
    if ($('inv-bomb-count')) $('inv-bomb-count').textContent = inv.bomb || 0;
    if ($('inv-rocket-count')) $('inv-rocket-count').textContent = inv.rocket_h || 0;
    if ($('inv-disco-count')) $('inv-disco-count').textContent = inv.disco || 0;
    if ($('inv-moves-count')) $('inv-moves-count').textContent = inv.extra_moves || 0;

    $('inv-bomb')?.classList.toggle('disabled', !(inv.bomb > 0));
    $('inv-rocket')?.classList.toggle('disabled', !(inv.rocket_h > 0));
    $('inv-disco')?.classList.toggle('disabled', !(inv.disco > 0));
    $('inv-moves')?.classList.toggle('disabled', !(inv.extra_moves > 0));
  }

  function renderShop() {
    const list = $('shop-items');
    if (!list) return;
    list.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const invKey = item.type === 'rocket_h' ? 'rocket_h' : item.id === 'extra_moves' ? 'extra_moves' : item.type;
      const owned = (progress.inventory && progress.inventory[invKey]) || 0;
      const canAfford = progress.coins >= item.price;

      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <span class="shop-item-name">${item.label}</span>
          <span class="shop-item-desc">${item.desc}</span>
          <span class="shop-item-owned">In bag: ${owned}</span>
        </div>
        <button class="shop-buy-btn ${canAfford ? '' : 'disabled'}" type="button">
          🪙 ${item.price}
        </button>
      `;
      const btn = el.querySelector('.shop-buy-btn');
      btn.addEventListener('click', () => {
        if (canAfford) buyItem(item);
        else AudioEngine.invalid();
      });
      list.appendChild(el);
    });
  }

  function buyItem(item) {
    if (progress.coins < item.price) return;
    const invKey = item.type === 'rocket_h' ? 'rocket_h' : item.id === 'extra_moves' ? 'extra_moves' : item.type;
    progress.coins -= item.price;
    if (!progress.inventory) progress.inventory = {};
    progress.inventory[invKey] = (progress.inventory[invKey] || 0) + 1;
    saveProgress();
    AudioEngine.purchase();
    renderShop();
    updateMenuStats();
  }

  function clearPlacementMode() {
    placementMode = null;
    boardEl?.classList.remove('placement-mode');
    document.querySelectorAll('.inv-btn.active').forEach(b => b.classList.remove('active'));
  }

  function startPlacement(type) {
    if (!board || board.busy) return;
    if (!(progress.inventory && progress.inventory[type] > 0)) return;

    if (type === 'extra_moves') {
      progress.inventory.extra_moves--;
      board.addMoves(5);
      saveProgress();
      updateInventoryHUD();
      return;
    }

    placementMode = type;
    boardEl.classList.add('placement-mode');
    document.querySelectorAll('.inv-btn').forEach(b => b.classList.remove('active'));
    $(`inv-${type === 'rocket_h' ? 'rocket' : type}`)?.classList.add('active');
    AudioEngine.click();
  }

  function buildLevelMap() {
    const map = $('level-map') || $('level-grid');
    if (!map || typeof LEVELS === 'undefined' || !progress) return;

    try {
    map.innerHTML = '<div class="map-sky"></div><div class="map-ground"></div>';

    const track = document.createElement('div');
    track.className = 'map-track';

    LEVELS.forEach((_, i) => {
      const num = i + 1;
      const data = STATION_DATA[i] || STATION_DATA[0];
      const side = i % 2 === 0 ? 'left' : 'right';
      const unlocked = num <= progress.maxLevel;
      const stars = progress.stars[num] || 0;
      const isCurrent = num === progress.maxLevel;

      if (i > 0) {
        const rail = document.createElement('div');
        rail.className = `map-rail ${side} ${unlocked ? 'active' : 'locked'}`;
        rail.innerHTML = '<div class="rail-ties"></div><div class="rail-line"></div>';
        track.appendChild(rail);
      }

      const station = document.createElement('div');
      station.className = `map-station ${side} ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''} ${stars > 0 ? 'completed' : ''}`;
      station.dataset.level = num;
      station.innerHTML = `
        <div class="station-scenery" style="--station-color:${data.color}">
          <span class="scenery-dot"></span>
          <span class="scenery-name">${data.name}</span>
        </div>
        <button class="station-btn" type="button" ${unlocked ? '' : 'disabled'}>
          <span class="station-num">${num}</span>
          <span class="station-stars">${renderStarRow(stars)}</span>
        </button>
        ${isCurrent ? '<div class="station-train">YOU</div>' : ''}
      `;

      if (unlocked) {
        station.querySelector('.station-btn').addEventListener('click', () => {
          AudioEngine.click();
          startLevel(num);
        });
      }
      track.appendChild(station);
    });

    map.appendChild(track);

    requestAnimationFrame(() => {
      const current = map.querySelector('.map-station.current');
      if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    } catch (err) {
      console.error('Map build failed:', err);
      map.innerHTML = '<p class="map-error">Could not load map. Tap back and try again.</p>';
    }
  }

  function renderStarRow(filled, total = 3) {
    return '★'.repeat(Math.min(filled, total)) + '☆'.repeat(Math.max(0, total - filled));
  }

  function calcCellSize(width, height) {
    const wrapper = boardEl.parentElement;
    if (!wrapper) return 42;
    const maxW = wrapper.clientWidth - 12;
    const maxH = wrapper.clientHeight - 12;
    const gap = 3, pad = 16;
    const sizeW = (maxW - pad - gap * (width - 1)) / width;
    const sizeH = (maxH - pad - gap * (height - 1)) / height;
    const isMobile = window.innerWidth < 520 || 'ontouchstart' in window;
    const maxCell = isMobile ? 44 : 52;
    return Math.max(26, Math.min(sizeW, sizeH, maxCell));
  }

  function applyBoardSizing() {
    if (!board || !boardEl) return;
    const cellSize = calcCellSize(board.width, board.height);
    boardEl.style.setProperty('--cell-size', cellSize + 'px');
    boardEl.style.gridTemplateColumns = `repeat(${board.width}, ${cellSize}px)`;
    boardEl.style.gridTemplateRows = `repeat(${board.height}, ${cellSize}px)`;
  }

  function resizeBoard() {
    if (!board || !$('game-screen')?.classList.contains('active')) return;
    applyBoardSizing();
    ParticleSystem.resize();
  }

  function bindCellInput(cell, row, col) {
    let tapStart = null;

    cell.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tapStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
      cell.setPointerCapture(e.pointerId);
    }, { passive: true });

    cell.addEventListener('pointerup', (e) => {
      if (!tapStart || e.pointerId !== tapStart.id) return;
      const dx = Math.abs(e.clientX - tapStart.x);
      const dy = Math.abs(e.clientY - tapStart.y);
      tapStart = null;
      if (dx <= 14 && dy <= 14) {
        e.preventDefault();
        onCellTap(row, col);
      }
      try { cell.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    });

    cell.addEventListener('pointercancel', () => { tapStart = null; });
    cell.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function renderBoard() {
    if (!boardEl || !board) return;
    boardEl.innerHTML = '';
    applyBoardSizing();

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

        bindCellInput(cell, row, col);
        boardEl.appendChild(cell);
      }
    }
    ParticleSystem.resize();
  }

  function refreshBoardDOM() {
    boardEl.querySelectorAll('.block').forEach(el => el.remove());
    boardEl.querySelectorAll('.cell').forEach(cell => cell.classList.add('empty'));

    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const block = board.getBlock(row, col);
        const cell = getCellEl(row, col);
        if (!block || !cell) continue;
        cell.classList.remove('empty');
        const el = createBlockEl(block, row, col);
        el.classList.add('drop-in');
        cell.appendChild(el);
      }
    }
  }

  const CUBE_STYLES = {
    red:    { bg: 'linear-gradient(160deg, #ffb3be 0%, #ff4757 40%, #c0392b 100%)' },
    green:  { bg: 'linear-gradient(160deg, #a8f5c8 0%, #2ed573 40%, #1e8449 100%)' },
    blue:   { bg: 'linear-gradient(160deg, #8fa4ff 0%, #3742fa 40%, #1e3799 100%)' },
    yellow: { bg: 'linear-gradient(160deg, #ffe066 0%, #ffa502 40%, #e67e22 100%)' },
    purple: { bg: 'linear-gradient(160deg, #d4b5ff 0%, #a55eea 40%, #6c3483 100%)' }
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
      const shine = document.createElement('span');
      shine.className = 'block-shine';
      el.appendChild(shine);
    }
    return el;
  }

  function getCellEl(row, col) {
    return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  function getBlockEl(row, col) {
    return getCellEl(row, col)?.querySelector('.block');
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
    if (!panel || !board) return;
    panel.innerHTML = '';

    const goalLabels = { box: 'Boxes', stone: 'Stones', vase: 'Vases' };
    const goalLetters = { box: 'B', stone: 'S', vase: 'V' };

    Object.entries(board.goals).forEach(([type, count]) => {
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.dataset.goal = type;
      item.innerHTML = `
        <div class="goal-icon" style="background:${BLOCK_META[type]?.color || '#666'}">${goalLetters[type] || '?'}</div>
        <span>${goalLabels[type] || type}</span>
        <span class="goal-count">${board.goalProgress[type]}</span>
      `;
      panel.appendChild(item);
    });

    if (Object.keys(board.goals).length === 0) {
      panel.innerHTML = '<div class="goal-item">Clear all blocks!</div>';
    }
  }

  function updateHUD() {
    $('hud-level').textContent = board.levelNumber;
    const movesEl = $('moves-count');
    movesEl.textContent = board.moves;
    movesEl.classList.toggle('low', board.moves <= 3);
    $('score-value').textContent = board.score;
    updateInventoryHUD();
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  const callbacks = {
    getCellCenter,

    onMatchPop(cells) {
      cells.forEach(({ row, col }) => {
        const el = getBlockEl(row, col);
        if (el) el.classList.add('popping');
      });
    },

    async onPowerUpExplosion(originRow, originCol, cells, type) {
      boardEl.parentElement?.classList.add('screen-shake');
      setTimeout(() => boardEl.parentElement?.classList.remove('screen-shake'), 450);

      ParticleSystem.shockwaveAtCell(boardEl, originRow, originCol, '#ffeaa7', type === 'tnt' ? 2.2 : 1.6);

      const originEl = getBlockEl(originRow, originCol);
      originEl?.classList.add('power-charge');

      if (type === 'rocket_h' || type === 'rocket_v') {
        const isH = type === 'rocket_h';
        const sorted = [...cells].sort((a, b) => isH ? a.col - b.col : a.row - b.row);
        for (const { row, col } of sorted) {
          const cell = getCellEl(row, col);
          cell?.classList.add('rocket-blast');
          getBlockEl(row, col)?.classList.add('exploding');
          const c = getCellCenter(row, col);
          ParticleSystem.rocketTrail(c.x, c.y, isH);
          await delay(18);
        }
        await delay(60);
      } else if (type === 'bomb' || type === 'tnt') {
        const sorted = [...cells].sort((a, b) => {
          const da = Math.abs(a.row - originRow) + Math.abs(a.col - originCol);
          const db = Math.abs(b.row - originRow) + Math.abs(b.col - originCol);
          return da - db;
        });
        for (const { row, col } of sorted) {
          const dist = Math.abs(row - originRow) + Math.abs(col - originCol);
          await delay(dist * 22);
          const cell = getCellEl(row, col);
          cell?.classList.add('blast-flash');
          getBlockEl(row, col)?.classList.add('exploding');
          const c = getCellCenter(row, col);
          ParticleSystem.burst(c.x, c.y, '#ff7675', 10);
        }
        await delay(80);
      } else if (type === 'disco') {
        for (let i = 0; i < cells.length; i++) {
          const { row, col } = cells[i];
          const cell = getCellEl(row, col);
          cell?.classList.add('disco-flash');
          getBlockEl(row, col)?.classList.add('exploding');
          const c = getCellCenter(row, col);
          ParticleSystem.discoBurst(c.x, c.y);
          await delay(16);
        }
        await delay(100);
      }

      originEl?.classList.remove('power-charge');
      document.querySelectorAll('.rocket-blast, .blast-flash, .disco-flash, .exploding').forEach(el => {
        el.classList.remove('rocket-blast', 'blast-flash', 'disco-flash', 'exploding');
      });
    },

    onBlockDestroy(row, col, block, fast = false) {
      return new Promise(resolve => {
        const el = getBlockEl(row, col);
        if (!el) { resolve(); return; }
        const color = BLOCK_META[block.type]?.color || '#fff';
        ParticleSystem.burstAtCell(boardEl, row, col, board.height, board.width, color);
        el.classList.add('popping');
        AudioEngine.pop();
        const ms = fast ? 35 : 120;
        setTimeout(() => {
          el.remove();
          getCellEl(row, col)?.classList.add('empty');
          resolve();
        }, ms);
      });
    },

    onBlockUpdated(row, col, block) {
      const cell = getCellEl(row, col);
      if (!cell) return;
      const old = getBlockEl(row, col);
      const el = createBlockEl(block, row, col);
      el.classList.add('power-spawn');
      if (old) cell.replaceChild(el, old);
      else cell.appendChild(el);
    },

    onBlockCreated(row, col, block) {
      const cell = getCellEl(row, col);
      cell?.classList.remove('empty');
      const el = createBlockEl(block, row, col);
      el.classList.add('power-spawn');
      cell?.appendChild(el);
    },

    async onBatchSettle(falls, spawns) {
      if (!falls.length && !spawns.length) return;
      refreshBoardDOM();
      await delay(60);
      document.querySelectorAll('.block.drop-in').forEach(el => el.classList.remove('drop-in'));
    },

    onBlockFall() { return Promise.resolve(); },
    onBlockSpawn() { return Promise.resolve(); },

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
      getBlockEl(row, col)?.classList.add('shake');
      setTimeout(() => getBlockEl(row, col)?.classList.remove('shake'), 400);
      AudioEngine.invalid();
    },

    onCombo(level) {
      const display = $('combo-display');
      $('combo-text').textContent = `COMBO x${level}!`;
      display.classList.remove('hidden');
      setTimeout(() => display.classList.add('hidden'), 800);
    },

    onHint(cells) {
      cells.forEach(({ row, col }) => getBlockEl(row, col)?.classList.add('hint'));
    },

    onHintClear(cells) {
      cells.forEach(({ row, col }) => getBlockEl(row, col)?.classList.remove('hint'));
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
      const coinReward = 50 + stars * 25 + movesLeft * 5;
      progress.coins += coinReward;
      saveProgress();
      $('win-coins').textContent = `+${coinReward} coins`;
      updateMenuStats();

      $('win-score').textContent = score;
      $('win-stars').textContent = renderStarRow(stars);
      updateAuthUI();
      $('win-modal').classList.remove('hidden');
    },

    onLose() {
      AudioEngine.lose();
      $('lose-modal').classList.remove('hidden');
    }
  };

  async function onCellTap(row, col) {
    AudioEngine.init();

    if (placementMode && board && !board.busy) {
      const block = board.getBlock(row, col);
      if (block && BLOCK_META[block.type]?.matchColor) {
        const color = BLOCK_META[block.type].matchColor;
        const type = placementMode;
        if (await board.placeAndActivate(row, col, type, type === 'disco' ? color : null)) {
          progress.inventory[type]--;
          saveProgress();
          updateInventoryHUD();
          clearPlacementMode();
        }
      } else {
        AudioEngine.invalid();
      }
      return;
    }

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
    clearPlacementMode();

    showScreen('game');
    renderBoard();
    renderGoals();
    updateHUD();
    board.resetHintTimer();
  }

  const SVG_MUSIC_ON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  const SVG_MUSIC_OFF = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 0 0 10 17v-4H6V3h6z"/></svg>';
  const SVG_SOUND_ON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.06A4.494 4.494 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  const SVG_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.494 4.494 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/></svg>';

  function updateMuteButton() {
    const btn = $('mute-btn');
    if (btn) {
      btn.innerHTML = AudioEngine.isEnabled() ? SVG_SOUND_ON : SVG_SOUND_OFF;
      btn.classList.toggle('muted', !AudioEngine.isEnabled());
    }
    const musicBtn = $('music-btn');
    if (musicBtn) {
      musicBtn.innerHTML = AudioEngine.isMusicEnabled() ? SVG_MUSIC_ON : SVG_MUSIC_OFF;
      musicBtn.classList.toggle('muted', !AudioEngine.isMusicEnabled());
    }
  }

  function handleInvite() {
    AudioEngine.init();
    AudioEngine.click();
    showInviteModal();
  }

  function onAppClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'level-select-btn') {
      e.preventDefault();
      openLevelMap();
    } else if (btn.id === 'invite-btn' || btn.id === 'invite-win-btn') {
      e.preventDefault();
      handleInvite();
    }
  }

  function bindUI() {
    $('app')?.addEventListener('click', onAppClick);

    document.addEventListener('mtepop:authchange', () => {
      reloadProgress();
      renderProfilePickers();
      if ($('level-screen')?.classList.contains('active')) buildLevelMap();
    });

    $('play-btn')?.addEventListener('click', () => {
      AudioEngine.init();
      if (!AudioEngine.isMusicEnabled()) AudioEngine.setMusicEnabled(true);
      updateMuteButton();
      startLevel(AuthManager.getPlayLevel(progress));
    });

    $('shop-btn')?.addEventListener('click', () => {
      AudioEngine.init();
      renderShop();
      showScreen('shop');
    });

    $('shop-back')?.addEventListener('click', () => showScreen('menu'));
    $('level-back')?.addEventListener('click', () => showScreen('menu'));
    $('game-back')?.addEventListener('click', () => {
      board?.clearHint();
      showScreen('menu');
    });

    $('mute-btn')?.addEventListener('click', () => {
      AudioEngine.init();
      AudioEngine.setEnabled(!AudioEngine.isEnabled());
      updateMuteButton();
      AudioEngine.click();
    });

    $('music-btn')?.addEventListener('click', () => {
      AudioEngine.init();
      AudioEngine.toggleMusic();
      updateMuteButton();
      AudioEngine.click();
    });

    $('profile-btn')?.addEventListener('click', () => {
      renderProfilePickers();
      updateAuthUI();
      AuthManager.renderGoogleButton($('google-btn-container'));
      showScreen('profile');
    });

    $('profile-back')?.addEventListener('click', () => showScreen('menu'));
    $('login-google')?.addEventListener('click', () => {
      if (AuthManager.signInGoogle()) {
        reloadProgress();
        updateAuthUI();
        showToast('Signed in with Google');
        showScreen('menu');
      }
    });

    $('login-facebook')?.addEventListener('click', async () => {
      const ok = await AuthManager.signInFacebook();
      if (ok) {
        reloadProgress();
        updateAuthUI();
        showToast('Signed in with Facebook');
        showScreen('menu');
      }
    });

    $('login-x')?.addEventListener('click', () => {
      $('x-username-input').value = '';
      $('x-login-modal').classList.remove('hidden');
    });

    $('x-login-cancel')?.addEventListener('click', () => {
      $('x-login-modal').classList.add('hidden');
    });

    $('x-login-confirm')?.addEventListener('click', () => {
      const handle = $('x-username-input')?.value?.trim();
      if (AuthManager.signInX(handle)) {
        $('x-login-modal').classList.add('hidden');
        reloadProgress();
        updateAuthUI();
        showToast('Signed in with X');
        showScreen('menu');
      } else {
        showToast('Enter a username');
      }
    });

    $('logout-btn')?.addEventListener('click', () => {
      AuthManager.signOut();
      reloadProgress();
      showToast('Signed out — playing as guest');
      showScreen('menu');
    });

    $('save-profile-btn')?.addEventListener('click', () => {
      const name = $('profile-name-input')?.value?.trim() || 'Player';
      const avatar = $('profile-avatar')?.textContent || 'P';
      const frame = $('profile-frame')?.style.getPropertyValue('--frame-color')?.trim() || '#6c5ce7';
      AuthManager.setProfile({ name, avatar, frame });
      showToast('Profile saved!');
      updateAuthUI();
    });

    $('invite-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleInvite();
    });

    $('invite-win-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleInvite();
    });

    $('invite-copy-btn')?.addEventListener('click', async () => {
      const text = `${MTEPOP_CONFIG.inviteMessage}\n${getInviteUrl()}`;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          showToast('Invite link copied!');
          return;
        }
      } catch { /* fallback below */ }
      const urlEl = $('invite-url');
      if (urlEl) {
        const range = document.createRange();
        range.selectNodeContents(urlEl);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      showToast('Link selected — tap Copy or long-press to copy');
    });

    $('invite-share-btn')?.addEventListener('click', async () => {
      try {
        const result = await AuthManager.inviteFriends();
        if (result?.message === 'Share cancelled') return;
        $('invite-modal')?.classList.add('hidden');
        showToast(result?.message || 'Invite shared!');
      } catch {
        showToast('Could not share — use Copy Link');
      }
    });

    $('invite-close-btn')?.addEventListener('click', () => {
      $('invite-modal')?.classList.add('hidden');
    });

    $('inv-bomb')?.addEventListener('click', () => startPlacement('bomb'));
    $('inv-rocket')?.addEventListener('click', () => startPlacement('rocket_h'));
    $('inv-disco')?.addEventListener('click', () => startPlacement('disco'));
    $('inv-moves')?.addEventListener('click', () => startPlacement('extra_moves'));

    $('next-level-btn')?.addEventListener('click', () => {
      startLevel(Math.min(board.levelNumber + 1, LEVELS.length));
    });

    $('win-menu-btn')?.addEventListener('click', () => showScreen('menu'));
    $('retry-btn')?.addEventListener('click', () => startLevel(currentLevel));
    $('lose-menu-btn')?.addEventListener('click', () => showScreen('menu'));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) board?.clearHint();
      else setTimeout(resizeBoard, 200);
    });

    let resizeTimer;
    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeBoard, 100);
    };
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', () => setTimeout(resizeBoard, 350));
    window.visualViewport?.addEventListener('resize', scheduleResize);

    boardEl?.parentElement?.addEventListener('touchmove', (e) => {
      if ($('game-screen')?.classList.contains('active')) e.preventDefault();
    }, { passive: false });

    boardEl?.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  function init() {
    bindUI();

    try {
      AuthManager.init();
      PWA.init();
      progress = AuthManager.loadProgress();
      reloadProgress();
    } catch (err) {
      console.error('Startup failed:', err);
      progress = progress || AuthManager.DEFAULT_PROGRESS;
    }

    try {
      ParticleSystem.init(particlesCanvas);
    } catch (err) {
      console.warn('Particles unavailable:', err);
    }

    updateMuteButton();
    try { renderShop(); } catch (err) { console.warn('Shop render failed:', err); }
    try { renderProfilePickers(); } catch (err) { console.warn('Profile pickers failed:', err); }
    updateAuthUI();

    if (AudioEngine.isMusicEnabled()) {
      AudioEngine.init();
      AudioEngine.startMusic();
    }
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Game.init);
} else {
  Game.init();
}