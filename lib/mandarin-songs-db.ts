/**
 * 國語歌曲年代資料庫 · 天地人人格選歌引擎
 *
 * 核心邏輯：出生年 + 17 = 音樂黃金記憶年
 * 人格矩陣決定在同年代中偏好哪種情緒風格
 *
 * 情緒分類（soulTag）：
 *   情歌 - 高 emotion/attachment
 *   療癒 - 高 security/agreeableness
 *   磅礴 - 高 leadership/confidence
 *   青春 - 高 social/energy
 *   藝術 - 高 creativity/openness
 *   思念 - 高 emotion + attachment（深情型）
 *   搖滾 - 高 risk/rebellion
 *   靈魂 - 高 creativity + emotion
 */

export interface MandarinTrack {
  title: string;
  artist: string;
  videoId: string;
  soulTags: SoulTag[];  // 人格情緒標籤
  eraLabel: string;     // 顯示用年代文字
}

export type SoulTag =
  | '情歌' | '療癒' | '磅礴' | '青春'
  | '藝術' | '思念' | '搖滾' | '靈魂' | '清新' | '深情';

// ────────────────────────────────────────────────────────────
// 年代國語歌曲庫（17歲黃金記憶期對應年代）
// ────────────────────────────────────────────────────────────

const ERA_MANDARIN_SONGS: Record<string, MandarinTrack[]> = {
  '1960s': [
    { title: '何日君再來',  artist: '鄧麗君',  videoId: 'ikrasYUi3kM', soulTags: ['情歌','思念'],  eraLabel: '60年代' },
    { title: '今宵多珍重',  artist: '鄧麗君',  videoId: 'WBywrshc0fM', soulTags: ['情歌','深情'],  eraLabel: '60年代' },
    { title: '南屏晚鐘',    artist: '鄧麗君',  videoId: 'auF_7GQgzE0', soulTags: ['思念','靈魂'],  eraLabel: '60年代' },
  ],

  '1970s': [
    { title: '月亮代表我的心', artist: '鄧麗君', videoId: 'IiFm7AWP9n4', soulTags: ['情歌','深情'],  eraLabel: '70年代' },
    { title: '甜蜜蜜',         artist: '鄧麗君', videoId: '5eF8oOWtsk4', soulTags: ['青春','情歌'],  eraLabel: '70年代' },
    { title: '小城故事',       artist: '鄧麗君', videoId: 'Bgi5f_0atGE', soulTags: ['療癒','清新'],  eraLabel: '70年代' },
    { title: '橄欖樹',         artist: '齊豫',   videoId: 'LZb8fJZFhlo', soulTags: ['藝術','思念'],  eraLabel: '70年代' },
    { title: '龍的傳人',       artist: '侯德健', videoId: 'L8kLPuBSruc', soulTags: ['磅礴','靈魂'],  eraLabel: '70年代' },
  ],

  '1980s': [
    { title: '其實你不懂我的心', artist: '童安格', videoId: 'Wr9SYsEYRao', soulTags: ['情歌','深情'],  eraLabel: '80年代' },
    { title: '外面的世界',       artist: '齊秦',   videoId: 'PF3ZeNZOBE4', soulTags: ['思念','青春'],  eraLabel: '80年代' },
    { title: '酒干倘賣無',       artist: '蘇芮',   videoId: 'XJfFYbZn_P8', soulTags: ['磅礴','靈魂'],  eraLabel: '80年代' },
    { title: '一樣的月光',       artist: '蘇芮',   videoId: 'dqcoG9LUzgE', soulTags: ['清新','療癒'],  eraLabel: '80年代' },
    { title: '是否',             artist: '齊豫',   videoId: 'qvOgShSJFXU', soulTags: ['藝術','情歌'],  eraLabel: '80年代' },
    { title: '讓我一次愛個夠',   artist: '庾澄慶', videoId: 'XSq8nZy5caQ', soulTags: ['搖滾','青春'],  eraLabel: '80年代' },
    { title: '滾滾紅塵',         artist: '羅大佑', videoId: 'qVm3GdOd2P8', soulTags: ['磅礴','藝術'],  eraLabel: '80年代' },
    { title: '愛的代價',         artist: '張艾嘉', videoId: 'hqWI-vGjjcE', soulTags: ['深情','療癒'],  eraLabel: '80年代' },
  ],

  '1990s': [
    { title: '吻別',         artist: '張學友', videoId: 'mIF-nn_y2_8', soulTags: ['情歌','深情'],  eraLabel: '90年代' },
    { title: '夢中人',       artist: '王菲',   videoId: 'hN2jOHeI5tc', soulTags: ['藝術','靈魂'],  eraLabel: '90年代' },
    { title: '心太軟',       artist: '任賢齊', videoId: 'ZSWeurc1yMw', soulTags: ['情歌','青春'],  eraLabel: '90年代' },
    { title: '浪人情歌',     artist: '伍佰',   videoId: 'OPkqtboFFYI', soulTags: ['搖滾','深情'],  eraLabel: '90年代' },
    { title: '愛如潮水',     artist: '張信哲', videoId: 'LPl420bwG8c', soulTags: ['情歌','思念'],  eraLabel: '90年代' },
    { title: '領悟',         artist: '辛曉琪', videoId: 'RhfUGpEp9to', soulTags: ['深情','靈魂'],  eraLabel: '90年代' },
    { title: '最愛',         artist: '張學友', videoId: '16kQ_rIDHLo', soulTags: ['情歌','磅礴'],  eraLabel: '90年代' },
    { title: '夜夜夜夜',     artist: '陳淑樺', videoId: 'd7GfC4HAt54', soulTags: ['搖滾','青春'],  eraLabel: '90年代' },
    { title: '愛情釀的酒',   artist: '林憶蓮', videoId: 'jklCud4KxIQ', soulTags: ['療癒','情歌'],  eraLabel: '90年代' },
    { title: '北方的狼',     artist: '齊秦',   videoId: 'KPPAxhIbZyM', soulTags: ['搖滾','磅礴'],  eraLabel: '90年代' },
  ],

  '2000s': [
    { title: '晴天',       artist: '周杰倫', videoId: 'DYptgVvkVLQ', soulTags: ['清新','思念'],  eraLabel: '00年代' },
    { title: '七里香',     artist: '周杰倫', videoId: 'Bbp9ZaJD_eA', soulTags: ['清新','情歌'],  eraLabel: '00年代' },
    { title: '以父之名',   artist: '周杰倫', videoId: '9q7JOQfcJQM', soulTags: ['磅礴','藝術'],  eraLabel: '00年代' },
    { title: '青花瓷',     artist: '周杰倫', videoId: 'Z8Mqw0b9ADs', soulTags: ['藝術','療癒'],  eraLabel: '00年代' },
    { title: '知足',       artist: '五月天', videoId: '_o0oeyCtoFA', soulTags: ['療癒','情歌'],  eraLabel: '00年代' },
    { title: '突然好想你', artist: '五月天', videoId: 'GtDRcXtDg-4', soulTags: ['思念','深情'],  eraLabel: '00年代' },
    { title: '練習愛情',   artist: '林宥嘉', videoId: 'BUYOVuAdHAg', soulTags: ['情歌','清新'],  eraLabel: '00年代' },
    { title: '愛得太深',   artist: '王力宏', videoId: '', soulTags: ['深情','情歌'],  eraLabel: '00年代' },
    { title: '說謊',       artist: '林宥嘉', videoId: 'ftfJRzW0MPo', soulTags: ['藝術','靈魂'],  eraLabel: '00年代' },
    { title: '親愛的那不是愛情', artist: '張惠妹', videoId: 'HwF1i_6Iwp8', soulTags: ['情歌','搖滾'], eraLabel: '00年代' },
    { title: '星晴',       artist: '周杰倫', videoId: 'sTNJsIcPSvE', soulTags: ['青春','清新'],  eraLabel: '00年代' },
  ],

  '2010s': [
    { title: '稻香',         artist: '周杰倫', videoId: 'sHD_z90ZKV0', soulTags: ['療癒','清新'],  eraLabel: '10年代' },
    { title: '告白氣球',     artist: '周杰倫', videoId: 'bu7nU9Mhpyo', soulTags: ['情歌','青春'],  eraLabel: '10年代' },
    { title: '你就不要想起我', artist: '告五人', videoId: 'T8J7fkNp34k', soulTags: ['思念','深情'],  eraLabel: '10年代' },
    { title: '運氣來了',     artist: '告五人', videoId: '', soulTags: ['清新','療癒'],  eraLabel: '10年代' },
    { title: '殘缺的彩虹',   artist: '魏如萱', videoId: 'hzAeZa7dJj4', soulTags: ['藝術','靈魂'],  eraLabel: '10年代' },
    { title: '小情歌',       artist: '蘇打綠', videoId: 'in8NNzwFa-s', soulTags: ['情歌','清新'],  eraLabel: '10年代' },
    { title: '你那麼愛她',   artist: '鄧紫棋', videoId: 'dy70lVVxhh4', soulTags: ['情歌','磅礴'],  eraLabel: '10年代' },
    { title: '泡沫',         artist: '鄧紫棋', videoId: 'z3VcOwHorP4', soulTags: ['藝術','深情'],  eraLabel: '10年代' },
    { title: '消愁',         artist: '毛不易', videoId: 'ZHGN3ViWrns', soulTags: ['思念','靈魂'],  eraLabel: '10年代' },
    { title: '像我這樣的人', artist: '毛不易', videoId: 'nBcYrqsv5tc', soulTags: ['療癒','靈魂'],  eraLabel: '10年代' },
    { title: '等你下課',     artist: '周杰倫', videoId: 'kfXdP7nZIiE', soulTags: ['思念','青春'],  eraLabel: '10年代' },
  ],

  '2020s': [
    { title: '起風了',       artist: '買辣椒也用券', videoId: '3tJUflhYIpo', soulTags: ['思念','靈魂'], eraLabel: '20年代' },
    { title: '漠河舞廳',     artist: '柳爽',     videoId: 'HFR6XcsFlII', soulTags: ['藝術','深情'],  eraLabel: '20年代' },
    { title: '不知所措',     artist: '告五人',   videoId: 'Vr0b7OKMBrE', soulTags: ['情歌','思念'],  eraLabel: '20年代' },
    { title: '愛你',         artist: '周興哲',   videoId: '-78d_NJiLqY', soulTags: ['情歌','深情'],  eraLabel: '20年代' },
    { title: '你的答案',     artist: '阿冗',     videoId: 'ye4jAQ0uxcQ', soulTags: ['磅礴','療癒'],  eraLabel: '20年代' },
    { title: '錯位時空',     artist: '艾辰',     videoId: 'mXf3Klcn-sM', soulTags: ['思念','藝術'],  eraLabel: '20年代' },
    { title: '踏山河',       artist: '是七叔呢', videoId: 'U8glgcaodNM', soulTags: ['磅礴','搖滾'],  eraLabel: '20年代' },
    { title: '半生雪',       artist: '付宇',     videoId: 'B-d_I1O0dYw', soulTags: ['深情','靈魂'],  eraLabel: '20年代' },
    { title: '往後餘生',     artist: '馬良',     videoId: 'qCey-my4yFo', soulTags: ['情歌','療癒'],  eraLabel: '20年代' },
    { title: '世界這麼大還是遇見你', artist: '袁野維', videoId: 'cHM25ZZkkRo', soulTags: ['清新','情歌'], eraLabel: '20年代' },
  ],
};

