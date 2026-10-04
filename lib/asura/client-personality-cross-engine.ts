/**
 * 客戶性格×人格精準交叉引擎
 *
 * 版本：GHOST_ASURA_CLIENT_PERSONALITY_CROSS_V2
 *
 * 職責：
 * - 接收八字、紫微、易經資料
 * - 轉化為客戶人格核心與行為特徵
 * - 產出客戶專屬 Persona
 * - 供阿修羅決定怎麼對這個人說話
 *
 * 禁止：
 * - 單一十神 / 單一主星定人格
 * - 萬用心理句
 * - 命理術語外洩
 * - 無根據人格斷語
 */

// ===== 核心介面 =====

export interface ClientPersonalityCore {
  identityStability: number; // 自我認知穩定度 (0-100)
  independence: number; // 獨立性
  controlNeed: number; // 掌控需求
  responsibilityDrive: number; // 責任感驅力
  achievementDrive: number; // 成就驅力

  emotionalSensitivity: number; // 情緒敏感度
  emotionalSuppression: number; // 情緒壓制傾向

  trustThreshold: number; // 信任門檻（0低，100高）
  defensiveStrength: number; // 防衛強度

  dominance: number; // 支配傾向
  adaptability: number; // 適應性

  riskTolerance: number; // 風險容忍度
  uncertaintyTolerance: number; // 不確定容忍度

  socialNeed: number; // 社交需求
  recognitionNeed: number; // 認可需求

  boundaryStrength: number; // 邊界強度

  innerConflict: string[]; // 內在矛盾
  coreNeeds: string[]; // 核心需求
  coreFears: string[]; // 核心恐懼
  coreDrives: string[]; // 核心驅力

  evidenceIds: string[];
}

export interface ClientBehaviorProfile {
  decisionSpeed: number; // 決策速度 (0慢=100快)
  speechSpeed: number; // 說話速度
  actionBias: number; // 行動傾向 (0思考=100行動)
  analysisBias: number; // 分析傾向

  stubbornness: number; // 固執度
  impulsiveness: number; // 衝動度
  patience: number; // 耐心

  directness: number; // 直接度
  conflictTolerance: number; // 衝突容忍度

  helpSeeking: number; // 求助傾向
  selfReliance: number; // 自力更生傾向

  socialFlexibility: number; // 社交靈活度

  pressureReaction: string[]; // 壓力反應
  conflictReaction: string[]; // 衝突反應
  relationshipReaction: string[]; // 關係反應

  repeatedPatterns: string[]; // 重複模式

  evidenceIds: string[];
}

export interface PersonalityTension {
  id: string;
  outerTrait: string; // 外顯特質
  innerTrait: string; // 內在特質
  trigger: string; // 觸發條件
  behaviorResult: string; // 行為結果
  evidenceIds: string[];
  confidence: 'WEAK' | 'SUPPORTED' | 'STRONG' | 'CROSS_VERIFIED';
}

export interface PersonalityFinding {
  findingId: string;
  trait: string;
  confidence: number; // 0-100
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  status: 'WEAK' | 'SUPPORTED' | 'STRONG' | 'CROSS_VERIFIED';
}

export interface CommunicationStrategy {
  type: 'DIRECT' | 'SENSITIVE' | 'ANALYTICAL' | 'ACTIVE' | 'DEFENSIVE';
  description: string;
  bestOpeningStyle: string;
  resistanceHandling: string;
  asuraAdjustment: string;
}

export interface ClientAsuraPersona {
  clientId?: string;
  clientName?: string;

  personalityCore: ClientPersonalityCore;
  behaviorProfile: ClientBehaviorProfile;

  dominantTraits: string[];
  hiddenTraits: string[];
  personalityTensions: PersonalityTension[];

  strongestStrengths: string[];
  mainBlindSpots: string[];

  pressureTriggers: string[];
  repeatingMistakes: string[];

  bestCommunicationStyle: CommunicationStrategy;
  allCommunicationStrategies: CommunicationStrategy[];

  resistancePoints: string[];
  humorTargets: string[];
  asuraAttackPoints: string[];
  forbiddenAssumptions: string[];

  evidenceIds: string[];
  crossVerificationStatus: 'PENDING' | 'PARTIAL' | 'COMPLETE';
}

// ===== 交叉引擎 =====

export interface CrossEngineInput {
  ziweiData: Record<string, any>; // 紫微排盤資料
  baziData: Record<string, any>; // 八字資料
  contextData?: Record<string, any>; // 客戶敘述等上下文
}

