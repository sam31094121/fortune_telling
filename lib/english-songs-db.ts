/**
 * 英文歌曲資料庫 · 天地人人格選歌引擎
 *
 * 與國語庫共用同一套「靈魂情緒標籤」(SoulTag)，
 * 由人格矩陣(出生 + 血型 + 性別融合而來)決定偏好，精準選出 1 首。
 *
 * videoId 沿用專案內已驗證可嵌入播放的 YouTube 影片。
 */

import { derivePreferredTags, type PersonalityMatrixLike, type SoulTag } from './mandarin-songs-db';

export interface EnglishTrack {
  title: string;
  artist: string;
  videoId: string;
  soulTags: SoulTag[];
}

// ────────────────────────────────────────────────────────────
// 國際英文歌曲庫（已驗證可嵌入）
// ────────────────────────────────────────────────────────────

const ENGLISH_SONGS: EnglishTrack[] = [
  { title: 'Hello',              artist: 'Adele',            videoId: 'YQHsXMglC9A', soulTags: ['深情', '思念'] },
  { title: 'Someone Like You',   artist: 'Adele',            videoId: 'hLQl3WQQoQ0', soulTags: ['深情', '情歌'] },
  { title: 'Thinking Out Loud',  artist: 'Ed Sheeran',       videoId: 'lp-EO5I60KA', soulTags: ['情歌', '深情'] },
  { title: 'Shape of You',       artist: 'Ed Sheeran',       videoId: 'JGwWNGJdvx8', soulTags: ['青春', '情歌'] },
  { title: 'The A Team',         artist: 'Ed Sheeran',       videoId: 'UAWcs5H-qgQ', soulTags: ['藝術', '思念'] },
  { title: 'Believer',           artist: 'Imagine Dragons',  videoId: '7wtfhZwyrcc', soulTags: ['磅礴', '搖滾'] },
  { title: 'Radioactive',        artist: 'Imagine Dragons',  videoId: 'ktvTqknDobU', soulTags: ['搖滾', '磅礴'] },
  { title: 'Faded',              artist: 'Alan Walker',      videoId: '60ItHLz5WEA', soulTags: ['思念', '藝術'] },
  { title: 'On My Way',          artist: 'Alan Walker',      videoId: 'dhYOPzcsbGM', soulTags: ['磅礴', '青春'] },
  { title: 'Darkside',           artist: 'Alan Walker',      videoId: 'M-P4QBt-FWw', soulTags: ['藝術', '靈魂'] },
  { title: 'Experience',         artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U', soulTags: ['藝術', '療癒'] },
  { title: 'River Flows In You',  artist: 'Yiruma',           videoId: '7maJOI3QMu0', soulTags: ['療癒', '清新'] },
  { title: 'Only Time',          artist: 'Enya',             videoId: '7wfYIMyS_dI', soulTags: ['療癒', '靈魂'] },
  { title: 'Orinoco Flow',       artist: 'Enya',             videoId: 'LTrk4X9ACtw', soulTags: ['清新', '療癒'] },
];

// ────────────────────────────────────────────────────────────
// 主選歌函式：人格矩陣 → 最精準的 1 首英文歌
// ────────────────────────────────────────────────────────────

export function selectEnglishSong(matrix: PersonalityMatrixLike): EnglishTrack {
  const preferredTags = derivePreferredTags(matrix);

  const scored = ENGLISH_SONGS.map((track) => {
    let score = 0;
    for (const tag of track.soulTags) {
      const rank = preferredTags.indexOf(tag);
      if (rank !== -1) score += 10 - rank; // 排名越前分數越高
    }
    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.track ?? ENGLISH_SONGS[0];
}
