/**
 * 通用版：自動解析任一歌庫檔的正確 YouTube videoId。
 *
 * 用法：
 *   node scripts/resolve-song-ids.mjs <歌庫.ts> <輸出.json>
 *   例：node scripts/resolve-song-ids.mjs lib/taiwanese-songs-db.ts lib/generated/taiwanese-resolved.json
 *
 * 流程（每首歌）：搜尋 YouTube → 取候選 videoId → oEmbed 比對標題/歌手 → 接受第一個吻合者。
 * 可續跑：已解析者跳過；每首即時存檔。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error('用法：node scripts/resolve-song-ids.mjs <歌庫.ts> <輸出.json>');
  process.exit(1);
}

function extractTracks(src) {
  const re = /title:\s*'([^']+)'[^}]*?artist:\s*'([^']+)'[^}]*?videoId:\s*'([^']*)'/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push({ title: m[1], artist: m[2], oldId: m[3] });
  return out;
}

const norm = (s) => s.replace(/\s+/g, '').replace(/[【】\[\]()（）]/g, '').toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return res;
    } catch (e) {
      if (attempt === tries) throw e;
      await sleep(1500 * attempt);
    }
  }
}

async function searchCandidates(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetchWithRetry(url, { headers: { 'Accept-Language': 'zh-TW' } });
  const html = await res.text();
  const ids = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]);
  return [...new Set(ids)].slice(0, 8);
}

async function oembed(id) {
  const res = await fetchWithRetry(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
  );
  if (res.status !== 200) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isMatch(track, info) {
  const t = norm(info.title);
  const a = norm(info.author_name || '');
  const song = norm(track.title);
  const artist = norm(track.artist);
  const titleHasSong = t.includes(song);
  const artistOk = a.includes(artist) || t.includes(artist);
  if (titleHasSong && (artistOk || song.length >= 3)) return true;
  return false;
}

async function resolveTrack(track) {
  const candidates = await searchCandidates(`${track.title} ${track.artist} 台語`);
  for (const id of candidates) {
    const info = await oembed(id);
    if (info && isMatch(track, info)) {
      return { id, embeddable: true, oembedTitle: info.title };
    }
    await sleep(150);
  }
  return { id: null, embeddable: false, oembedTitle: null };
}

async function main() {
  const src = readFileSync(SRC, 'utf8');
  const tracks = extractTracks(src);
  const result = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const key = `${track.title}|${track.artist}`;
    if (result[key]?.id) {
      console.log(`[${i + 1}/${tracks.length}] ${track.title} -> 已解析，跳過`);
      continue;
    }
    try {
      const r = await resolveTrack(track);
      result[key] = r;
      console.log(`[${i + 1}/${tracks.length}] ${track.title} - ${track.artist} -> ${r.id ?? 'NOT FOUND'}`);
    } catch (e) {
      console.log(`[${i + 1}/${tracks.length}] ${track.title} -> ERROR ${e.message}（保留待重跑）`);
    }
    mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
    writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
    await sleep(700);
  }

  const ok = Object.values(result).filter((r) => r.id).length;
  console.log(`\nDONE: ${ok}/${tracks.length} resolved. Saved to ${OUT}`);
}

main();