// ────────────────────────────────────────────────────────────
// 人格矩陣 → 靈魂標籤偏好排序
// ────────────────────────────────────────────────────────────

export interface PersonalityMatrixLike {
  emotion: number;
  creativity: number;
  social: number;
  leadership: number;
  security: number;
  risk: number;
  attachment: number;
  logic: number;
}

export function derivePreferredTags(matrix: PersonalityMatrixLike): SoulTag[] {
  const tags: { tag: SoulTag; score: number }[] = [
    { tag: '情歌',  score: (matrix.emotion + matrix.attachment) / 2 },
    { tag: '深情',  score: (matrix.attachment + matrix.emotion * 1.2) / 2.2 },
    { tag: '思念',  score: (matrix.emotion + (100 - matrix.social)) / 2 },
    { tag: '療癒',  score: (matrix.security + (100 - matrix.risk)) / 2 },
    { tag: '青春',  score: (matrix.social + (100 - matrix.attachment) * 0.5) / 1.5 },
    { tag: '磅礴',  score: (matrix.leadership + matrix.logic) / 2 },
    { tag: '藝術',  score: (matrix.creativity + matrix.emotion * 0.4) / 1.4 },
    { tag: '清新',  score: (matrix.security + matrix.social * 0.5) / 1.5 },
    { tag: '搖滾',  score: (matrix.risk + matrix.leadership * 0.5) / 1.5 },
    { tag: '靈魂',  score: (matrix.creativity + matrix.emotion + matrix.attachment) / 3 },
  ];

  return tags
    .sort((a, b) => b.score - a.score)
    .map(t => t.tag);
}

