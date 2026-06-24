/**
 * 台語歌曲年代資料庫 · 天地人人格選歌引擎
 *
 * 與國語庫共用同一套「靈魂情緒標籤」(SoulTag) 與選歌邏輯，
 * 由人格矩陣（出生 + 血型 + 性別融合而來）決定偏好，精準選出 1 首台語歌。
 *
 * videoId 由 scripts/resolve-song-ids.mjs 自動抓取並驗證後寫入。
 */

import { derivePreferredTags, type PersonalityMatrixLike, type SoulTag } from './mandarin-songs-db';

export interface TaiwaneseTrack {
  title: string;
  artist: string;
  videoId: string;
  soulTags: SoulTag[];
  eraLabel: string;
}

// ────────────────────────────────────────────────────────────
// 年代台語歌曲庫（17歲黃金記憶期對應年代）
// ────────────────────────────────────────────────────────────

const ERA_TAIWANESE_SONGS: Record<string, TaiwaneseTrack[]> = {
  '1960s': [
    { title: '望春風',     artist: '鳳飛飛', videoId: 'm5kbn_PBYpo', soulTags: ['思念', '深情'], eraLabel: '60年代' },
    { title: '雨夜花',     artist: '江蕙',   videoId: '6Jh7b5WNbx8', soulTags: ['思念', '靈魂'], eraLabel: '60年代' },
    { title: '補破網',     artist: '鳳飛飛', videoId: '2XrEv9eazcM', soulTags: ['療癒', '深情'], eraLabel: '60年代' },
  ],

  '1970s': [
    { title: '思慕的人',         artist: '洪一峰', videoId: 'tPeRRB5-zE4', soulTags: ['思念', '深情'], eraLabel: '70年代' },
    { title: '舊情綿綿',         artist: '洪一峰', videoId: 'l_gkmpy7nxU', soulTags: ['情歌', '思念'], eraLabel: '70年代' },
    { title: '媽媽請你也保重',   artist: '文夏',   videoId: 'fiGAE4IAPrg', soulTags: ['思念', '療癒'], eraLabel: '70年代' },
  ],

  '1980s': [
    { title: '一支小雨傘', artist: '洪榮宏', videoId: 'P8GiUSfbbtI', soulTags: ['情歌', '青春'], eraLabel: '80年代' },
    { title: '心事誰人知', artist: '沈文程', videoId: 'T8_9SHCc6tQ', soulTags: ['思念', '靈魂'], eraLabel: '80年代' },
    { title: '港都夜雨',   artist: '洪一峰', videoId: 'j3UVFz0eHpc', soulTags: ['思念', '藝術'], eraLabel: '80年代' },
  ],

  '1990s': [
    { title: '愛拚才會贏',   artist: '葉啟田', videoId: '', soulTags: ['磅礴', '搖滾'], eraLabel: '90年代' },
    { title: '家後',         artist: '江蕙',   videoId: 'KAntP2xs8FE', soulTags: ['深情', '療癒'], eraLabel: '90年代' },
    { title: '酒後的心聲',   artist: '江蕙',   videoId: 'Y1H22SMnS5M', soulTags: ['思念', '深情'], eraLabel: '90年代' },
    { title: '浪子的心情',   artist: '王識賢', videoId: 'yG7E6smLIEM', soulTags: ['搖滾', '深情'], eraLabel: '90年代' },
    { title: '傷心酒店',     artist: '江蕙',   videoId: 'Jl0CAEZn9II', soulTags: ['情歌', '思念'], eraLabel: '90年代' },
  ],

  '2000s': [
    { title: '流浪到淡水',   artist: '金門王與李炳輝', videoId: '9plPMDcD4dU', soulTags: ['青春', '靈魂'], eraLabel: '00年代' },
    { title: '落雨聲',       artist: '江蕙',           videoId: 'a53LYWWuAWU', soulTags: ['思念', '深情'], eraLabel: '00年代' },
    { title: '車站',         artist: '張秀卿',         videoId: 'WzwhMFMTxNU', soulTags: ['思念', '情歌'], eraLabel: '00年代' },
    { title: '甲你攬牢牢',   artist: '江蕙',           videoId: 's8MKF5o6lco', soulTags: ['情歌', '療癒'], eraLabel: '00年代' },
  ],

  '2010s': [
    { title: '浪子回頭', artist: '茄子蛋', videoId: 'x3bDhtuC5yk', soulTags: ['搖滾', '靈魂'], eraLabel: '10年代' },
    { title: '晚安台灣', artist: '滅火器', videoId: 'MaJYdrJP3uw', soulTags: ['磅礴', '療癒'], eraLabel: '10年代' },
    { title: '島嶼天光', artist: '滅火器', videoId: 'VZMqcZF7wic', soulTags: ['磅礴', '青春'], eraLabel: '10年代' },
    { title: '身騎白馬', artist: '徐佳瑩', videoId: 'lR17BV2_7PQ', soulTags: ['藝術', '深情'], eraLabel: '10年代' },
  ],

  '2020s': [
    { title: '浪流連',       artist: '茄子蛋',   videoId: '3Y0Ut5ozaKs', soulTags: ['情歌', '靈魂'], eraLabel: '20年代' },
    { title: '這款自作多情', artist: '茄子蛋',   videoId: 'UocMW7BG0ls', soulTags: ['搖滾', '青春'], eraLabel: '20年代' },
    { title: '嬰仔人',       artist: '鄭宜農',   videoId: '', soulTags: ['藝術', '療癒'], eraLabel: '20年代' },
    { title: '千千',         artist: '鄭宜農',   videoId: 'YU1jbRoqVu4', soulTags: ['藝術', '靈魂'], eraLabel: '20年代' },
  ],
};

// ────────────────────────────────────────────────────────────
// 主選歌函式：era + 人格矩陣 → 最精準的 1 首台語歌
// ────────────────────────────────────────────────────────────

export function selectTaiwaneseSong(
  era: string,
  matrix: PersonalityMatrixLike,
): TaiwaneseTrack | null {
  const pool = ERA_TAIWANESE_SONGS[era] ?? ERA_TAIWANESE_SONGS['2000s'];
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
  return scored[0]?.track ?? null;
}
