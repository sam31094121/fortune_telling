/**
 * 英文歌曲年代資料庫 · 天地人人格選歌引擎
 *
 * 與國語庫共用同一套「靈魂情緒標籤」(SoulTag)，
 * 由用戶出生年代(era)與人格矩陣決定偏好，精準選出 1 首天宿英文歌曲。
 */

import { derivePreferredTags, type PersonalityMatrixLike, type SoulTag } from './mandarin-songs-db';

export interface EnglishTrack {
  title: string;
  artist: string;
  videoId: string;
  soulTags: SoulTag[];
  eraLabel: string;
}

// ────────────────────────────────────────────────────────────
// 年代英文歌曲庫（符合各年代靈魂記憶點的全球金曲，已驗證 YouTube ID）
// ────────────────────────────────────────────────────────────

const ERA_ENGLISH_SONGS: Record<string, EnglishTrack[]> = {
  '1960s': [
    { title: 'Yesterday',                  artist: 'The Beatles',      videoId: 'wM0IDLA4CJo', soulTags: ['思念', '深情'], eraLabel: '60年代' },
    { title: "Can't Help Falling In Love", artist: 'Elvis Presley',    videoId: 'vGJTaP5anOU', soulTags: ['情歌', '深情'], eraLabel: '60年代' },
    { title: 'Blowin In The Wind',         artist: 'Bob Dylan',        videoId: 'vWwgrjjyRZM', soulTags: ['靈魂', '清新'], eraLabel: '60年代' },
  ],

  '1970s': [
    { title: 'Imagine',                    artist: 'John Lennon',      videoId: 'YkgkThdzx-8', soulTags: ['靈魂', '療癒'], eraLabel: '70年代' },
    { title: 'Hotel California',           artist: 'Eagles',           videoId: '09839DpTctU', soulTags: ['搖滾', '藝術'], eraLabel: '70年代' },
    { title: 'Dancing Queen',              artist: 'ABBA',             videoId: 'xFrGuyw1V8s', soulTags: ['青春', '情歌'], eraLabel: '70年代' },
  ],

  '1980s': [
    { title: 'Careless Whisper',           artist: 'George Michael',   videoId: 'izGwDsrQ1eQ', soulTags: ['情歌', '深情'], eraLabel: '80年代' },
    { title: 'Beat It',                    artist: 'Michael Jackson',  videoId: 'oRdxUFDoQe0', soulTags: ['搖滾', '磅礴'], eraLabel: '80年代' },
    { title: 'Take On Me',                 artist: 'A-ha',             videoId: 'djV11Xbc914', soulTags: ['青春', '清新'], eraLabel: '80年代' },
  ],

  '1990s': [
    { title: 'My Heart Will Go On',        artist: 'Celine Dion',      videoId: 'WNIPqapd4FQ', soulTags: ['深情', '情歌'], eraLabel: '90年代' },
    { title: 'I Want It That Way',         artist: 'Backstreet Boys',  videoId: '4fndeDfaWCg', soulTags: ['情歌', '青春'], eraLabel: '90年代' },
    { title: 'Zombie',                     artist: 'The Cranberries',  videoId: '6TxiJLy0P5M', soulTags: ['搖滾', '藝術'], eraLabel: '90年代' },
  ],

  '2000s': [
    { title: 'Yellow',                     artist: 'Coldplay',         videoId: 'yKNxeF4Kxyc', soulTags: ['情歌', '清新'], eraLabel: '00年代' },
    { title: 'Bad Romance',                artist: 'Lady Gaga',        videoId: 'qrO4YZeyl0I', soulTags: ['搖滾', '磅礴'], eraLabel: '00年代' },
    { title: 'Complicated',                artist: 'Avril Lavigne',    videoId: '5NPBIwQffSE', soulTags: ['青春', '搖滾'], eraLabel: '00年代' },
  ],

  '2010s': [
    { title: 'Someone Like You',           artist: 'Adele',            videoId: 'hLQl3WQQoQ0', soulTags: ['深情', '情歌'], eraLabel: '10年代' },
    { title: 'Shape of You',               artist: 'Ed Sheeran',       videoId: 'JGwWNGJdvx8', soulTags: ['青春', '情歌'], eraLabel: '10年代' },
    { title: 'Believer',                   artist: 'Imagine Dragons',  videoId: '7wtfhZwyrcc', soulTags: ['磅礴', '搖滾'], eraLabel: '10年代' },
  ],

  '2020s': [
    { title: 'Blinding Lights',            artist: 'The Weeknd',       videoId: '4NRXx6U8ABQ', soulTags: ['搖滾', '青春'], eraLabel: '20年代' },
    { title: 'Stay',                       artist: 'The Kid LAROI',    videoId: 'kTJczUoc26U', soulTags: ['情歌', '青春'], eraLabel: '20年代' },
    { title: 'As It Was',                  artist: 'Harry Styles',     videoId: 'H5v3kku4y6Q', soulTags: ['清新', '療癒'], eraLabel: '20年代' },
  ],
};

// ────────────────────────────────────────────────────────────
// 主選歌函式：era + 人格矩陣 → 最精準的 1 首英文歌
// ────────────────────────────────────────────────────────────

export function selectEnglishSong(
  era: string,
  matrix: PersonalityMatrixLike,
): EnglishTrack {
  const pool = ERA_ENGLISH_SONGS[era] ?? ERA_ENGLISH_SONGS['2000s'];
  const preferredTags = derivePreferredTags(matrix);

  const scored = pool
    .filter((track) => track.videoId && track.videoId.length === 11)
    .map((track) => {
      let score = 0;
      for (const tag of track.soulTags) {
        const rank = preferredTags.indexOf(tag);
        if (rank !== -1) score += 10 - rank;
      }
      return { track, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.track ?? pool[0];
}