// ────────────────────────────────────────────────────────────
// 主選歌函式：era + matrix → 最多 5 首國語歌
// ────────────────────────────────────────────────────────────

export function selectMandarinSongs(
  era: string,
  matrix: PersonalityMatrixLike,
  maxTracks = 5,
): MandarinTrack[] {
  const pool = ERA_MANDARIN_SONGS[era] ?? ERA_MANDARIN_SONGS['2000s'];
  const preferredTags = derivePreferredTags(matrix);

  // 對每首歌打分：越早出現在偏好標籤列表，分數越高
  const scored = pool.map(track => {
    let score = 0;
    for (const tag of track.soulTags) {
      const rank = preferredTags.indexOf(tag);
      if (rank !== -1) score += (10 - rank); // 排名越前分數越高
    }
    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 取前 N 首，過濾掉有問題的 videoId
  return scored
    .filter(({ track }) => track.videoId && track.videoId.length === 11)
    .slice(0, maxTracks)
    .map(({ track }) => track);
}

// ────────────────────────────────────────────────────────────
// 取年代展示名稱
// ────────────────────────────────────────────────────────────

export function getEraDisplayName(era: string): string {
  const labels: Record<string, string> = {
    '1950s': '五〇年代',
    '1960s': '六〇年代',
    '1970s': '七〇年代',
    '1980s': '八〇年代',
    '1990s': '九〇年代',
    '2000s': '千禧年代',
    '2010s': '二〇一〇年代',
    '2020s': '二〇二〇年代',
  };
  return labels[era] ?? era;
}

export type { MandarinTrack as MandarinTrackType };
