#!/usr/bin/env node
/** Deploy to Vercel via REST API (no CLI shell needed) */
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const ROOT = __dirname;
const PROJECT_ID = 'prj_Q4z2s7Eea5MP0jmwo8yNQZeF11hP';
const TEAM_ID = 'team_QtdH0WrS8XkWVwe4C1RK8Du6';
const SKIP = new Set(['.git', '.vercel', '.tools', 'node_modules', '.DS_Store', 'deploy-vercel-api.js']);

function getToken() {
  const authPath = path.join(process.env.HOME || '', 'Library/Application Support/com.vercel.cli/auth.json');
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  return auth.token;
}

function walk(dir, base = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(path.join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

function ensureIcons() {
  const iconDir = path.join(ROOT, 'icons');
  const icon192 = path.join(iconDir, 'icon-192.png');
  const icon512 = path.join(iconDir, 'icon-512.png');
  if (fs.existsSync(icon192) && fs.existsSync(icon512)) return;

  const crc32 = (buf) => {
    let c = 0xffffffff;
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let x = n;
        for (let k = 0; k < 8; k++) x = (x & 1) ? (0xedb88320 ^ (x >>> 1)) : (x >>> 1);
        t[n] = x;
      }
      return t;
    })());
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };
  const colorAt = (x, y, size) => {
    const pad = Math.floor(size * 0.12);
    const gap = Math.floor(size * 0.04);
    const tile = Math.floor((size - pad * 2 - gap) / 2);
    const colors = [[255, 71, 87], [46, 213, 115], [55, 66, 250], [255, 165, 2]];
    const cols = [[pad, pad], [pad + tile + gap, pad], [pad, pad + tile + gap], [pad + tile + gap, pad + tile + gap]];
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = cols[i];
      if (x >= cx && x < cx + tile && y >= cy && y < cy + tile) return [...colors[i], 255];
    }
    return [108 + Math.floor((x / size) * 20), 92 + Math.floor((y / size) * 30), 231, 255];
  };
  const createPng = (size) => {
    const rows = [];
    for (let y = 0; y < size; y++) {
      const row = Buffer.alloc(1 + size * 4);
      row[0] = 0;
      for (let x = 0; x < size; x++) {
        const [r, g, b, a] = colorAt(x, y, size);
        const i = 1 + x * 4;
        row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = a;
      }
      rows.push(row);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
      chunk('IEND', Buffer.alloc(0))
    ]);
  };

  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });
  fs.writeFileSync(icon192, createPng(192));
  fs.writeFileSync(icon512, createPng(512));
}

function request(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.vercel.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  ensureIcons();
  const token = getToken();
  const filePaths = walk(ROOT);
  const files = filePaths.map((file) => ({
    file,
    encoding: 'base64',
    data: fs.readFileSync(path.join(ROOT, file)).toString('base64')
  }));

  console.log(`Deploying ${files.length} files to Vercel...`);
  const res = await request('POST', `/v13/deployments?teamId=${TEAM_ID}`, {
    name: 'mte-pop',
    project: PROJECT_ID,
    target: 'production',
    files
  }, token);

  if (res.status < 200 || res.status >= 300) {
    console.error('Deploy failed:', res.status, JSON.stringify(res.data, null, 2));
    process.exit(1);
  }

  const url = res.data?.url ? `https://${res.data.url}` : 'https://mte-pop.vercel.app';
  console.log('Deployed:', url);
  console.log('Ready:', res.data?.readyState);
})();