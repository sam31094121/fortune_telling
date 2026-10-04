/**
 * 過去卡解釋器
 *
 * 任務：「我是怎麼被塑造成現在這個人的？」
 *
 * 公式：
 * PAST_EVIDENCE → FORMATION_CAUSE → PAST_REACTION
 * → SURVIVAL_PATTERN → PERSONALITY_TRACE → CURRENT_RESIDUE
 * → ASURA_REVEAL → FINAL_STRIKE
 *
 * 語氣：沉、看穿、揭底、有心理穿透感
 */

import { AsuraPersonalityProfile } from './personality-fusion-engine';

export interface PastCardInput {
  personality: AsuraPersonalityProfile;
  evidenceIds: string[];
  fortuneLevel: number; // 過去運勢等級
  dominantElement: string; // 過去主導元素
  lifePhaseDescription: string; // 人生階段簡述
  evidenceLevel: 1 | 2 | 3 | 4; // 證據強度
}

export interface PastCardOutput {
  title: string;
  formationCause: string; // 形成原因：根本上為什麼會變成這樣
  survivalPattern: string; // 生存模式：當時怎麼反應的
  personalityTrace: string; // 性格痕跡：留下什麼印記
  currentResidue: string; // 當下殘留：現在還在發生什麼
  asuraReveal: string; // 阿修羅揭底：講出你自己沒看到的
  finalStrike: string; // 最後一刀：讓人產生「原來如此」的感覺

  evidenceIds: string[];
  evidenceLevel: 1 | 2 | 3 | 4;
}

export function interpretPastCard(input: PastCardInput): PastCardOutput {
  const { personality, evidenceIds, fortuneLevel, evidenceLevel, dominantElement } = input;

  // 第1步：FORMATION_CAUSE - 形成原因
  const formationCause = generateFormationCause(
    personality,
    fortuneLevel,
    dominantElement,
    evidenceLevel
  );

  // 第2步：SURVIVAL_PATTERN - 當時如何反應
  const survivalPattern = generateSurvivalPattern(
    personality,
    fortuneLevel
  );

  // 第3步：PERSONALITY_TRACE - 性格痕跡
  const personalityTrace = generatePersonalityTrace(
    personality.coreTraits,
    personality.shadow,
    personality.dominantVerb
  );

  // 第4步：CURRENT_RESIDUE - 現在殘留
  const currentResidue = generateCurrentResidue(
    personality,
    fortuneLevel
  );

  // 第5步：ASURA_REVEAL - 揭底
  const asuraReveal = generateAsuraReveal(
    personality,
    survivalPattern,
    personalityTrace
  );

  // 第6步：FINAL_STRIKE - 最後一刀
  const finalStrike = generateFinalStrike(
    personality.coreNeed,
    personality.coreFear,
    evidenceLevel
  );

  return {
    title: '📜 過去：根源',
    formationCause,
    survivalPattern,
    personalityTrace,
    currentResidue,
    asuraReveal,
    finalStrike,
    evidenceIds,
    evidenceLevel,
  };
}

// ===== 輔助生成函式 =====

function generateFormationCause(
  personality: AsuraPersonalityProfile,
  fortuneLevel: number,
  element: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const baseInsight = fortuneLevel >= 70
    ? `那時候運還不錯，所以你放鬆警戒。但溫水煮青蛙的故事，你應該聽過。`
    : fortuneLevel >= 50
    ? `那時候你搖擺不定，既想進也想退。這種矛盾，就是後來所有問題的根源。`
    : `那時候你被逼到角落。絕望雖然痛，但至少讓你清醒。`;

  const elementInsight = element === '火'
    ? `${element}元素當時支配你——急進、焦躁、看到機會就衝。`
    : element === '木'
    ? `${element}元素當時支配你——執著、堅持、一旦決定就難轉向。`
    : element === '水'
    ? `${element}元素當時支配你——流動、順應、但也容易迷失方向。`
    : `${element}元素當時支配你的選擇。`;

  const strengthInsight = personality.strength[0]
    ? `你當時的優勢是${personality.strength[0]}，這也是為什麼你敢往前走。`
    : '';

  const evidenceQualifier = evidenceLevel >= 3
    ? `這條線很清楚。`
    : `這是一條線。`;

  return `${baseInsight}\n\n${elementInsight}\n${strengthInsight}\n\n${evidenceQualifier}`;
}

function generateSurvivalPattern(
  personality: AsuraPersonalityProfile,
  fortuneLevel: number
): string {
  const responsePattern = personality.stressResponse || '靠著堅持撐下去';

  const fortuneContext = fortuneLevel >= 70
    ? `好運讓你覺得「這條路選對了」，但其實只是暫時順風。`
    : fortuneLevel >= 50
    ? `起伏讓你搖擺，有時候想放棄，有時候又咬牙撐著。`
    : `窮境讓你無路可退，所以只能硬著頭皮往前。`;

  return `你那時的反應很直接：${responsePattern}。\n\n${fortuneContext}\n\n這個模式，後來就變成了你的條件反射。`;
}

function generatePersonalityTrace(
  traits: string[],
  shadow: string[],
  verb: string
): string {
  const traitList = traits.slice(0, 2).join('、') || '某種特質';
  const shadowList = shadow[0] || '某個盲點';

  return `那時候的你，帶著${traitList}往前衝。\n\n這股力量救了你一次，但也埋下了${shadowList}。\n\n現在，你還在用當時那套${verb}的方式對付今天的問題。`;
}

function generateCurrentResidue(
  personality: AsuraPersonalityProfile,
  fortuneLevel: number
): string {
  const residue = personality.shadow[0] || '某個習慣';

  const manifestation = fortuneLevel >= 70
    ? `因為最近順利，你沒感覺到它。但它在。`
    : `它現在就在影響你的決定。`;

  return `${residue}——這是當時留下來的。\n\n${manifestation}`;
}

function generateAsuraReveal(
  personality: AsuraPersonalityProfile,
  survivalPattern: string,
  trace: string
): string {
  const fear = personality.coreFear || '失控';
  const need = personality.coreNeed || '掌握主導';

  return `你以為${survivalPattern.split('：')[1]?.split('。')[0] || '那是實力'}。\n\n其實，你是在躲${fear}。\n\n你真正需要的，是${need}。而你現在用的方式，正好讓你離那個需要越來越遠。`;
}

function generateFinalStrike(
  need: string,
  fear: string,
  evidenceLevel: 1 | 2 | 3 | 4
): string {
  const confidence = evidenceLevel >= 3
    ? `這句話我敢直講，因為幾條線已經對上了。`
    : `這是一條線，但線很清楚。`;

  return `${confidence}\n\n你現在這個樣子，不是突然變成的。\n\n是你那時候的每一個退縮、每一個妥協、每一個「先穩著再說」，一步步堆起來的。\n\n現在要改，也改得了。但前提是你要看清楚自己為什麼要改。`;
}
