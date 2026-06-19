import { DIMENSION_KEYS } from './types';
import type { DimensionKey, DimensionScores, GenreMatch, MusicProfile, SoundProfile } from './types';

// ── Genre × Dimension affinity matrix ─────────────────────────────────────
// Weight range: -1.0 to +1.0
// Positive  = higher dimension score → more affinity with this genre
// Negative  = higher dimension score → less affinity
// Algorithm: weighted dot product, normalized per-genre to 0-100

interface GenreDefinition {
  key: string;
  name: string;
  emoji: string;
  artists: string[];
  soundDesc: string;
  weights: Record<DimensionKey, number>;
}

const GENRE_DEFINITIONS: GenreDefinition[] = [
  {
    key: 'pop',
    name: '流行',
    emoji: '🎵',
    artists: ['周杰倫', '鄧紫棋', '蔡依林'],
    soundDesc: '旋律朗朗上口、人聲為主、節奏適中',
    weights: {
      emotion: 0.6,
      logic: -0.1,
      social: 0.8,
      leadership: 0.1,
      risk: 0.1,
      execution: 0.2,
      creativity: 0.3,
      empathy: 0.4,
      control: -0.1,
      security: 0.3,
      wealth: 0.2,
      attachment: 0.7,
    },
  },
  {
    key: 'rock',
    name: '搖滾',
    emoji: '🎸',
    artists: ['五月天', '蘇打綠', 'Linkin Park'],
    soundDesc: '吉他主導、節奏強烈、有張力',
    weights: {
      emotion: 0.3,
      logic: 0.1,
      social: 0.3,
      leadership: 0.7,
      risk: 0.8,
      execution: 0.6,
      creativity: 0.4,
      empathy: 0.2,
      control: 0.3,
      security: -0.3,
      wealth: 0.2,
      attachment: 0.2,
    },
  },
  {
    key: 'electronic',
    name: '電子 / EDM',
    emoji: '🎛️',
    artists: ['Felix Jaehn', 'Martin Garrix', 'Kygo'],
    soundDesc: '節拍驅動、合成音色、律動感強',
    weights: {
      emotion: 0.2,
      logic: 0.4,
      social: 0.7,
      leadership: 0.5,
      risk: 0.7,
      execution: 0.5,
      creativity: 0.8,
      empathy: 0.1,
      control: 0.2,
      security: -0.2,
      wealth: 0.3,
      attachment: 0.1,
    },
  },
  {
    key: 'classical',
    name: '古典 / 器樂',
    emoji: '🎻',
    artists: ['Einaudi', '馬友友', 'Yiruma'],
    soundDesc: '結構精密、層次豐富、不依賴人聲',
    weights: {
      emotion: 0.4,
      logic: 0.9,
      social: -0.2,
      leadership: 0.2,
      risk: -0.1,
      execution: 0.3,
      creativity: 0.6,
      empathy: 0.3,
      control: 0.8,
      security: 0.5,
      wealth: 0.1,
      attachment: 0.1,
    },
  },
  {
    key: 'jazz',
    name: '爵士 / 藍調',
    emoji: '🎷',
    artists: ['蔡健雅', 'Diana Krall', 'Norah Jones'],
    soundDesc: '即興感強、和聲複雜、氣氛沉穩',
    weights: {
      emotion: 0.5,
      logic: 0.7,
      social: 0.3,
      leadership: 0.3,
      risk: 0.4,
      execution: 0.3,
      creativity: 0.9,
      empathy: 0.6,
      control: 0.2,
      security: 0.1,
      wealth: 0.1,
      attachment: 0.3,
    },
  },
  {
    key: 'rnb_soul',
    name: 'R&B / Soul',
    emoji: '🎤',
    artists: ['陳奕迅', 'Bruno Mars', '周湯豪'],
    soundDesc: '人聲情感飽滿、律動柔和、情緒共鳴強',
    weights: {
      emotion: 0.9,
      logic: -0.1,
      social: 0.4,
      leadership: 0.2,
      risk: 0.1,
      execution: 0.2,
      creativity: 0.4,
      empathy: 0.8,
      control: -0.1,
      security: 0.2,
      wealth: 0.1,
      attachment: 0.9,
    },
  },
  {
    key: 'folk_indie',
    name: '民謠 / 獨立',
    emoji: '🪕',
    artists: ['盧廣仲', '李榮浩', 'Ed Sheeran'],
    soundDesc: '吉他溫暖、歌詞性強、氛圍療癒',
    weights: {
      emotion: 0.6,
      logic: 0.2,
      social: -0.1,
      leadership: -0.1,
      risk: 0.1,
      execution: 0.1,
      creativity: 0.7,
      empathy: 0.7,
      control: 0.1,
      security: 0.8,
      wealth: -0.1,
      attachment: 0.6,
    },
  },
  {
    key: 'hiphop',
    name: '嘻哈 / Rap',
    emoji: '🎧',
    artists: ['熱狗 MC HotDog', '周杰倫', 'Kendrick Lamar'],
    soundDesc: '節奏主導、歌詞鮮明、能量強',
    weights: {
      emotion: 0.2,
      logic: 0.4,
      social: 0.5,
      leadership: 0.8,
      risk: 0.6,
      execution: 0.7,
      creativity: 0.6,
      empathy: 0.1,
      control: 0.3,
      security: -0.2,
      wealth: 0.9,
      attachment: 0.1,
    },
  },
  {
    key: 'ballad',
    name: '抒情情歌',
    emoji: '💿',
    artists: ['林俊傑', '張學友', 'Adele'],
    soundDesc: '旋律悠長、情感深沉、共情度高',
    weights: {
      emotion: 0.9,
      logic: -0.1,
      social: 0.2,
      leadership: -0.1,
      risk: -0.2,
      execution: 0.1,
      creativity: 0.3,
      empathy: 0.7,
      control: 0.1,
      security: 0.6,
      wealth: -0.1,
      attachment: 0.9,
    },
  },
  {
    key: 'new_age',
    name: '新世紀 / 冥想',
    emoji: '🌊',
    artists: ['神山純一', 'Brian Eno', '班得瑞'],
    soundDesc: '純器樂、舒緩流動、專注或放鬆用',
    weights: {
      emotion: 0.4,
      logic: 0.3,
      social: -0.4,
      leadership: -0.2,
      risk: -0.3,
      execution: 0.1,
      creativity: 0.5,
      empathy: 0.4,
      control: 0.7,
      security: 0.9,
      wealth: -0.2,
      attachment: 0.1,
    },
  },
];

