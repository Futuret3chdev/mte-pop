const MascotBrain = (() => {
  const QUIPS = {
    idle: ['You got this!', 'Nice board!', 'Let\'s pop!'],
    happy: ['Nice pop!', 'Sweet match!', 'Keep going!'],
    excited: ['COMBO TIME!', 'On fire!', 'So flashy!'],
    focus: ['Almost there!', 'Finish strong!', 'Goals almost done!'],
    nervous: ['Getting tight...', 'Watch those moves', 'Hmm...'],
    worried: ['Uh oh!', 'Moves running out!', 'Be careful!'],
    panic: ['ONE MOVE LEFT!', 'Don\'t panic!', 'Make it count!'],
    sad: ['Aww...', 'So close!', 'Try again!'],
    celebrate: ['WINNER!', 'Incredible!', 'Level crushed!'],
    confused: ['That won\'t work', 'Try another group', 'Need 2+ cubes'],
    pop: ['Pop pop!', 'Yes!', 'More!']
  };

  let lastEmotion = 'idle';
  let revertTimer = null;
  let quipTimer = null;

  function pickQuip(emotion) {
    const list = QUIPS[emotion] || QUIPS.idle;
    return list[Math.floor(Math.random() * list.length)];
  }

  function goalContext(board) {
    if (!board) return { done: 0, total: 0, almost: false };
    const keys = Object.keys(board.goals || {});
    if (!keys.length) return { done: 0, total: 0, almost: false };
    const total = keys.length;
    const done = keys.filter(k => (board.goalProgress[k] || 0) <= 0).length;
    return { done, total, almost: done >= total - 1 && done < total };
  }

  function evaluate(ctx = {}) {
    const {
      event,
      moves = 20,
      startMoves = 20,
      comboChain = 0,
      board
    } = ctx;

    if (event === 'win') return 'celebrate';
    if (event === 'lose') return 'sad';
    if (event === 'invalid') return 'confused';
    if (event === 'combo' || comboChain >= 2) return 'excited';
    if (event === 'match' || event === 'pop') return 'happy';

    const goals = goalContext(board);
    if (goals.almost && moves > 3) return 'focus';

    if (moves <= 1) return 'panic';
    if (moves <= 3) return 'worried';

    const ratio = moves / Math.max(startMoves, 1);
    if (ratio <= 0.2 || moves <= 5) return 'nervous';

    return 'idle';
  }

  function buildFaceHTML(compact = false) {
    const extras = compact
      ? '<span class="mascot-fx mascot-fx-sm"></span>'
      : `<span class="mascot-fx mascot-sparkle s1"></span>
         <span class="mascot-fx mascot-sparkle s2"></span>
         <span class="mascot-fx mascot-tear t1"></span>
         <span class="mascot-fx mascot-tear t2"></span>
         <span class="mascot-fx mascot-sweat"></span>`;

    return `
      <div class="mascot-body"></div>
      <div class="mascot-face">
        <span class="mascot-brow left"></span>
        <span class="mascot-brow right"></span>
        <span class="mascot-eye left"><span class="mascot-pupil"></span></span>
        <span class="mascot-eye right"><span class="mascot-pupil"></span></span>
        <span class="mascot-mouth"><span class="mascot-mouth-inner"></span></span>
        ${compact ? '' : '<span class="mascot-blush left"></span><span class="mascot-blush right"></span>'}
        ${extras}
      </div>
    `;
  }

  function mount(root) {
    if (!root || root.dataset.mascotReady) return;
    const compact = root.classList.contains('mascot-sm');
    root.innerHTML = buildFaceHTML(compact);
    root.dataset.mascotReady = '1';
  }

  function setEmotion(el, emotion) {
    if (!el) return;
    mount(el);
    if (el.dataset.state === emotion) return;
    el.dataset.state = emotion;
    el.setAttribute('aria-label', `Blip feels ${emotion}`);
    lastEmotion = emotion;
  }

  function showQuip(el, text) {
    if (!el || !text) return;
    let bubble = el.querySelector('.mascot-quip');
    if (!bubble) {
      bubble = document.createElement('span');
      bubble.className = 'mascot-quip';
      el.appendChild(bubble);
    }
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(quipTimer);
    quipTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
  }

  function apply(ctx = {}, opts = {}) {
    const emotion = evaluate(ctx);
    const gameScreen = document.getElementById('game-screen');
    const inGame = gameScreen?.classList.contains('active');
    const defaultTargets = inGame
      ? [document.getElementById('game-mascot')]
      : [document.getElementById('menu-mascot')];
    if (ctx.event === 'win' || ctx.event === 'lose') {
      defaultTargets.push(document.getElementById('menu-mascot'), document.getElementById('game-mascot'));
    }
    const targets = opts.targets || [...new Set(defaultTargets.filter(Boolean))];

    targets.forEach((el) => {
      setEmotion(el, emotion);
      if (opts.quip !== false && (opts.forceQuip || emotion !== 'idle')) {
        showQuip(el, opts.quipText || pickQuip(emotion));
      }
    });

    return emotion;
  }

  function react(event, ctx = {}, duration = 900) {
    const emotion = apply({ ...ctx, event }, { forceQuip: true });

    if (event === 'win' || event === 'lose') return emotion;

    clearTimeout(revertTimer);
    revertTimer = setTimeout(() => {
      apply({ ...ctx, event: null }, { quip: false });
    }, duration);

    return emotion;
  }

  function refresh(ctx = {}) {
    return apply({ ...ctx, event: null }, { quip: false });
  }

  function init() {
    ['menu-mascot', 'game-mascot'].forEach((id) => mount(document.getElementById(id)));
    refresh();
  }

  return {
    init,
    mount,
    evaluate,
    apply,
    react,
    refresh,
    pickQuip,
    buildFaceHTML
  };
})();