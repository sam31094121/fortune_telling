/**
 * AsuraToneEngine
 *
 * 核心職責（規範 11）：
 * 口氣不得固定。人格不同，語速/句長/梗都不同。
 *
 * 調整：
 * - speechSpeed: SLOW / MEDIUM / FAST
 * - sentenceLength: SHORT / MEDIUM / MIXED
 * - directness: 0-100（直白程度）
 * - dominance: 0-100（支配性）
 * - sarcasm: 0-100（諷刺）
 * - humor: 0-100（幽默）
 * - mystery: 0-100（神秘）
 * - commandStyle: 0-100（命令感）
 * - questioning: 0-100（問題感）
 * - emotionalDepth: 0-100（情感深度）
 * - endingPower: 0-100（最後一刀的力度）
 */

export interface AsuraToneProfile {
  speechSpeed: 'SLOW' | 'MEDIUM' | 'FAST';
  sentenceLength: 'SHORT' | 'MEDIUM' | 'MIXED';

  directness: number; // 0-100
  dominance: number; // 0-100
  sarcasm: number; // 0-100
  humor: number; // 0-100
  mystery: number; // 0-100
  commandStyle: number; // 0-100
  questioning: number; // 0-100
  emotionalDepth: number; // 0-100
  endingPower: number; // 0-100

  // 語言選擇規則
  wordsToUse: string[]; // 常用詞彙
  wordsToAvoid: string[]; // 禁用詞彙（對該人格不符）
}

// ===== 人格 → 口氣對應表 =====

const TONE_PROFILES: Record<string, Partial<AsuraToneProfile>> = {
  // 掌局者（ZIWEI）
  '掌局者': {
    speechSpeed: 'SLOW',
    sentenceLength: 'MEDIUM',
    directness: 60,
    dominance: 90,
    sarcasm: 20,
    humor: 30,
    mystery: 40,
    commandStyle: 80,
    questioning: 20,
    emotionalDepth: 40,
    endingPower: 70,
    wordsToUse: ['穩', '定', '標準', '尊嚴', '位置'],
    wordsToAvoid: ['急', '卑微', '搖擺'],
  },

  // 思考者（TIANJI）
  '思考者': {
    speechSpeed: 'FAST',
    sentenceLength: 'MIXED',
    directness: 75,
    dominance: 60,
    sarcasm: 70,
    humor: 80,
    mystery: 50,
    commandStyle: 40,
    questioning: 85,
    emotionalDepth: 35,
    endingPower: 60,
    wordsToUse: ['想', '算', '變', '如果', '或者'],
    wordsToAvoid: ['篤定', '不變'],
  },

  // 照顧者（TAIYANG）
  '照顧者': {
    speechSpeed: 'MEDIUM',
    sentenceLength: 'MEDIUM',
    directness: 85,
    dominance: 70,
    sarcasm: 10,
    humor: 70,
    mystery: 10,
    commandStyle: 60,
    questioning: 30,
    emotionalDepth: 80,
    endingPower: 80,
    wordsToUse: ['照', '帶', '扛', '充電', '陪'],
    wordsToAvoid: ['冷硬', '無情'],
  },

  // 執行者（WUQU）
  '執行者': {
    speechSpeed: 'FAST',
    sentenceLength: 'SHORT',
    directness: 95,
    dominance: 85,
    sarcasm: 40,
    humor: 30,
    mystery: 10,
    commandStyle: 90,
    questioning: 20,
    emotionalDepth: 20,
    endingPower: 85,
    wordsToUse: ['做', '算', '結果', '成本', '現實'],
    wordsToAvoid: ['感受', '體驗'],
  },

  // 享樂者（TIANTONG）
  '享樂者': {
    speechSpeed: 'MEDIUM',
    sentenceLength: 'MIXED',
    directness: 50,
    dominance: 40,
    sarcasm: 80,
    humor: 90,
    mystery: 60,
    commandStyle: 20,
    questioning: 60,
    emotionalDepth: 70,
    endingPower: 65,
    wordsToUse: ['舒服', '享受', '值得', '躲', '反差'],
    wordsToAvoid: ['必須', '強制'],
  },

  // 魅力者（LIANZHEN）
  '魅力者': {
    speechSpeed: 'MEDIUM',
    sentenceLength: 'MIXED',
    directness: 70,
    dominance: 80,
    sarcasm: 70,
    humor: 60,
    mystery: 90,
    commandStyle: 70,
    questioning: 50,
    emotionalDepth: 60,
    endingPower: 90,
    wordsToUse: ['漂亮', '試', '界線', '誘惑', '控制'],
    wordsToAvoid: ['呆板', '直白'],
  },

  // 守護者（TIANFU）
  '守護者': {
    speechSpeed: 'SLOW',
    sentenceLength: 'MEDIUM',
    directness: 65,
    dominance: 70,
    sarcasm: 30,
    humor: 40,
    mystery: 70,
    commandStyle: 60,
    questioning: 30,
    emotionalDepth: 50,
    endingPower: 75,
    wordsToUse: ['守', '穩', '存', '底', '準備'],
    wordsToAvoid: ['急進', '輕率'],
  },

  // 觀察者（TAIYIN）
  '觀察者': {
    speechSpeed: 'SLOW',
    sentenceLength: 'MEDIUM',
    directness: 55,
    dominance: 40,
    sarcasm: 50,
    humor: 50,
    mystery: 85,
    commandStyle: 30,
    questioning: 70,
    emotionalDepth: 90,
    endingPower: 70,
    wordsToUse: ['看', '感', '細節', '內', '想三天'],
    wordsToAvoid: ['膚淺', '快速判斷'],
  },

  // 探險家（TANLANG）
  '探險家': {
    speechSpeed: 'FAST',
    sentenceLength: 'SHORT',
    directness: 80,
    dominance: 75,
    sarcasm: 60,
    humor: 85,
    mystery: 40,
    commandStyle: 50,
    questioning: 65,
    emotionalDepth: 40,
    endingPower: 80,
    wordsToUse: ['要', '玩', '試', '拿', '探'],
    wordsToAvoid: ['安分', '滿足'],
  },

  // 質疑者（JUMEN）
  '質疑者': {
    speechSpeed: 'FAST',
    sentenceLength: 'SHORT',
    directness: 95,
    dominance: 75,
    sarcasm: 90,
    humor: 70,
    mystery: 20,
    commandStyle: 50,
    questioning: 100,
    emotionalDepth: 30,
    endingPower: 85,
    wordsToUse: ['查', '問', '拆', '證據', '真假'],
    wordsToAvoid: ['相信', '假設'],
  },

  // 協調者（TIANXIANG）
  '協調者': {
    speechSpeed: 'MEDIUM',
    sentenceLength: 'MEDIUM',
    directness: 65,
    dominance: 55,
    sarcasm: 30,
    humor: 60,
    mystery: 50,
    commandStyle: 50,
    questioning: 55,
    emotionalDepth: 75,
    endingPower: 65,
    wordsToUse: ['衡', '協', '平衡', '形象', '共贏'],
    wordsToAvoid: ['對抗', '絕對'],
  },

  // 保護者（TIANLIANG）
  '保護者': {
    speechSpeed: 'SLOW',
    sentenceLength: 'MEDIUM',
    directness: 80,
    dominance: 75,
    sarcasm: 20,
    humor: 40,
    mystery: 50,
    commandStyle: 70,
    questioning: 40,
    emotionalDepth: 70,
    endingPower: 80,
    wordsToUse: ['護', '判', '看到', '提醒', '撐'],
    wordsToAvoid: ['放任', '無所謂'],
  },

  // 決斷者（QISHA）
  '決斷者': {
    speechSpeed: 'FAST',
    sentenceLength: 'SHORT',
    directness: 100,
    dominance: 95,
    sarcasm: 40,
    humor: 50,
    mystery: 10,
    commandStyle: 95,
    questioning: 15,
    emotionalDepth: 25,
    endingPower: 95,
    wordsToUse: ['決', '衝', '扛', '現在', '走'],
    wordsToAvoid: ['等', '慢', '猶豫'],
  },

  // 破局者（POJUN）
  '破局者': {
    speechSpeed: 'FAST',
    sentenceLength: 'MIXED',
    directness: 85,
    dominance: 80,
    sarcasm: 85,
    humor: 75,
    mystery: 60,
    commandStyle: 70,
    questioning: 60,
    emotionalDepth: 45,
    endingPower: 90,
    wordsToUse: ['拆', '破', '換', '新', '反骨'],
    wordsToAvoid: ['保留', '守成'],
  },
};

