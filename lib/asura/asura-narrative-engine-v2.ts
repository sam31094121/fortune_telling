/**
 * AsuraNarrativeEngineV2
 *
 * 18步 FACT→HOOK 公式（規範 12-14）
 *
 * 職責：
 * 1. 純後端運算，前端只顯示（米其林分工）
 * 2. 不輸出任何紫微術語
 * 3. 18步公式確保話術品質與一致性
 * 4. Evidence System (LEVEL_1-4) 決定信心度
 * 5. 過去/現在/未來三段完全獨立內容
 *
 * 後端 → 前端 流：
 * backend計算 → 生成話術 → 前端只照印（無邏輯無運算）
 */

// ===== 資料結構 =====

export type EvidenceLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

export interface NarrativeEvidence {
  level: EvidenceLevel;
  sourceId: string; // 來源編號（後端追蹤，不給前端看）
  description: string; // 給客户的簡潔說明（已轉譯為阿修羅語言）
}

export interface TimeSegmentNarrative {
  period: 'PAST' | 'PRESENT' | 'FUTURE';

  // 第1-9步輸出（對客戶無意義，只用於後端組句）
  _fact: string; // 第1步：事件原文（不展示）
  _evidenceChain: NarrativeEvidence[]; // 第2步：證據鏈（只展示等級與計數）
  _meaning: string; // 第3步：象徵（內部用）
  _emotionCycle: string; // 第4步：情感迴圈（內部用）
  _strength: string; // 第5步：看優勢（內部用）
  _shadow: string; // 第6步：看陰影（內部用）
  _cost: string; // 第7步：說代價（內部用）
  _toneProfile: string; // 第8步：口氣檔案（內部用）

  // 第10-18步：可展示的話術層
  hook: string; // 第10步：開頭勾一句
  opening: string; // 第11步：開場白（過去特用）
  challenge?: string; // 第12步：挑戰（現在特用）
  strength?: string; // 第13步：力量（現在特用）
  action?: string; // 第14步：行動方案（現在特用）
  opportunity?: string; // 第15步：機會（未來特用）
  warning?: string; // 第16步：警告（未來特用）
  trajectory: string; // 第17步：軌跡說法（三段共用）
  finalMessage: string; // 第18步：結語（三段共用）

  // 品質指標（前端可展示，但不決定結果）
  confidenceLevel: number; // 0-100，基於 LEVEL_1-4 加權
  evidenceCount: number; // 引用多少個證據
}

export interface AsuraNarrativeOutput {
  narrativeType: 'FULL_READING' | 'TIME_SEGMENT_ONLY';

  past?: TimeSegmentNarrative;
  present?: TimeSegmentNarrative;
  future?: TimeSegmentNarrative;

  // 跨時段的統一敘事
  summaryTrajectory: string; // 過去→現在→未來的整體軌跡
  summaryFinalMessage: string; // 最後一句話（整體結論）

  // 後端品質控制（前端可看，但不改）
  generatedAt: string; // ISO 時間戳
  narrativeQuality: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'NEEDS_REVIEW';
  asuraTone: string; // 本次使用的口氣檔案
}

// ===== 18步公式實作 =====

