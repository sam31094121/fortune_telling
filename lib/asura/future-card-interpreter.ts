/**
 * 未來卡解釋器
 *
 * 任務：「照這個趨勢走下去，後面會怎麼發展？」
 *
 * 公式：
 * FUTURE_EVIDENCE → TREND → AMPLIFICATION
 * → TURNING_POINT → OPPORTUNITY → RISK
 * → CHOICE_BRANCH → COST → ASURA_WARNING → FINAL_STRIKE
 *
 * 語氣：穩、有預判感、有時間感、有選擇感、有警告感
 *
 * 禁止：空泛說「未來會更好」、沒有證據就下必然斷語
 * 必須：讓人感覺「事情還沒走到那裡，但阿修羅已經先看到局勢怎麼變」
 */

import { AsuraPersonalityProfile } from './personality-fusion-engine';
import { generateTemperSpeech, createHookDeduplicator } from './time-cards-temper-speech';
import type { EvidenceLevel } from './asura-temper-engine';

export interface FutureCardInput {
  personality: AsuraPersonalityProfile;
  evidenceIds: string[];
  fortuneLevel: number; // 未來運勢趨勢（預測）
  dominantElement: string; // 後續主導元素
  lifePhaseDescription: string; // 預期人生階段
  evidenceLevel: 1 | 2 | 3 | 4;
  currentTrajectory: string; // 目前軌跡方向
  turningPoints: string[]; // 可能的轉折點
}

export interface FutureCardOutput {
  title: string;
  futureTrend: string; // 趨勢：接下來的方向
  amplification: string; // 放大：力量會怎麼放大
  turningPoint: string; // 轉折：哪裡會出現變化
  opportunity: string; // 機會：如果做對會怎樣
  risk: string; // 風險：如果做錯會怎樣
  choiceBranch: string; // 選擇：兩條路，選一條
  cost: string; // 代價：做對的代價、做錯的代價
  asuraWarning: string; // 警告：真正要注意的事
  finalStrike: string; // 最後一刀：預判到底是什麼
  timeSense: string; // 時間感：大概什麼時候會發生

  evidenceIds: string[];
  evidenceLevel: 1 | 2 | 3 | 4;
}

export function interpretFutureCard(input: FutureCardInput): FutureCardOutput {
  const {
    personality,
    evidenceIds,
    fortuneLevel,
    evidenceLevel,
    dominantElement,
    currentTrajectory,
    turningPoints,
  } = input;

  // 第1步：TREND - 趨勢
  const trend = generateTrend(currentTrajectory, fortuneLevel);

  // 第2步：AMPLIFICATION - 力量放大
  const amplification = generateAmplification(
    personality.coreTraits,
    personality.dominantVerb,
    fortuneLevel
  );

  // 第3步：TURNING_POINT - 轉折
  const turningPoint = generateTurningPoint(turningPoints, personality);

  // 第4步：OPPORTUNITY - 機會
  const opportunity = generateOpportunity(
    personality.strength,
    amplification
  );

  // 第5步：RISK - 風險
  const risk = generateRisk(
    personality.shadow,
    personality.stressResponse,
    fortuneLevel
  );

  // 第6步：CHOICE_BRANCH - 選擇分支
  const choiceBranch = generateChoiceBranch(
    personality.coreFear,
    personality.coreNeed
  );

  // 第7步：COST - 代價
  const cost = generateCost(opportunity, risk);

  // 第8步：ASURA_WARNING - 警告
  const asuraWarning = generateAsuraWarning(
    personality.cost,
    choiceBranch,
    evidenceLevel
  );

  // 第9步：FINAL_STRIKE - 最後一刀
  const finalStrike = generateFinalStrike(
    trend,
    personality.coreFear,
    evidenceLevel
  );

  // 第10步：TIME_SENSE - 時間感
  const timeSense = generateTimeSense(fortuneLevel, turningPoints);

  // ===== 脾氣強化層 =====
  // 警告脾氣：未來卡最強警告（Warning = 10）

  // 只在 Evidence Level >= 2 時加入脾氣
  if (evidenceLevel >= 2) {
    const temperResult = generateTemperSpeech({
      cardType: 'FUTURE',
      evidenceLevel,
      personalityStyle: personality.archetype,
      baseSpeech: asuraWarning,
      pattern: 'NORMAL',
    });

    if (temperResult.validation.allowed) {
      if (evidenceLevel >= 3) {
        (asuraWarning as any) = temperResult.temperized;
      }
    }
  }

  return {
    title: '✨ 未來：預判',
    futureTrend: trend,
    amplification,
    turningPoint,
    opportunity,
    risk,
    choiceBranch,
    cost,
    asuraWarning,
    finalStrike,
    timeSense,
    evidenceIds,
    evidenceLevel,
  };
}

