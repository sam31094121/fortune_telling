/**
 * 將 resolve-mandarin-ids.mjs 解析出的正確 videoId 寫回 lib/mandarin-songs-db.ts。
 * 未解析到的歌曲 videoId 設為空字串，selectMandarinSongs 會自動過濾掉。
 * 用法：node scripts/apply-mandarin-ids.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'lib/mandarin-songs-db.ts';
const MAP = 'lib/generated/mandarin-resolved.json';

const resolved = JSON.parse(readFileSync(MAP, 'utf8'));
const lines = readFileSync(SRC, 'utf8').split('\n');

let replaced = 0;
let cleared = 0;

const out = lines.map((line) => {
  const m = line.match(/title:\s*'([^']+)'\s*,\s*artist:\s*'([^']+)'\s*,\s*videoId:\s*'([^']*)'/);
  if (!m) return line;
  const key = `${m[1]}|${m[2]}`;
  const entry = resolved[key];
  if (!entry) return line;
  const newId = entry.id || '';
  if (newId) replaced++;
  else cleared++;
  return line.replace(/videoId:\s*'[^']*'/, `videoId: '${newId}'`);
});

writeFileSync(SRC, out.join('\n'), 'utf8');
console.log(`已更新：替換 ${replaced} 首正確 ID，清空 ${cleared} 首未解析。`);
