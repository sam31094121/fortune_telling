/**
 * 通用版：將解析出的正確 videoId 寫回任一歌庫檔。
 * 未解析到的歌曲 videoId 設為空字串，選歌函式會自動過濾。
 * 用法：node scripts/apply-song-ids.mjs <歌庫.ts> <解析.json>
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2];
const MAP = process.argv[3];
if (!SRC || !MAP) {
  console.error('用法：node scripts/apply-song-ids.mjs <歌庫.ts> <解析.json>');
  process.exit(1);
}

const resolved = JSON.parse(readFileSync(MAP, 'utf8'));
const lines = readFileSync(SRC, 'utf8').split('\n');

let replaced = 0;
let cleared = 0;

const out = lines.map((line) => {
  const m = line.match(/title:\s*'([^']+)'\s*,\s*artist:\s*'([^']+)'\s*,\s*videoId:\s*'([^']*)'/);
  if (!m) return line;
  const entry = resolved[`${m[1]}|${m[2]}`];
  if (!entry) return line;
  const newId = entry.id || '';
  if (newId) replaced++;
  else cleared++;
  return line.replace(/videoId:\s*'[^']*'/, `videoId: '${newId}'`);
});

writeFileSync(SRC, out.join('\n'), 'utf8');
console.log(`已更新 ${SRC}：替換 ${replaced} 首正確 ID，清空 ${cleared} 首未解析。`);
