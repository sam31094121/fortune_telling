import fs from 'fs';
import http from 'http';
import path from 'path';

const root = 'C:/Users/DRAGON/Desktop/\u547d\u7406';

function walk(dir, acc = [], depth = 0) {
  if (depth > 7) return acc;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'out'].includes(e.name)) continue;
      walk(p, acc, depth + 1);
    } else if (/\.(tsx|ts|jsx|js|mdx)$/.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const keys = ['立體太極模型工作室', 'home-feature-launch', '打開模型工作室', '獨立 3D 工作區', 'order-10'];
const files = walk(path.join(root, 'app')).concat(walk(path.join(root, 'components')));
const hits = [];
for (const f of files) {
  let t;
  try {
    t = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  const marks = [];
  for (const k of keys) if (t.includes(k)) marks.push(k);
  if (t.includes('/3D') || t.includes("'/3D'") || t.includes('"/3D"')) marks.push('/3D');
  if (marks.length) hits.push({ file: f.replace(root + path.sep, '').replace(/\\/g, '/'), marks });
}
console.log('HITS', JSON.stringify(hits, null, 2));

function get(u) {
  return new Promise((resolve) => {
    const req = http.get(u, { timeout: 6000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        if (body.length < 200000) body += c;
      });
      res.on('end', () =>
        resolve({
          u,
          s: res.statusCode,
          len: body.length,
          hasStudio: body.includes('立體太極模型工作室'),
          hasHref3D: body.includes('href="/3D"') || body.includes('href=\\"/3D\\"'),
          hasLaunch: body.includes('home-feature-launch'),
        }),
      );
    });
    req.on('error', (e) => resolve({ u, e: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ u, e: 'timeout' });
    });
  });
}

for (const u of ['http://127.0.0.1:8888/', 'http://127.0.0.1:8888/3D', 'http://127.0.0.1:8888/3d']) {
  console.log('HTTP', JSON.stringify(await get(u)));
}
