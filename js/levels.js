const LEVELS = [
  {"level_number":1,"grid_width":9,"grid_height":10,"move_count":20,"grid":["bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","bo","r","r","r","r","g","b","b","b","b","y","y","y","y","g","y","y","y","y","b","b","b","b","y","r","r","r","r","rand","rand","rand","rand","y","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":2,"grid_width":10,"grid_height":7,"move_count":15,"grid":["s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","s","b","b","b","b","b","g","g","g","g","g","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":3,"grid_width":9,"grid_height":8,"move_count":30,"grid":["v","v","v","v","v","v","v","v","v","b","v","v","v","v","v","v","v","y","b","r","v","v","v","v","v","g","y","rand","r","r","v","v","v","g","g","rand","rand","r","r","y","v","b","g","g","rand","rand","rand","rand","y","rand","b","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":4,"grid_width":7,"grid_height":8,"move_count":17,"grid":["s","bo","b","r","y","bo","s","s","bo","b","r","y","bo","s","s","bo","b","r","y","bo","s","s","bo","b","r","y","bo","s","rand","bo","b","r","y","bo","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":5,"grid_width":9,"grid_height":9,"move_count":12,"grid":["rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","t","rand","rand","rand","rand","rand","rand","rand","t","bo","t","rand","rand","rand","rand","rand","t","bo","bo","bo","t","rand","rand","rand","t","bo","bo","bo","bo","bo","t","rand","rand","rand","t","bo","bo","bo","t","rand","rand","rand","rand","rand","t","bo","t","rand","rand","rand","rand","rand","rand","rand","t","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":6,"grid_width":8,"grid_height":9,"move_count":23,"grid":["rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand","r","r","b","b","r","r","b","b","g","g","y","y","g","g","y","y","r","r","b","b","r","r","b","b","g","g","y","y","g","g","y","y","v","v","v","v","v","v","v","v","v","v","v","v","v","v","v","v"]},
  {"level_number":7,"grid_width":9,"grid_height":8,"move_count":24,"grid":["s","s","s","s","bo","s","s","s","s","s","s","s","bo","rand","bo","s","s","s","s","s","bo","rand","rand","rand","bo","s","s","s","bo","b","rand","rand","rand","g","bo","s","bo","rand","b","rand","rand","rand","g","rand","bo","rand","rand","b","rand","rand","rand","g","rand","rand","y","y","y","y","v","r","r","r","r","y","y","v","y","v","r","v","r","r"]},
  {"level_number":8,"grid_width":9,"grid_height":7,"move_count":18,"grid":["s","s","s","s","s","s","s","s","s","s","bo","bo","bo","v","bo","bo","bo","s","s","bo","b","bo","v","bo","r","bo","s","s","bo","b","bo","v","bo","r","bo","s","rand","bo","b","bo","bo","bo","r","bo","rand","rand","b","b","b","v","r","r","r","rand","rand","rand","rand","rand","rand","rand","rand","rand","rand"]},
  {"level_number":9,"grid_width":6,"grid_height":9,"move_count":20,"grid":["g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","b","g","y","v","v","y","b","g","v","r","r","v","b","v","r","r","r","r","v","r","r","r","r","r","r"]},
  {"level_number":10,"grid_width":10,"grid_height":8,"move_count":10,"grid":["b","b","b","b","b","b","b","b","b","b","bo","bo","bo","b","b","b","b","bo","bo","b","bo","b","b","bo","b","b","bo","b","b","bo","bo","b","b","bo","b","b","bo","b","bo","bo","bo","b","b","bo","b","b","bo","b","b","b","bo","b","b","bo","b","b","bo","b","b","bo","bo","bo","bo","b","b","b","b","bo","bo","b","b","b","b","b","b","b","b","b","b","b"]}
];

const CUBE_TYPES = ['red', 'green', 'blue', 'yellow'];
const CUBE_CODES = { r: 'red', g: 'green', b: 'blue', y: 'yellow' };
const CODE_MAP = {
  r: 'red', g: 'green', b: 'blue', y: 'yellow',
  bo: 'box', s: 'stone', v: 'vase', t: 'tnt', rand: 'rand'
};

const BLOCK_META = {
  red:    { color: '#ff4757', clickable: true,  fallable: true,  interacts: false, matchColor: 'red' },
  green:  { color: '#2ed573', clickable: true,  fallable: true,  interacts: false, matchColor: 'green' },
  blue:   { color: '#3742fa', clickable: true,  fallable: true,  interacts: false, matchColor: 'blue' },
  yellow: { color: '#ffa502', clickable: true,  fallable: true,  interacts: false, matchColor: 'yellow' },
  box:    { color: '#8B6914', clickable: false, fallable: false, interacts: true,  goal: true },
  stone:  { color: '#636e72', clickable: false, fallable: false, interacts: true,  goal: true },
  vase:   { color: '#9b59b6', clickable: false, fallable: true,  interacts: true,  goal: true, health: 2 },
  vase_cracked: { color: '#8e44ad', clickable: false, fallable: true, interacts: true, goal: true, health: 1 },
  rocket_h: { color: '#e17055', clickable: true, fallable: true, interacts: false, power: true },
  rocket_v: { color: '#e17055', clickable: true, fallable: true, interacts: false, power: true },
  bomb:   { color: '#2d3436', clickable: true, fallable: true, interacts: false, power: true },
  disco:  { color: '#a29bfe', clickable: true, fallable: true, interacts: false, power: true },
  tnt:    { color: '#d63031', clickable: true, fallable: true, interacts: false, power: true },
};

function parseLevel(levelInfo) {
  const { grid_width: w, grid_height: h, grid, move_count } = levelInfo;
  const cells = Array.from({ length: h }, () => Array(w).fill(null));
  let idx = 0;

  for (let row = h - 1; row >= 0; row--) {
    for (let col = 0; col < w; col++) {
      const code = grid[idx++];
      cells[row][col] = createBlockFromCode(code);
    }
  }

  const goals = {};
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const block = cells[row][col];
      if (!block) continue;
      const goalType = block.type === 'vase_cracked' ? 'vase' : block.type;
      const meta = BLOCK_META[goalType];
      if (meta?.goal) {
        goals[goalType] = (goals[goalType] || 0) + 1;
      }
    }
  }

  return { cells, width: w, height: h, moves: move_count, goals, levelNumber: levelInfo.level_number };
}

function createBlockFromCode(code) {
  if (code === 'rand') {
    const color = CUBE_TYPES[Math.floor(Math.random() * CUBE_TYPES.length)];
    return { type: color, id: uid() };
  }
  const type = CODE_MAP[code] || CUBE_TYPES[Math.floor(Math.random() * CUBE_TYPES.length)];
  const block = { type, id: uid() };
  if (type === 'vase') block.health = 2;
  return block;
}

function randomCube() {
  const type = CUBE_TYPES[Math.floor(Math.random() * CUBE_TYPES.length)];
  return { type, id: uid() };
}

let _idCounter = 0;
function uid() { return 'b' + (++_idCounter); }