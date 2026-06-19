#!/usr/bin/env node
/** Generate levels 1-50 → levels/*.json + js/levels.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEVELS_DIR = path.join(ROOT, 'levels');
const OUT_JS = path.join(ROOT, 'js', 'levels.js');

const CUBE = ['r', 'g', 'b', 'y'];
const OBSTACLE = ['bo', 's', 'v'];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateLevel(num) {
  const rng = seededRandom(num * 7919 + 42);
  const w = 6 + Math.floor(rng() * 4);
  const h = 7 + Math.floor(rng() * 4);
  const size = w * h;
  const moves = Math.min(40, 14 + Math.floor(num * 0.6) + Math.floor(rng() * 6));

  const grid = [];
  const obstacleRate = Math.min(0.35, 0.08 + num * 0.004);

  for (let i = 0; i < size; i++) {
    const row = Math.floor(i / w);
    const col = i % w;
    const edge = row === 0 || row === h - 1 || col === 0 || col === w - 1;

    if (num === 10) {
      // Finale: spread boxes, multi-color cubes, not one-tap win
      if (edge && rng() < 0.5) grid.push('bo');
      else if (rng() < 0.15) grid.push(pick(rng, OBSTACLE));
      else grid.push(pick(rng, CUBE));
      continue;
    }

    if (num <= 3) {
      if (row < 2) grid.push('bo');
      else grid.push(rng() < 0.7 ? 'rand' : pick(rng, CUBE));
      continue;
    }

    if (rng() < obstacleRate) {
      grid.push(num > 20 && rng() < 0.2 ? 'v' : pick(rng, OBSTACLE));
    } else if (rng() < 0.55) {
      grid.push('rand');
    } else {
      grid.push(pick(rng, CUBE));
    }
  }

  // Guarantee winnable goals
  let hasGoal = grid.some(c => ['bo', 's', 'v'].includes(c));
  if (!hasGoal) {
    grid[Math.floor(size / 2)] = 'bo';
  }

  return {
    level_number: num,
    grid_width: w,
    grid_height: h,
    move_count: num === 10 ? 28 : moves,
    grid
  };
}

function main() {
  if (!fs.existsSync(LEVELS_DIR)) fs.mkdirSync(LEVELS_DIR, { recursive: true });

  const levels = [];
  for (let n = 1; n <= 50; n++) {
    const level = n <= 9
      ? JSON.parse(fs.readFileSync(path.join(LEVELS_DIR, `level_${String(n).padStart(2, '0')}.json`), 'utf8'))
      : generateLevel(n);

    if (n === 10) {
      Object.assign(level, generateLevel(10));
      level.move_count = 28;
    }

    const file = `level_${String(n).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(LEVELS_DIR, file), JSON.stringify(level, null, 2) + '\n');
    levels.push(level);
    console.log(`  ✓ ${file} (${level.grid_width}×${level.grid_height}, ${level.move_count} moves)`);
  }

  const js = `const LEVELS = ${JSON.stringify(levels)};\n\n` + fs.readFileSync(OUT_JS, 'utf8').replace(/^const LEVELS = \[[\s\S]*?\];\n\n/, '');
  fs.writeFileSync(OUT_JS, js);
  console.log(`\n✅ Wrote ${levels.length} levels → js/levels.js`);
}

main();