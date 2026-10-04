/**
 * 時間卡片脾氣話術生成器
 *
 * 將三張卡片的話術加入阿修羅的脾氣
 *
 * 只服務：過去、現在、未來
 * 禁止服務：其他卡片
 */

import {
  TimeCardType,
  EvidenceLevel,
  getTemperProfile,
  getTemperGate,
  calculateMaxTemper,
  validateTemperSafety,
  TEMPER_PHRASES,
  mixPersonalityWithTemper,
} from './asura-temper-engine';

export interface TemperSpeechInput {
  cardType: TimeCardType;
  evidenceLevel: EvidenceLevel;
  personalityStyle: string; // JUMEN_STYLE 等
  baseSpeech: string; // 原始話術
  pattern?: 'KNOWN_VIOLATION' | 'REPETITION' | 'STUBBORNNESS' | 'NORMAL';
}

export interface TemperSpeechOutput {
  originalSpeech: string;
  temperized: string;
  appliedTactics: string[];
  temperIntensity: number;
  validation: {
    allowed: boolean;
    reason?: string;
  };
}

export function generateTemperSpeech(
  input: TemperSpeechInput
): TemperSpeechOutput {
  const {
    cardType,
    evidenceLevel,
    personalityStyle,
    baseSpeech,
    pattern = 'NORMAL',
  } = input;

  const temper = getTemperProfile(cardType);
  const gate = getTemperGate(evidenceLevel);
  const maxTemper = calculateMaxTemper(cardType, evidenceLevel);

  // 根據卡片類型選擇話術樣板
  let tactics = selectTactics(cardType, pattern, gate.allowedTactics);
  let intensifiedSpeech = intensifySpeech(
    baseSpeech,
    tactics,
    temper,
    personalityStyle
  );

  // 驗證安全性
  const avgIntensity = tactics.length > 0 ? maxTemper : 0;
  const validation = validateTemperSafety(
    cardType,
    evidenceLevel,
    tactics[0] || 'REMIND',
    avgIntensity
  );

  // 如果不符合規範，降低強度
  if (!validation.allowed) {
    tactics = tactics.slice(0, Math.max(1, Math.ceil(tactics.length / 2)));
    intensifiedSpeech = baseSpeech; // 回退到原始話術
  }

  return {
    originalSpeech: baseSpeech,
    temperized: intensifiedSpeech,
    appliedTactics: tactics,
    temperIntensity: validation.allowed ? avgIntensity : avgIntensity / 2,
    validation,
  };
}

// ===== 選擇話術 =====

function selectTactics(
  cardType: TimeCardType,
  pattern: string,
  allowedTactics: string[]
): string[] {
  const tactics: string[] = [];

  if (cardType === 'PAST') {
    tactics.push('POINT_OUT');
    if (allowedTactics.includes('GENTLE_SCOLD')) {
      tactics.push('GENTLE_SCOLD');
    }
    tactics.push('SARCASM');
  } else if (cardType === 'PRESENT') {
    if (pattern === 'KNOWN_VIOLATION') {
      if (allowedTactics.includes('DIRECT_SCOLD')) {
        tactics.push('DIRECT_SCOLD');
      }
    } else if (pattern === 'REPETITION') {
      if (allowedTactics.includes('PATTERN_CALL_OUT')) {
        tactics.push('PATTERN_CALL_OUT');
      }
    } else if (pattern === 'STUBBORNNESS') {
      if (allowedTactics.includes('STUBBORN_MODE')) {
        tactics.push('STUBBORN_MODE');
      }
    }
    if (!tactics.length) {
      tactics.push('POINT_OUT');
    }
    tactics.push('SARCASM');
  } else if (cardType === 'FUTURE') {
    if (allowedTactics.includes('HARSH_WARNING')) {
      tactics.push('HARSH_WARNING');
    } else {
      tactics.push('WARNING');
    }
    tactics.push('SARCASM');
  }

  return tactics.filter(t => allowedTactics.includes(t));
}

