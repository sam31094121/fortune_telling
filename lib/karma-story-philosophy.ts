/**
 * 因果故事哲學引擎
 *
 * 核心理念：
 * - 因果關係本身就是修行
 * - 痛點強度 = 領悟深度
 * - 心不死，道不生：只有放下執念，智慧才能生成
 * - 故事不是療癒，而是「覺醒之刃」
 *
 * 故事的三層修行：
 * 1. 看清執念（認識自己的執著）
 * 2. 經歷痛苦（在因果中觸發）
 * 3. 放下執念（在理解中獲得自由）
 */

export interface KarmaPhilosophyLayer {
  // 第一層：執念識別
  attachment: string; // 這段關係中，你執著於什麼？
  attachmentCost: number; // 這份執著的代價有多大？(0-100)
  attachmentType: 'give' | 'receive' | 'expect' | 'fear'; // 執著的類型

  // 第二層：痛苦觸發
  awakening: string; // 這份痛苦要喚醒你什麼？
  awakeningSharpness: number; // 這個喚醒有多尖銳？(0-100)
  truthRevealed: string; // 在痛苦中，被揭露的真相是什麼？

  // 第三層：放下之路
  letting_go: string; // 要放下什麼才能獲得自由？
  freedom_after_release: string; // 放下後，靈魂會變成什麼樣？
  wisdom_gained: string; // 通過這段因果獲得的大智慧

  // 修行等級
  karmaLevel: 'surface' | 'middle' | 'deep' | 'transcendence'; // 這段因果的修行層級
  transcendenceGate: string; // 超越的門檻——需要承認什麼、放下什麼才能突破
}

/**
 * 執念類型解析
 */
export function analyzeAttachment(
  activePerson: 'A' | 'B' | 'equal',
  personalityConflict: number,
  personalityResonance: number,
  bloodTypeCompatibility: number
): { type: 'give' | 'receive' | 'expect' | 'fear'; intensity: number } {
  // 主動付出的人 — 執著於「改變對方」
  if (activePerson === 'A') {
    return {
      type: 'give',
      intensity: Math.min(100, (100 - bloodTypeCompatibility) + 20),
    };
  }

  if (activePerson === 'B') {
    return {
      type: 'receive',
      intensity: Math.min(100, (100 - personalityResonance) + 20),
    };
  }

  // 衝突高則執著於「被理解」
  if (personalityConflict > 60) {
    return {
      type: 'expect',
      intensity: personalityConflict,
    };
  }

  // 共鳴高則執著於「不失去」
  if (personalityResonance > 80) {
    return {
      type: 'fear',
      intensity: 100 - personalityResonance,
    };
  }

  return { type: 'expect', intensity: 50 };
}

/**
 * 痛點銳度 — 故事要有多尖銳
 */
export function calculateAwakeningSharpness(
  painPointIntensity: number,
  emotionalDepth: number,
  attachmentCost: number
): number {
  // 痛點銳度 = 痛點強度 + 情感深度 + 執著代價
  return Math.min(100, (painPointIntensity * 0.4 + emotionalDepth * 0.3 + attachmentCost * 0.3));
}

/**
 * 修行等級判定
 */
export function determineKarmaLevel(
  painPointIntensity: number,
  personalityConflict: number,
  personalityResonance: number
): 'surface' | 'middle' | 'deep' | 'transcendence' {
  // 超越級 — 既有高衝突又有高共鳴，這是靈魂的終極考驗
  if (personalityConflict > 65 && personalityResonance > 75) {
    return 'transcendence';
  }

  // 深層級 — 痛點強烈，需要真正的放下
  if (painPointIntensity > 75) {
    return 'deep';
  }

  // 中層級 — 需要理解和調整
  if (painPointIntensity > 50) {
    return 'middle';
  }

  // 表層級 — 輕微的學習
  return 'surface';
}

/**
 * 超越的門檻 — 什麼時候才能突破這段因果
 */
export function findTranscendenceGate(
  attachmentType: 'give' | 'receive' | 'expect' | 'fear',
  painPointIntensity: number,
  harshTruth: string
): string {
  switch (attachmentType) {
    case 'give':
      return `承認：你無法改變任何人，你只能改變自己如何去愛。放下改變對方的執念，才能超越這段關係的輪迴`;
    case 'receive':
      return `承認：你無法被完全理解，也無需如此。放下被完全看見的渴望，才能在孤獨中找到自己`;
    case 'expect':
      return `承認：期待本身就是痛苦的根源。放下對完美關係的幻想，關係才能真正開始`;
    case 'fear':
      return `承認：失去是必然的，這不是愛的失敗。放下對永恆的執著，才能在每一刻中完整地愛`;
    default:
      return `承認：${harshTruth.substring(0, 50)}...放下這份執念，才能突破`;
  }
}

/**
 * 放下後的自由 — 人在超越執念後會變成什麼樣
 */
export function describePostLetting_Go(
  attachmentType: 'give' | 'receive' | 'expect' | 'fear'
): string {
  const descriptions = {
    give: `放下改變對方的執念後，你會發現——愛不是改造，而是陪伴。你會變得更溫和，也更堅定。因為你愛的是對方的靈魂，而非改造對方成你想要的樣子`,
    receive: `放下被完全理解的渴望後，你會發現——孤獨不是詛咒，而是自由。你會變得自足，也更有吸引力。因為你不再乞求被看見，而是主動去看見世界`,
    expect: `放下對完美關係的幻想後，你會發現——殘缺才是真實。你會變得真實，也更柔軟。因為你接納了人性的黑暗，也就接納了他人的不完美`,
    fear: `放下對永恆的執著後，你會發現——無常才是永恆。你會變得珍惜每一刻，也更無懼。因為你明白，最大的失去就是不敢去愛`,
  };
  return descriptions[attachmentType];
}

/**
 * 大智慧 — 通過這段因果學到的永恆真理
 */
export function extractWisdom(
  karmaLevel: 'surface' | 'middle' | 'deep' | 'transcendence',
  attachmentType: 'give' | 'receive' | 'expect' | 'fear'
): string {
  if (karmaLevel === 'transcendence') {
    return `心不死，道不生。只有當你放下所有對關係的執念——改造對方、被對方完整理解、對完美的期待、對失去的恐懼——道才能生。那時你不是在愛一個人，而是在愛「愛」本身`;
  }

  if (karmaLevel === 'deep') {
    return `因果循環的終點，就是放下。越是深刻的痛，越是在磨礪你的執念。當執念消散，痛也就消散。這不是逃避痛苦，而是在痛苦中找到了意義`;
  }

  if (karmaLevel === 'middle') {
    return `關係是靈魂的學校。每一次爭執、誤解、失落，都是在教你什麼是真正的愛。當你學會了，這些課題就自動消散`;
  }

  return `所有的相遇都是因果的安排。不必急著理解為什麼，只需要感受那份因緣。當你真正放下時，答案會自己浮現`;
}