// ===== 輔助生成函式 =====

function generateTrend(
  trajectory: string,
  fortuneLevel: number
): string {
  const fortuneContext = fortuneLevel >= 75
    ? `運勢還在上升，所以短期你會覺得一切都在順你的意。`
    : fortuneLevel >= 55
    ? `運勢在轉折點。接下來可能更好，也可能開始下沉。取決於你的選擇。`
    : `運勢在下行。但下行不一定是壞事，有時候是清醒的開始。`;

  return `按照現在的軌跡走下去，${trajectory}。\n\n${fortuneContext}`;
}

function generateAmplification(
  traits: string[],
  verb: string,
  fortuneLevel: number
): string {
  const traitList = traits.slice(0, 2).join('、') || '某種力量';

  const amplifyEffect = fortuneLevel >= 70
    ? `你會變得更${verb}。這在某些領域是優勢，在另一些地方是陷阱。`
    : `你可能會面臨選擇——繼續加強${verb}，或者開始轉變。`;

  return `你的${traitList}會慢慢放大。\n\n${amplifyEffect}`;
}

function generateTurningPoint(
  points: string[],
  personality: AsuraPersonalityProfile
): string {
  const mainPoint = points[0] || '當新的機會出現';
  const alternativePoint = points[1] || '或者當現在的局面開始動搖';

  return `轉折會在什麼時候出現？\n\n${mainPoint}，或者${alternativePoint}。\n\n一旦轉折開始，你${personality.stressResponse}的習慣會更明顯。那時候的選擇，會決定後面五年的走向。`;
}

function generateOpportunity(
  strengths: string[],
  amplification: string
): string {
  const mainStrength = strengths[0] || '你的力量';

  return `如果你抓住機會：\n\n${mainStrength}會變成護城河。你不只是贏，而是建立起別人追不上的優勢。\n\n這條路上，代價是學會放下一些東西。`;
}

function generateRisk(
  shadows: string[],
  stressResponse: string,
  fortuneLevel: number
): string {
  const mainShadow = shadows[0] || '某個盲點';

  const riskDetail = fortuneLevel >= 70
    ? `因為運勢還好，你不會立刻感覺到。但到了某個節點，${mainShadow}會集中爆發。`
    : `${mainShadow}已經在影響局面。如果不改，它只會越來越大。`;

  return `如果你繼續用老方式：\n\n${riskDetail}\n\n到時候，你會${stressResponse}，然後情況會失控。`;
}

function generateChoiceBranch(
  fear: string,
  need: string
): string {
  return `所以這次，你面對兩條路：\n\n路一：抓著現在的優勢繼續${need}，把自己分散掉。\n\n路二：開始知道什麼值得你進，什麼只是看一眼就夠。停止什麼叫什麼。\n\n沒有第三條路。你很怕${fear}，所以很容易選第一條。但第二條才是贏的走法。`;
}

function generateCost(
  opportunity: string,
  risk: string
): string {
  return `代價不在成功或失敗。代價在選擇本身。\n\n選對了，代價是你要學會放下。\n\n選錯了，代價是幾年後才明白自己在浪費時間。`;
}

function generateAsuraWarning(
  cost: string,
  choiceBranch: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const confidence = evidenceLevel >= 3
    ? `我看得很清楚。這不是臆測。`
    : `這是一個趨勢。`;

  return `${confidence}\n\n門變多不是問題。問題是你想每扇都自己踹。\n\n後面真正要改的，不是更勇敢。你本來就敢。\n\n是開始知道${cost}。`;
}

function generateFinalStrike(
  trend: string,
  fear: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const strikeLevel = evidenceLevel >= 3
    ? `這句話有底氣。`
    : `這是預判。`;

  return `${strikeLevel}\n\n事情還沒走到那裡。但阿修羅已經先看到局勢怎麼變。\n\n你現在最怕${fear}。但你的走法，正好讓那個東西越來越可能發生。\n\n改還來得及。但要快，而且要狠。`;
}

function generateTimeSense(
  fortuneLevel: number,
  points: string[]
): string {
  if (fortuneLevel >= 75) {
    return `時間感：三到六個月內，轉折會開始出現。到時候就知道了。`;
  } else if (fortuneLevel >= 55) {
    return `時間感：變化已經在加速。最近三個月會看到某些訊號。`;
  } else {
    return `時間感：如果要改，現在就是機會。再拖就來不及。`;
  }
}