// ===== 話術強化 =====

function intensifySpeech(
  baseSpeech: string,
  tactics: string[],
  temper: any,
  personalityStyle: string
): string {
  if (!tactics.length) return baseSpeech;

  let result = baseSpeech;

  // 根據 Tactic 修飾
  if (tactics.includes('DIRECT_SCOLD')) {
    result = addDirectness(result);
  }
  if (tactics.includes('SARCASM')) {
    result = addSarcasm(result, personalityStyle);
  }
  if (tactics.includes('PATTERN_CALL_OUT')) {
    result = addPatternCall(result);
  }
  if (tactics.includes('STUBBORN_MODE')) {
    result = addStubbornWarning(result);
  }
  if (tactics.includes('HARSH_WARNING')) {
    result = addHarshWarning(result);
  }

  return result;
}

// ===== 各種修飾方式 =====

function addDirectness(text: string): string {
  // 移除軟化詞
  let result = text
    .replace(/可能|或許|也許|似乎|好像|大概/g, '')
    .replace(/我想|我覺得|據說/g, '');

  // 加上直白開場
  if (!result.startsWith('先別')) {
    result = `先講清楚：${result}`;
  }

  return result;
}

function addSarcasm(text: string, personalityStyle: string): string {
  if (personalityStyle === 'JUMEN_STYLE') {
    return `${text}\n\n（事情都還沒確認完，你是在急什麼？）`;
  } else if (personalityStyle === 'POJUN_STYLE') {
    return `${text}\n\n（要改可以，不是叫你連地基一起炸掉。）`;
  }

  return `${text}`;
}

function addPatternCall(text: string): string {
  return `${text}\n\n同一種反應已經開始重複出現。這不是巧合。`;
}

function addStubbornWarning(text: string): string {
  return `${text}\n\n路我指出來了。你要不要走是你的事。但不要走回原路以後，再問為什麼風景一模一樣。`;
}

function addHarshWarning(text: string): string {
  return `${text}\n\n我先把話放這裡。你自己決定要不要踩。`;
}

// ===== 梗去重 =====

export interface HookDeduplicator {
  pastHooks: Set<string>;
  presentHooks: Set<string>;
  futureHooks: Set<string>;
}

export function createHookDeduplicator(): HookDeduplicator {
  return {
    pastHooks: new Set(),
    presentHooks: new Set(),
    futureHooks: new Set(),
  };
}

export function addHook(
  dedup: HookDeduplicator,
  cardType: TimeCardType,
  hook: string
): boolean {
  const hookSet =
    cardType === 'PAST'
      ? dedup.pastHooks
      : cardType === 'PRESENT'
        ? dedup.presentHooks
        : dedup.futureHooks;

  // 簡化梗以避免部分重複
  const simplified = hook.replace(/[，。；、]/g, '').substring(0, 20);

  if (hookSet.has(simplified)) {
    return false; // 梗已經用過
  }

  hookSet.add(simplified);
  return true;
}

// ===== 台灣口語檢查 =====

const NATURAL_PHRASES = [
  '先講在前面',
  '不要硬拗',
  '你自己知道',
  '這句我直接講',
  '別再繞',
  '你要繼續也可以',
  '我先提醒過了',
  '這不叫勇敢',
  '這真的不用裝',
];

const AVOID_PATTERNS = [
  /[一-鿿]{2,}：/g, // 過度文言
  /之乎者也/,
  /故而|是故|昔日/,
  /讓予|授予|賦予/,
];

export function validateLanguageNaturalness(text: string): {
  natural: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (const pattern of AVOID_PATTERNS) {
    if (pattern.test(text)) {
      issues.push('檢測到文言文模式');
      break;
    }
  }

  const hasNatural = NATURAL_PHRASES.some(p => text.includes(p));
  if (!hasNatural && text.length > 50) {
    issues.push('建議加入自然口語');
  }

  return {
    natural: issues.length === 0,
    issues,
  };
}
