/**
 * 時間卡片統一引擎
 *
 * 職責：
 * 1. 調用三個獨立解釋器
 * 2. 運行去重檢查（相似度 > 0.72 FAIL）
 * 3. 確保三張卡片各自完整且無重複
 * 4. 輸出給前端
 */

import { interpretPastCard, PastCardInput, PastCardOutput } from './past-card-interpreter';
import { interpretPresentCard, PresentCardInput, PresentCardOutput } from './present-card-interpreter';
import { interpretFutureCard, FutureCardInput, FutureCardOutput } from './future-card-interpreter';
import { AsuraPersonalityProfile } from './personality-fusion-engine';

export interface TimeCardsUnifiedInput {
  personality: AsuraPersonalityProfile;

  past: Omit<PastCardInput, 'personality'>;
  present: Omit<PresentCardInput, 'personality'>;
  future: Omit<FutureCardInput, 'personality'>;
}

export interface TimeCardsUnifiedOutput {
  past: PastCardOutput;
  present: PresentCardOutput;
  future: FutureCardOutput;

  deduplicationCheck: {
    pastVsPresentSimilarity: number;
    pastVsFutureSimilarity: number;
    presentVsFutureSimilarity: number;
    passed: boolean;
    failureReason?: string;
  };
}

const DEDUP_THRESHOLD = 0.72;

export function generateTimeCardsUnified(
  input: TimeCardsUnifiedInput
): TimeCardsUnifiedOutput {
  const { personality, past, present, future } = input;

  // 調用三個獨立解釋器
  const pastCard = interpretPastCard({
    ...past,
    personality,
  });

  const presentCard = interpretPresentCard({
    ...present,
    personality,
  });

  const futureCard = interpretFutureCard({
    ...future,
    personality,
  });

  // 運行去重檢查
  const dedup = checkNarrativeDedupliation(pastCard, presentCard, futureCard);

  if (!dedup.passed) {
    throw new Error(`去重檢查失敗: ${dedup.failureReason}`);
  }

  return {
    past: pastCard,
    present: presentCard,
    future: futureCard,
    deduplicationCheck: dedup,
  };
}

// ===== 去重檢查引擎 =====

function checkNarrativeDedupliation(
  pastCard: PastCardOutput,
  presentCard: PresentCardOutput,
  futureCard: FutureCardOutput
): {
  pastVsPresentSimilarity: number;
  pastVsFutureSimilarity: number;
  presentVsFutureSimilarity: number;
  passed: boolean;
  failureReason?: string;
} {
  const pastText = extractNarrativeText(pastCard);
  const presentText = extractNarrativeText(presentCard);
  const futureText = extractNarrativeText(futureCard);

  const pastVsPresent = calculateSemanticSimilarity(pastText, presentText);
  const pastVsFuture = calculateSemanticSimilarity(pastText, futureText);
  const presentVsFuture = calculateSemanticSimilarity(presentText, futureText);

  const maxSimilarity = Math.max(pastVsPresent, pastVsFuture, presentVsFuture);
  const passed = maxSimilarity < DEDUP_THRESHOLD;

  return {
    pastVsPresentSimilarity: pastVsPresent,
    pastVsFutureSimilarity: pastVsFuture,
    presentVsFutureSimilarity: presentVsFuture,
    passed,
    failureReason: passed
      ? undefined
      : `相似度超過閾值 (${(maxSimilarity * 100).toFixed(1)}% > 72%)，需要重新生成`,
  };
}

function extractNarrativeText(
  card: PastCardOutput | PresentCardOutput | FutureCardOutput
): string {
  const texts: string[] = [];

  for (const key in card) {
    const value = (card as any)[key];
    if (typeof value === 'string' && !key.startsWith('_')) {
      texts.push(value);
    }
  }

  return texts.join(' ');
}

function calculateSemanticSimilarity(text1: string, text2: string): number {
  // 簡化版：基於共同詞彙的余弦相似度
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = Array.from(set1).filter(t => set2.has(t));
  const union = new Set([...set1, ...set2]);

  return intersection.length / union.size;
}

function tokenize(text: string): string[] {
  // 簡化版分詞：拆成單個字符 + 一些常見詞
  const words = text.match(/[一-龥]+/g) || [];
  return words.flatMap(word =>
    word.length > 1 ? [word, ...word.split('')] : word.split('')
  );
}