export function generateTimeSegmentNarrative(
  period: 'PAST' | 'PRESENT' | 'FUTURE',
  personalityArchetype: string,
  dominantVerbs: string,
  coreTraits: string[],
  evidenceInputs: { level: EvidenceLevel; description: string }[],
  dominantElement?: string,
  fortuneLevel?: number
): TimeSegmentNarrative {
  // Step 1-9: 內部計算（不展示）
  const fact = extractFact(period, coreTraits, dominantElement);
  const evidenceChain = buildEvidenceChain(evidenceInputs);
  const meaning = deriveMeaning(fact, personalityArchetype);
  const emotionCycle = analyzeEmotionCycle(fact, personalityArchetype);
  const strength = identifyStrength(coreTraits, period);
  const shadow = identifyShadow(coreTraits, period);
  const cost = describeCost(strength, shadow);
  const toneProfile = selectToneProfile(personalityArchetype);

  // Step 10-18: 話術層（展示給客戶）
  const hook = generateHook(period, fact, personalityArchetype, dominantVerbs);
  const opening = period === 'PAST' ? generatePastOpening(fact, meaning) : '';
  const challenge = period === 'PRESENT' ? generateChallenge(fact, emotionCycle) : undefined;
  const strengthText = period === 'PRESENT' ? generateStrengthStatement(strength, coreTraits) : undefined;
  const action = period === 'PRESENT' ? generateActionStatement(dominantVerbs, coreTraits) : undefined;
  const opportunity = period === 'FUTURE' ? generateOpportunity(fact, meaning) : undefined;
  const warning = period === 'FUTURE' ? generateWarning(cost, shadow) : undefined;

  const trajectory = generateTrajectory(period, fact, meaning);
  const finalMessage = generateFinalMessage(period, dominantVerbs, coreTraits);

  const confidenceLevel = calculateConfidence(evidenceChain, fortuneLevel);

  return {
    period,
    _fact: fact,
    _evidenceChain: evidenceChain,
    _meaning: meaning,
    _emotionCycle: emotionCycle,
    _strength: strength,
    _shadow: shadow,
    _cost: cost,
    _toneProfile: toneProfile,

    hook,
    opening,
    challenge,
    strength: strengthText,
    action,
    opportunity,
    warning,
    trajectory,
    finalMessage,

    confidenceLevel,
    evidenceCount: evidenceChain.length,
  };
}

// ===== 18步輔助函式 =====

function extractFact(period: string, traits: string[], element?: string): string {
  return `[${period}]人格特徵：${traits.join('/')}，元素：${element || '未知'}`;
}

function buildEvidenceChain(inputs: { level: EvidenceLevel; description: string }[]): NarrativeEvidence[] {
  return inputs.map((input, idx) => ({
    level: input.level,
    sourceId: `EV_${Date.now()}_${idx}`,
    description: input.description,
  }));
}

function deriveMeaning(fact: string, archetype: string): string {
  const meanings: Record<string, string> = {
    '掌局者': '位置與尊嚴的考驗',
    '思考者': '邏輯與變化的遊戲',
    '照顧者': '責任與陪伴的轉折',
    '執行者': '效率與成本的平衡',
    '享樂者': '舒適與冒險的拉扯',
    '魅力者': '吸引與控制的界線',
    '守護者': '穩定與更新的關鍵',
    '觀察者': '感受與理解的深度',
    '探險家': '渴望與現實的落差',
    '質疑者': '真假與證據的較量',
    '協調者': '平衡與立場的考驗',
    '保護者': '判斷與守護的選擇',
    '決斷者': '速度與決定的代價',
    '破局者': '破與立的新秩序',
  };
  return meanings[archetype] || '人生的關鍵轉折';
}

function analyzeEmotionCycle(fact: string, archetype: string): string {
  return `${archetype}型在此情境中會經歷：初衝→反思→決行的情感迴圈`;
}

function identifyStrength(traits: string[], period: string): string {
  if (period === 'PAST') return `來自${traits[0] || '核心特質'}的韌性`;
  if (period === 'PRESENT') return `運用${traits.join('/')}的優勢`;
  return `發揮${traits[0] || '底層力量'}的潛能`;
}

function identifyShadow(traits: string[], period: string): string {
  if (period === 'PAST') return `但也種下了${traits.slice(-1)[0] || '某個代價'}`;
  if (period === 'PRESENT') return `卻帶來${traits[traits.length - 1] || '隱藏的代價'}`;
  return `代價是${traits[traits.length - 1] || '未來的折扣'}`;
}

function describeCost(strength: string, shadow: string): string {
  return `成就 ${strength} 的代價是 ${shadow}`;
}

function selectToneProfile(archetype: string): string {
  return `[${archetype}的口氣調性]`;
}

