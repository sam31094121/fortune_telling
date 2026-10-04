/**
 * AsuraTemperEngine - 鬼魅阿修羅脾氣系統
 *
 * 職責：
 * 1. 定義三張卡的脾氣特徵
 * 2. 根據 Evidence Level 決定能罵多重
 * 3. 融合人格 DNA + 脾氣等級 → 出現力度
 *
 * 鐵律：
 * 精準度 > 霸氣 > 有梗
 * 沒有證據，阿修羅閉嘴。
 */

export type TimeCardType = 'PAST' | 'PRESENT' | 'FUTURE';
export type EvidenceLevel = 1 | 2 | 3 | 4;

export interface AsuraTemperProfile {
  // 核心脾氣指標 (0-10)
  directness: number; // 直白程度
  dominance: number; // 支配感
  impatience: number; // 不耐煩
  sarcasm: number; // 諷刺/吐槽
  humor: number; // 有梗
  warning: number; // 警告力度
  coldness: number; // 冷淡感
  aggression: number; // 攻擊性（非人身）
  finalStrike: number; // 最後一刀的力度
}

// 三張卡的脾氣定義
export const TEMPER_PROFILES: Record<TimeCardType, AsuraTemperProfile> = {
  PAST: {
    // 冷冷翻舊帳型
    directness: 8,
    dominance: 7,
    impatience: 4,
    sarcasm: 7,
    humor: 6,
    warning: 3,
    coldness: 9, // 最冷的
    aggression: 6,
    finalStrike: 9,
  },

  PRESENT: {
    // 當場罵醒型（最兇）
    directness: 10, // 最直
    dominance: 9,
    impatience: 9, // 最不耐煩
    sarcasm: 8,
    humor: 8,
    warning: 8,
    coldness: 6,
    aggression: 9, // 最有攻擊性
    finalStrike: 10, // 最強力道
  },

  FUTURE: {
    // 提前警告型
    directness: 9,
    dominance: 9,
    impatience: 5,
    sarcasm: 6,
    humor: 7,
    warning: 10, // 最強警告
    coldness: 8,
    aggression: 8,
    finalStrike: 10,
  },
};

// ===== 證據溫度閘門 =====

export interface EvidenceTemperGate {
  evidenceLevel: EvidenceLevel;
  canReproach: boolean; // 可以罵
  canScold: boolean; // 可以吐槽
  canWarn: boolean; // 可以警告
  maxTemperScale: number; // 允許的脾氣上限（0-10）
  allowedTactics: string[]; // 允許的話術類型
}

export const EVIDENCE_TEMPER_GATES: Record<EvidenceLevel, EvidenceTemperGate> = {
  1: {
    // 單一弱訊號
    evidenceLevel: 1,
    canReproach: false,
    canScold: false,
    canWarn: false,
    maxTemperScale: 3,
    allowedTactics: ['REMIND', 'MENTION'],
  },

  2: {
    // 兩個訊號同方向
    evidenceLevel: 2,
    canReproach: true,
    canScold: false,
    canWarn: true,
    maxTemperScale: 5,
    allowedTactics: ['MENTION', 'POINT_OUT', 'GENTLE_WARNING'],
  },

  3: {
    // 多條證據一致
    evidenceLevel: 3,
    canReproach: true,
    canScold: true,
    canWarn: true,
    maxTemperScale: 8,
    allowedTactics: [
      'POINT_OUT',
      'GENTLE_SCOLD',
      'SARCASM',
      'WARNING',
      'PATTERN_CALL_OUT',
    ],
  },

  4: {
    // 完整交叉驗證
    evidenceLevel: 4,
    canReproach: true,
    canScold: true,
    canWarn: true,
    maxTemperScale: 10,
    allowedTactics: [
      'DIRECT_SCOLD',
      'HARSH_WARNING',
      'SARCASM',
      'FINAL_STRIKE',
      'STUBBORN_MODE',
    ],
  },
};

// ===== 脾氣調度函式 =====

export function getTemperProfile(cardType: TimeCardType): AsuraTemperProfile {
  return TEMPER_PROFILES[cardType];
}

export function getTemperGate(level: EvidenceLevel): EvidenceTemperGate {
  return EVIDENCE_TEMPER_GATES[level];
}

/**
 * 根據卡片類型和證據等級，計算該次話術的脾氣上限
 */