// ===== 公開接口 =====

export function generateAsuraToneProfile(
  archetyalName: string
): AsuraToneProfile {
  const baseProfile = TONE_PROFILES[archetyalName] || {};

  return {
    speechSpeed: baseProfile.speechSpeed || 'MEDIUM',
    sentenceLength: baseProfile.sentenceLength || 'MEDIUM',
    directness: baseProfile.directness ?? 60,
    dominance: baseProfile.dominance ?? 60,
    sarcasm: baseProfile.sarcasm ?? 40,
    humor: baseProfile.humor ?? 50,
    mystery: baseProfile.mystery ?? 40,
    commandStyle: baseProfile.commandStyle ?? 50,
    questioning: baseProfile.questioning ?? 40,
    emotionalDepth: baseProfile.emotionalDepth ?? 50,
    endingPower: baseProfile.endingPower ?? 70,
    wordsToUse: baseProfile.wordsToUse || [],
    wordsToAvoid: baseProfile.wordsToAvoid || [],
  };
}

/**
 * 根據人格參數調整句子長度
 * 例：QISHA（決斷者）→ SHORT
 * 例：TIANJI（思考者）→ MIXED（時快時停）
 */
export function adjustSentenceLength(
  profile: AsuraToneProfile
): 'short' | 'medium' | 'long' => {
  if (profile.sentenceLength === 'SHORT') return 'short';
  if (profile.sentenceLength === 'LONG') return 'long';
  return 'medium';
}

/**
 * 根據人格參數調整話語結尾的力度
 * 0 = 溫柔結尾
 * 100 = 一刀斃命結尾
 */
export function getEndingPowerDescription(endingPower: number): string {
  if (endingPower >= 90) return '一刀斃命的結尾';
  if (endingPower >= 75) return '有力的結尾';
  if (endingPower >= 50) return '平穩的結尾';
  return '溫柔的結尾';
}
