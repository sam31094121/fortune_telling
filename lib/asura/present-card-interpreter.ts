/**
 * 現在卡解釋器
 *
 * 任務：「我現在到底處在什麼狀態？」
 *
 * 公式：
 * CURRENT_EVIDENCE → CURRENT_STATE → DOMINANT_FORCE
 * → STRENGTH → CURRENT_BLIND_SPOT → IMMEDIATE_RISK
 * → ASURA_DIRECT_HIT → CURRENT_ADVICE → FINAL_STRIKE
 *
 * 語氣：最直、最快、最敢講、有當下感、像當面點醒
 *
 * 禁止：花大篇幅追溯過去、提前把未來全部說完
 */

import { AsuraPersonalityProfile } from './personality-fusion-engine';
import { generateTemperSpeech, createHookDeduplicator } from './time-cards-temper-speech';
import type { EvidenceLevel } from './asura-temper-engine';

export interface PresentCardInput {
  personality: AsuraPersonalityProfile;
  evidenceIds: string[];
  fortuneLevel: number; // 當下運勢
  dominantElement: string; // 當下主導元素
  lifePhaseDescription: string; // 當前生活狀態簡述
  evidenceLevel: 1 | 2 | 3 | 4;
  currentDominantForce: string; // 當下最強的力量是什麼
  currentBlindSpot: string; // 當下看不到的盲點
}

export interface PresentCardOutput {
  title: string;
  currentState: string; // 當下最直接的狀態
  dominantForce: string; // 當下最強的力量
  strength: string; // 優勢分析
  currentBlindSpot: string; // 盲點指控
  immediateRisk: string; // 近期最容易出現的代價
  asuraDirectHit: string; // 當面點醒
  currentAdvice: string; // 現在應該注意的事
  finalStrike: string; // 最後一句——真正的挑戰

  evidenceIds: string[];
  evidenceLevel: 1 | 2 | 3 | 4;
}

export function interpretPresentCard(input: PresentCardInput): PresentCardOutput {
  const {
    personality,
    evidenceIds,
    fortuneLevel,
    evidenceLevel,
    dominantElement,
    currentDominantForce,
    currentBlindSpot,
  } = input;

  // 第1步：CURRENT_STATE - 當下狀態（最直接）
  const currentState = generateCurrentState(fortuneLevel, evidenceLevel);

  // 第2步：DOMINANT_FORCE - 當下最強的力量
  const dominantForce = generateDominantForce(
    currentDominantForce,
    personality.dominantVerb
  );

  // 第3步：STRENGTH - 優勢
  const strength = generateStrength(
    personality.strength,
    personality.coreTraits,
    fortuneLevel
  );

  // 第4步：CURRENT_BLIND_SPOT - 盲點
  const blindSpot = generateBlindSpot(
    currentBlindSpot,
    personality.shadow,
    personality.stressResponse
  );

  // 第5步：IMMEDIATE_RISK - 近期風險
  const immediateRisk = generateImmediateRisk(
    personality.cost,
    blindSpot,
    fortuneLevel
  );

  // 第6步：ASURA_DIRECT_HIT - 當面點醒
  const asuraDirectHit = generateAsuraDirectHit(
    personality.coreTraits,
    blindSpot,
    evidenceLevel
  );

  // 第7步：CURRENT_ADVICE - 當下建議
  const currentAdvice = generateCurrentAdvice(
    personality.dominantVerb,
    immediateRisk
  );

  // 第8步：FINAL_STRIKE - 最後一刀
  const finalStrike = generateFinalStrike(
    personality.coreFear,
    personality.coreNeed,
    evidenceLevel
  );

  // ===== 脾氣強化層 =====
  // 兇脾氣：現在卡最兇（Aggression = 9, Impatience = 9）

  // 只在 Evidence Level >= 2 時加入脾氣
  if (evidenceLevel >= 2) {
    // 判斷是否屬於重複模式 / 明知故犯
    const pattern =
      evidenceLevel >= 3 ? 'REPETITION' : 'NORMAL';

    const temperResult = generateTemperSpeech({
      cardType: 'PRESENT',
      evidenceLevel,
      personalityStyle: personality.archetype,
      baseSpeech: asuraDirectHit,
      pattern,
    });

    if (temperResult.validation.allowed) {
      // 只在高等級證據時替換
      if (evidenceLevel >= 3) {
        (asuraDirectHit as any) = temperResult.temperized;
      }
    }
  }

  return {
    title: '🔥 現在：直擊',
    currentState,
    dominantForce,
    strength,
    currentBlindSpot: blindSpot,
    immediateRisk,
    asuraDirectHit,
    currentAdvice,
    finalStrike,
    evidenceIds,
    evidenceLevel,
  };
}

