/**
 * 自動解析國語歌庫的正確 YouTube videoId。
 *
 * 流程（每首歌）：
 *   1. 抓 YouTube 搜尋結果頁，取出前數個候選 videoId
 *   2. 逐一用 oEmbed 取得真實標題/作者
 *   3. 比對「歌名」或「歌手」是否吻合 → 接受第一個吻合者
 *
 * 輸出：lib/generated/mandarin-resolved.json （title|artist → { id, embeddable, oembedTitle }）
 * 用法：node scripts/resolve-mandarin-ids.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SRC = 'lib/mandarin-songs-db.ts';
const OUT = 'lib/generated/mandarin-resolved.json';

function extractTracks(src) {
  const re = /title:\s*'([^']+)'[^}]*?artist:\s*'([^']+)'[^}]*?videoId:\s*'([^']+)'/g;
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
      await sleep(1500 * attempt); // 退避
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
  // 歌名吻合 + (作者或標題含歌手) 最可靠；歌名吻合且夠長也接受
  if (titleHasSong && (artistOk || song.length >= 3)) return true;
  return false;
}

async function resolveTrack(track) {
  const candidates = await searchCandidates(`${track.title} ${track.artist}`);
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

  // 可續跑：載入既有結果，跳過已成功解析的
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
    // 每首都即時存檔，續跑不丟進度
    mkdirSync('lib/generated', { recursive: true });
    writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
    await sleep(700);
  }

  const ok = Object.values(result).filter((r) => r.id).length;
  console.log(`\nDONE: ${ok}/${tracks.length} resolved. Saved to ${OUT}`);
}

main();