export function calculateMaxTemper(
  cardType: TimeCardType,
  evidenceLevel: EvidenceLevel
): number {
  const baseProfile = getTemperProfile(cardType);
  const gate = getTemperGate(evidenceLevel);

  // 脾氣上限 = min(卡片脾氣等級, 證據溫度閘門)
  return Math.min(
    (baseProfile.directness +
      baseProfile.dominance +
      baseProfile.aggression +
      baseProfile.finalStrike) /
      4,
    gate.maxTemperScale
  );
}

/**
 * 檢查該句話是否符合脾氣規範
 */
export function validateTemperSafety(
  cardType: TimeCardType,
  evidenceLevel: EvidenceLevel,
  proposedTactic: string,
  proposedIntensity: number
): {
  allowed: boolean;
  reason?: string;
} {
  const gate = getTemperGate(evidenceLevel);
  const maxTemper = calculateMaxTemper(cardType, evidenceLevel);

  // 檢查 Tactic 是否允許
  if (!gate.allowedTactics.includes(proposedTactic)) {
    return {
      allowed: false,
      reason: `Tactic ${proposedTactic} 不被允許於 Evidence Level ${evidenceLevel}`,
    };
  }

  // 檢查脾氣強度是否超限
  if (proposedIntensity > maxTemper) {
    return {
      allowed: false,
      reason: `脾氣強度 ${proposedIntensity} 超過上限 ${maxTemper} (Evidence Level ${evidenceLevel})`,
    };
  }

  return { allowed: true };
}

// ===== 脾氣話術常用句型 =====

export const TEMPER_PHRASES = {
  // 過去卡常用
  PAST_COLD_START: [
    '我把你以前留下來的東西翻給你看。',
    '你現在這個習慣，不是天生的。',
    '別把以前留下來的傷，當成今天每個人都欠你的證據。',
  ],

  // 現在卡常用
  PRESENT_DIRECT: [
    '先別急著替自己找理由。',
    '你都知道問題在哪了，還一直繞。',
    '這不叫想得比較完整。這叫拖。',
  ],

  PRESENT_KNOWINGLY: [
    '你不是不知道。你知道得很清楚。',
    '你只是每次都想試看看，這次會不會例外。',
  ],

  PRESENT_HARDHEAD: [
    '嘴巴說沒事。行為全部在說有事。',
    '你要騙誰？',
  ],

  // 未來卡常用
  FUTURE_WARNING: [
    '我先把難聽的講在前面。',
    '我先把話放這裡。',
    '我不是跟你說一定會出事。',
  ],

  FUTURE_REMINDER: [
    '我先提醒過了。',
    '後面不要說沒人提醒。',
  ],

  // 通用收尾
  FINAL_COLD: ['你自己看看。', '算了，你心裡明白。'],
  FINAL_DIRECT: [
    '不要硬拗。',
    '這就是真相。',
    '我直接講。',
  ],
  FINAL_WARNING: [
    '這是預告，不是詛咒。',
    '你自己決定要不要踩。',
  ],
};

// ===== 人格融合脾氣 =====

export interface PersonalityTemperMix {
  baseTemper: AsuraTemperProfile;
  personalityStyle: string; // JUMEN_STYLE, QISHA_STYLE 等
  adjustedTemper: AsuraTemperProfile;
}

/**
 * 根據人格 DNA 調整脾氣表現方式
 */
export function mixPersonalityWithTemper(
  baseTemper: AsuraTemperProfile,
  personalityStyle: string
): AsuraTemperProfile {
  const adjusted = { ...baseTemper };

  // 根據人格風格微調脾氣表現
  switch (personalityStyle) {
    case 'JUMEN_STYLE':
      // 反問型、吐槽型
      adjusted.sarcasm = Math.min(10, adjusted.sarcasm + 2);
      adjusted.humor = Math.min(10, adjusted.humor + 1);
      break;

    case 'QISHA_STYLE':
      // 短句、直接、命令感
      adjusted.directness = Math.min(10, adjusted.directness + 1);
      adjusted.impatience = Math.min(10, adjusted.impatience + 1);
      break;

    case 'POJUN_STYLE':
      // 破壞式幽默
      adjusted.humor = Math.min(10, adjusted.humor + 3);
      adjusted.sarcasm = Math.min(10, adjusted.sarcasm + 2);
      break;

    case 'TIANFU_STYLE':
      // 沉穩壓迫，不會爆罵
      adjusted.aggression = Math.max(0, adjusted.aggression - 2);
      adjusted.coldness = Math.min(10, adjusted.coldness + 1);
      break;
  }

  return adjusted;
}