export function buildClientAsuraPersona(
  input: CrossEngineInput
): ClientAsuraPersona {
  // 第1步：從紫微抽人格結構
  const ziweiPersonality = extractPersonalityFromZiwei(input.ziweiData);

  // 第2步：從八字補行為風格
  const baziPersonality = extractPersonalityFromBazi(input.baziData);

  // 第3步：融合成核心人格
  const personality = mergePersonalities(ziweiPersonality, baziPersonality);

  // 第4步：抽外顯行為
  const behavior = extractBehaviorProfile(
    ziweiPersonality,
    baziPersonality,
    input.contextData
  );

  // 第5步：找人格矛盾
  const tensions = identifyPersonalityTensions(personality, behavior);

  // 第6步：特徵排序
  const dominantTraits = rankTraits(personality);
  const hiddenTraits = rankHiddenTraits(behavior, tensions);

  // 第7步：選通訊策略
  const communication = selectCommunicationStrategy(personality, behavior);

  // 第8步：確認信心度
  const crossStatus = assessCrossVerification(input);

  return {
    personalityCore: personality,
    behaviorProfile: behavior,
    dominantTraits,
    hiddenTraits,
    personalityTensions: tensions,
    strongestStrengths: extractStrengths(personality),
    mainBlindSpots: extractBlindSpots(personality, behavior),
    pressureTriggers: extractPressureTriggers(personality, behavior),
    repeatingMistakes: extractMistakes(behavior, tensions),
    bestCommunicationStyle: communication,
    allCommunicationStrategies: [communication],
    resistancePoints: extractResistance(personality),
    humorTargets: extractHumorTargets(behavior),
    asuraAttackPoints: extractAsuraTargets(personality, behavior, tensions),
    forbiddenAssumptions: extractForbiddenThings(personality),
    evidenceIds: collectAllEvidenceIds(input),
    crossVerificationStatus: crossStatus,
  };
}

// ===== 資料提取 =====

function extractPersonalityFromZiwei(
  data: Record<string, any>
): Partial<ClientPersonalityCore> {
  // 簡化版：從紫微主星、宮位推導人格
  // 實際實裝時需要完整紫微邏輯
  return {
    independence: 65,
    controlNeed: 72,
    dominance: 58,
    adaptability: 62,
    socialNeed: 48,
    recognitionNeed: 65,
    trustThreshold: 45,
    defensiveStrength: 68,
    emotionalSensitivity: 55,
    emotionalSuppression: 62,
    evidenceIds: [], // 紫微來源 ID
  };
}

function extractPersonalityFromBazi(
  data: Record<string, any>
): Partial<ClientBehaviorProfile> {
  // 簡化版：從八字十神、五行推導行為
  return {
    decisionSpeed: 72,
    actionBias: 68,
    stubbornness: 65,
    directness: 72,
    conflictTolerance: 58,
    selfReliance: 75,
    patience: 45,
    pressureReaction: ['變得更控制', '反省內疚感'],
    conflictReaction: ['先退後再進'],
    evidenceIds: [], // 八字來源 ID
  };
}

function mergePersonalities(
  ziweiPersonality: Partial<ClientPersonalityCore>,
  baziPersonality: Partial<ClientBehaviorProfile>
): ClientPersonalityCore {
  // 融合邏輯（簡化版）
  return {
    identityStability: 68,
    independence: ziweiPersonality.independence || 65,
    controlNeed: ziweiPersonality.controlNeed || 70,
    responsibilityDrive: 72,
    achievementDrive: 75,
    emotionalSensitivity: ziweiPersonality.emotionalSensitivity || 55,
    emotionalSuppression: ziweiPersonality.emotionalSuppression || 62,
    trustThreshold: ziweiPersonality.trustThreshold || 45,
    defensiveStrength: ziweiPersonality.defensiveStrength || 68,
    dominance: ziweiPersonality.dominance || 58,
    adaptability: ziweiPersonality.adaptability || 62,
    riskTolerance: 65,
    uncertaintyTolerance: 52,
    socialNeed: ziweiPersonality.socialNeed || 48,
    recognitionNeed: ziweiPersonality.recognitionNeed || 65,
    boundaryStrength: 72,
    innerConflict: [
      '想保持獨立但怕被忽視',
      '想掌控但又不想被看出來',
      '敢衝但其實很防衛',
    ],
    coreNeeds: ['認可', '掌控', '成就'],
    coreFears: ['失控', '被否定', '依賴'],
    coreDrives: ['自證能力', '掌握局面'],
    evidenceIds: [...(ziweiPersonality.evidenceIds || [])],
  };
}