// NOTE: DIMENSION_KEYS 已在 types.ts 中定義，導入使用

// Normalize raw dot product to 0-100 based on genre's theoretical min/max
function computeGenreAffinity(scores: DimensionScores, genre: GenreDefinition): number {
  let maxPossible = 0;
  let minPossible = 0;
  let raw = 0;

  for (const key of DIMENSION_KEYS) {
    const weight = genre.weights[key];
    const score = scores[key];
    raw += score * weight;
    if (weight >= 0) maxPossible += weight * 100;
    else minPossible += weight * 100;
  }

  const range = maxPossible - minPossible;
  if (range === 0) return 50;
  return Math.max(0, Math.min(100, Math.round(((raw - minPossible) / range) * 100)));
}

function deriveSoundProfile(scores: DimensionScores): SoundProfile {
  // Composite scores, each 0-100
  const tempoRaw = scores.execution * 0.5 + scores.risk * 0.5;
  const intensityRaw = scores.leadership * 0.6 + scores.execution * 0.4;
  const emotionRaw =
    scores.emotion * 0.5 + scores.empathy * 0.3 + scores.attachment * 0.2;
  const structureRaw = scores.logic * 0.6 + scores.control * 0.4;

  return {
    tempo: tempoRaw >= 65 ? '快速' : tempoRaw >= 40 ? '中速' : '慢速',
    intensity: intensityRaw >= 65 ? '強烈' : intensityRaw >= 40 ? '平衡' : '柔和',
    emotionDepth: emotionRaw >= 65 ? '深層' : emotionRaw >= 40 ? '中層' : '輕盈',
    structure: structureRaw >= 65 ? '規律' : structureRaw >= 40 ? '流動' : '自由',
  };
}

function buildListeningSummary(topGenres: GenreMatch[], sound: SoundProfile): string {
  const [first, second] = topGenres;
  return (
    `你的人格模型偏好${sound.emotionDepth}、${sound.tempo}的音樂，` +
    `最高親和力落在「${first.name}」（${first.score} 分），其次是「${second.name}」。` +
    `整體聲音品味傾向${sound.intensity}、${sound.structure}的風格。`
  );
}

// Main entry point — called in personality-engine.ts after scores are finalized
export function computeMusicProfile(scores: DimensionScores): MusicProfile {
  const allGenres: GenreMatch[] = GENRE_DEFINITIONS.map((genre) => ({
    key: genre.key,
    name: genre.name,
    emoji: genre.emoji,
    score: computeGenreAffinity(scores, genre),
    artists: genre.artists,
    soundDesc: genre.soundDesc,
  })).sort((a, b) => b.score - a.score);

  const topGenres = allGenres.slice(0, 3);
  const soundProfile = deriveSoundProfile(scores);
  const listeningSummary = buildListeningSummary(topGenres, soundProfile);

  return { topGenres, allGenres, soundProfile, listeningSummary };
}