function generateHook(
  period: string,
  fact: string,
  archetype: string,
  verbs: string
): string {
  const hooks: Record<string, string> = {
    PAST: `你曾經${verbs.split('/')[0]}過，那是你的試煉。`,
    PRESENT: `現在該${verbs.split('/')[0]}的時候了。`,
    FUTURE: `接下來要${verbs.split('/')[0]}什麼，是你的選擇。`,
  };
  return hooks[period] || '人生有轉折。';
}

function generatePastOpening(fact: string, meaning: string): string {
  return `解剖根源：${meaning}——你是怎麼走到這裡的？`;
}

function generateChallenge(fact: string, emotion: string): string {
  return `直白陷阱：${emotion}——別被自己的情緒困住。`;
}

function generateStrengthStatement(strength: string, traits: string[]): string {
  return `但你有${traits.length}樣看不見的力量：${traits.slice(0, 2).join('、')}……`;
}

function generateActionStatement(verbs: string, traits: string[]): string {
  return `現在要做的很簡單：${verbs.split('/')[0]}，再${verbs.split('/')[1] || verbs.split('/')[0]}。`;
}

function generateOpportunity(fact: string, meaning: string): string {
  return `分岔預言：${meaning}——有兩條路擺在你面前。`;
}

function generateWarning(cost: string, shadow: string): string {
  return `但選之前得想清楚：${shadow}——那真的是你要付的代價嗎？`;
}

function generateTrajectory(period: string, fact: string, meaning: string): string {
  const trajectories: Record<string, string> = {
    PAST: `過去教會你${meaning}`,
    PRESENT: `現在讓你面對${meaning}`,
    FUTURE: `未來會因為${meaning}而改變`,
  };
  return trajectories[period] || meaning;
}

function generateFinalMessage(period: string, verbs: string, traits: string[]): string {
  const verb = verbs.split('/')[0];
  if (period === 'PAST') return `根源很清楚了。接下來呢？`;
  if (period === 'PRESENT') return `${verb}還是不${verb}，由你決定。`;
  return `無論選哪一條，你都要${verb}。`;
}

function calculateConfidence(evidenceChain: NarrativeEvidence[], fortuneLevel?: number): number {
  let confidence = 50;

  // 基於證據等級加分
  const levelWeights = { LEVEL_1: 25, LEVEL_2: 18, LEVEL_3: 12, LEVEL_4: 5 };
  evidenceChain.forEach(ev => {
    confidence += (levelWeights[ev.level] || 0);
  });

  // 基於運勢等級調整
  if (fortuneLevel) {
    confidence = Math.max(50, Math.min(100, confidence + (fortuneLevel / 2)));
  }

  return Math.min(100, Math.max(50, confidence));
}

// ===== 公開接口 =====

export function buildFullAsuraNarrative(
  pastData: TimeSegmentNarrative,
  presentData: TimeSegmentNarrative,
  futureData: TimeSegmentNarrative
): AsuraNarrativeOutput {
  return {
    narrativeType: 'FULL_READING',
    past: pastData,
    present: presentData,
    future: futureData,

    summaryTrajectory: `過去的${pastData._meaning} → 現在的${presentData._meaning} → 未來的${futureData._meaning}`,
    summaryFinalMessage: `你的選擇決定你的軌跡。敢作敢當敢說敢知，就沒什麼好怕的。`,

    generatedAt: new Date().toISOString(),
    narrativeQuality: calculateNarrativeQuality(
      pastData.confidenceLevel,
      presentData.confidenceLevel,
      futureData.confidenceLevel
    ),
    asuraTone: '鬼魅阿修羅：直白、有力、永不欺騙',
  };
}

function calculateNarrativeQuality(
  pastConf: number,
  presentConf: number,
  futureConf: number
): 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'NEEDS_REVIEW' {
  const avgConf = (pastConf + presentConf + futureConf) / 3;
  if (avgConf >= 90) return 'EXCELLENT';
  if (avgConf >= 75) return 'GOOD';
  if (avgConf >= 60) return 'ACCEPTABLE';
  return 'NEEDS_REVIEW';
}