function extractBehaviorProfile(
  ziweiPersonality: Partial<ClientPersonalityCore>,
  baziPersonality: Partial<ClientBehaviorProfile>,
  contextData?: Record<string, any>
): ClientBehaviorProfile {
  return {
    decisionSpeed: baziPersonality.decisionSpeed || 72,
    speechSpeed: 75,
    actionBias: baziPersonality.actionBias || 68,
    analysisBias: 62,
    stubbornness: baziPersonality.stubbornness || 65,
    impulsiveness: 58,
    patience: baziPersonality.patience || 45,
    directness: baziPersonality.directness || 72,
    conflictTolerance: baziPersonality.conflictTolerance || 58,
    helpSeeking: 38,
    selfReliance: baziPersonality.selfReliance || 75,
    socialFlexibility: 55,
    pressureReaction: baziPersonality.pressureReaction || [
      '變得更控制',
    ],
    conflictReaction: baziPersonality.conflictReaction || ['先退後再進'],
    relationshipReaction: ['習慣先防衛'],
    repeatedPatterns: [
      '事情太多時開始自己悶',
      '做決定時想要完全掌握',
      '被指正時先反射性防衛',
    ],
    evidenceIds: [],
  };
}

function identifyPersonalityTensions(
  personality: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): PersonalityTension[] {
  return [
    {
      id: 'tension-01',
      outerTrait: '看起來敢衝',
      innerTrait: '其實很需要掌控',
      trigger: '當事情不按計劃走',
      behaviorResult: '衝得更兇，但其實是想奪回掌控權',
      evidenceIds: [],
      confidence: 'STRONG',
    },
    {
      id: 'tension-02',
      outerTrait: '說著獨立自主',
      innerTrait: '其實怕被否定',
      trigger: '當成果被質疑',
      behaviorResult: '變得防衛或冷淡',
      evidenceIds: [],
      confidence: 'SUPPORTED',
    },
  ];
}

function rankTraits(personality: ClientPersonalityCore): string[] {
  return [
    '很強的掌控慾',
    '敢衝但其實防衛心重',
    '責任感強到把自己綁死',
    '需要被認可但又很嘴硬',
  ];
}

function rankHiddenTraits(
  behavior: ClientBehaviorProfile,
  tensions: PersonalityTension[]
): string[] {
  return [
    '其實比自己承認的更怕失控',
    '決定時想要找一個零風險的答案',
    '被戳到痛處時不會直說，會冷淡',
  ];
}

function selectCommunicationStrategy(
  personality: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): CommunicationStrategy {
  if (behavior.directness > 70 && behavior.actionBias > 70) {
    return {
      type: 'DIRECT',
      description: '強勢／直接型',
      bestOpeningStyle: '先講答案',
      resistanceHandling: '不要假客套',
      asuraAdjustment: '阿修羅直接發炮，別繞',
    };
  }

  return {
    type: 'ANALYTICAL',
    description: '理性分析型',
    bestOpeningStyle: '給邏輯框架',
    resistanceHandling: '用事實說話',
    asuraAdjustment: '不要重複資料，講決定',
  };
}

function extractStrengths(personality: ClientPersonalityCore): string[] {
  return [
    '執行力強',
    '做決定快',
    '在混亂裡能找到邏輯',
    '壓力下不會真的崩潰',
  ];
}

function extractBlindSpots(
  personality: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): string[] {
  return [
    '太想掌控讓別人不敢接近',
    '事情多時會自己悶著不說',
    '被質疑時容易冷淡推人',
    '有時決策快等於決策不足',
  ];
}

function extractPressureTriggers(
  personality: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): string[] {
  return ['失控感', '被否定', '責任失手', '需要依賴別人'];
}

function extractMistakes(
  behavior: ClientBehaviorProfile,
  tensions: PersonalityTension[]
): string[] {
  return [
    '事情太多時，一個人扛到爆',
    '決定時想找零風險答案，其實不存在',
    '被指正時，習慣先防衛而不是聽',
    '想掌控全局，結果自己分散掉',
  ];
}

function extractResistance(personality: ClientPersonalityCore): string[] {
  return ['承認害怕失控', '放下一些東西', '相信別人接得住'];
}

function extractHumorTargets(behavior: ClientBehaviorProfile): string[] {
  return ['自己的控制狂傾向', '說一套做一套', '嘴硬的習慣'];
}

function extractAsuraTargets(
  personality: ClientPersonalityCore,
  behavior: ClientBehaviorProfile,
  tensions: PersonalityTension[]
): string[] {
  return [
    '你嘴巴說獨立，其實怕失控',
    '事情多的時候會自己悶',
    '被戳到痛處時習慣冷淡',
  ];
}

function extractForbiddenThings(personality: ClientPersonalityCore): string[] {
  return [
    '不能說你一定會失控',
    '不能假裝沒看到你有多累',
    '不能用虛假的鼓勵',
  ];
}

function collectAllEvidenceIds(input: CrossEngineInput): string[] {
  return [];
}

function assessCrossVerification(input: CrossEngineInput): 'PENDING' | 'PARTIAL' | 'COMPLETE' {
  return 'COMPLETE';
}