// ===== 輔助生成函式 =====

function generateCurrentState(
  fortuneLevel: number,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const stateDescription = fortuneLevel >= 75
    ? `你現在感覺幸運，所以掉以輕心。這叫「虛假繁榮」。`
    : fortuneLevel >= 60
    ? `你現在搖擺。感覺有機會也有風險。這種時候最容易做錯決定。`
    : `你現在被逼到角落。至少你清醒了。`;

  const confidence = evidenceLevel >= 3
    ? `我看得很清楚。`
    : `這是現狀。`;

  return `${confidence}\n\n${stateDescription}`;
}

function generateDominantForce(
  force: string,
  verb: string
): string {
  return `你現在最強的力量，就是你一直在${verb}的那個東西——${force}。\n\n短期看起來有效率。長期會成為問題。`;
}

function generateStrength(
  strengths: string[],
  traits: string[],
  fortuneLevel: number
): string {
  const mainStrength = strengths[0] || traits[0] || '某種力量';
  const supportStrength = strengths[1] || '反應快';

  const fortuneContext = fortuneLevel >= 70
    ? `運勢也在幫你，所以你現在看起來無所不能。`
    : `但運勢正搖擺，所以這個優勢其實已經在削弱。`;

  return `${mainStrength}和${supportStrength}——這兩樣現在是你的武器。\n\n${fortuneContext}`;
}

function generateBlindSpot(
  blindSpot: string,
  shadow: string[],
  stressResponse: string
): string {
  const shadowItem = shadow[0] || blindSpot || '某個習慣';

  return `但你看不到的是：${shadowItem}。\n\n當事情開始加速，你會更加${stressResponse}。而你越這樣做，局面就越難控制。`;
}

function generateImmediateRisk(
  cost: string,
  blindSpot: string,
  fortuneLevel: number
): string {
  const riskLevel = fortuneLevel >= 75
    ? `短期看不出問題，但三個月到半年以內，${blindSpot}一定會炸出來。`
    : `近期就會開始感覺到疲憊。`;

  return `${riskLevel}\n\n代價不是失敗。代價是${cost}。`;
}

function generateAsuraDirectHit(
  traits: string[],
  blindSpot: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const traitList = traits.slice(0, 2).join('、');

  const confidence = evidenceLevel >= 3
    ? `我敢直講，因為線很清楚。`
    : `這是一條線。`;

  return `${confidence}\n\n你以為自己${traitList}就夠了。其實，問題不在你敢不敢。問題在你${blindSpot}。\n\n別人還在開會整理問題，你已經開始處理答案。短期贏，長期輸。`;
}

function generateCurrentAdvice(
  verb: string,
  immediateRisk: string
): string {
  return `我不會跟你說「加油」那種廢話。\n\n我只告訴你一件事：現在先讓事情講完，再輪到你${verb}。\n\n你的問題不是不敢動，是動太快。`;
}

function generateFinalStrike(
  fear: string,
  need: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const strikeLevel = evidenceLevel >= 3
    ? `這句話有分量。`
    : `這是一句話。`;

  return `${strikeLevel}\n\n你現在最怕的是${fear}。你最需要的是${need}。\n\n但你用的方式，正好讓你越來越容易失控，越來越難${need}。\n\n現在改，還來得及。但要快。`;
}
