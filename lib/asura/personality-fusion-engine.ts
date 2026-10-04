/**
 * PersonalityFusionEngine
 *
 * 核心職責：
 * 1. 接收 InternalStarSignal[] (後端傳來的紫微星曜訊號)
 * 2. 融合多顆星的人格特徵
 * 3. 找出 DOMINANT / ACTION / PRESSURE / HIDDEN 四大人格角色
 * 4. 融合成單一的阿修羅人格
 * 5. 不輸出任何原始星曜名稱 ✓
 *
 * 規則（規範 10）：
 * - 主導：找最高權重
 * - 行動：找如何執行
 * - 壓力：找壓力反應
 * - 隱藏：找底層恐懼
 * - 融合：找共同點、衝突點、最終一個人
 */

import { getStarPersonality, StarPersonalityDNA } from './ziwei-personality-registry';

// ===== 資料結構 =====

export interface InternalStarSignal {
  starKey: string;
  strength: number; // 0-100，強弱指標
  role: 'DOMINANT' | 'ACTION' | 'PRESSURE' | 'HIDDEN';
  traits: string[];
  evidenceIds: string[];
}

export interface AsuraPersonalityProfile {
  // 核心人格特徵（不包含星曜名稱）
  archetype: string; // 例：「決策者」「思考者」「守護者」
  coreTraits: string[];
  coreNeed: string; // 這個人最根本需要什麼
  coreFear: string; // 這個人最根本害怕什麼

  // 行為模式（不涉及紫微術語）
  decisionStyle: string; // 怎麼做決定的
  actionStyle: string; // 怎麼執行的
  speechStyle: string; // 怎麼說話的
  stressResponse: string; // 壓力下怎麼反應

  // 人際模式
  relationshipStyle: string;
  conflictStyle: string;

  // 力量與代價
  strength: string[]; // 優勢
  shadow: string[]; // 盲點/陰影
  cost: string; // 這個人格的代價是什麼

  // 幽默與特徵
  humorDNA: string[]; // 梗的根源
  dominantVerb: string; // 核心動詞（拆/護/決/想等）

  // 阿修羅方式
  asuraTone: string; // 怎麼用阿修羅的嘴講這個人
  memePool: string[]; // 可用的梗（已轉換為阿修羅語言）

  // 證據鏈
  evidenceIds: string[];

  // 人格組成（內部記錄，前端不看）
  _internalComposition: {
    dominant: InternalStarSignal | null;
    action: InternalStarSignal | null;
    pressure: InternalStarSignal | null;
    hidden: InternalStarSignal | null;
  };
}

// ===== 融合算法 =====

export function fuseStarPersonalities(
  signals: InternalStarSignal[]
): AsuraPersonalityProfile {
  // 第一步：分類訊號
  const dominant = signals.find(s => s.role === 'DOMINANT') || null;
  const action = signals.find(s => s.role === 'ACTION') || null;
  const pressure = signals.find(s => s.role === 'PRESSURE') || null;
  const hidden = signals.find(s => s.role === 'HIDDEN') || null;

  // 第二步：取得星曜人格DNA（僅內部）
  const dominantDNA: StarPersonalityDNA | null = dominant ? (getStarPersonality(dominant.starKey) ?? null) : null;
  const actionDNA: StarPersonalityDNA | null = action ? (getStarPersonality(action.starKey) ?? null) : null;
  const pressureDNA: StarPersonalityDNA | null = pressure ? (getStarPersonality(pressure.starKey) ?? null) : null;
  const hiddenDNA: StarPersonalityDNA | null = hidden ? (getStarPersonality(hidden.starKey) ?? null) : null;

  // 第三步：融合核心特徵
  const allTraits = [
    ...((dominant?.traits) || []),
    ...((action?.traits) || []),
    ...((pressure?.traits) || []),
    ...((hidden?.traits) || []),
  ];

  const allEvidenceIds = [
    ...((dominant?.evidenceIds) || []),
    ...((action?.evidenceIds) || []),
    ...((pressure?.evidenceIds) || []),
    ...((hidden?.evidenceIds) || []),
  ];

  // 第四步：構建融合人格（沒有星曜名稱）
  const fusedProfile = buildUnifiedAsuraPersonality(
    dominantDNA,
    actionDNA,
    pressureDNA,
    hiddenDNA,
    allTraits,
    allEvidenceIds
  );

  // 第五步：記錄內部組成（只用於後端調試）
  fusedProfile._internalComposition = {
    dominant,
    action,
    pressure,
    hidden,
  };

  return fusedProfile;
}

// ===== 核心融合邏輯 =====

function buildUnifiedAsuraPersonality(
  dominantDNA: StarPersonalityDNA | null,
  actionDNA: StarPersonalityDNA | null,
  pressureDNA: StarPersonalityDNA | null,
  hiddenDNA: StarPersonalityDNA | null,
  allTraits: string[],
  allEvidenceIds: string[]
): AsuraPersonalityProfile {
  // 找出重複出現的特徵（強勢特徵）
  const traitFrequency = new Map<string, number>();
  allTraits.forEach(trait => {
    traitFrequency.set(trait, (traitFrequency.get(trait) || 0) + 1);
  });

  // 排序特徵（出現次數最多的最強）
  const dominantTraits = Array.from(traitFrequency.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([trait]) => trait);

  // 主導人格名稱（轉譯為阿修羅用語，不用星曜名）
  const archetype = generateArchetypeName(dominantDNA, actionDNA, hiddenDNA);

  // 核心動詞（最有代表性的行為模式）
  const dominantVerbs = [
    dominantDNA?.dominantVerb,
    actionDNA?.dominantVerb,
    hiddenDNA?.dominantVerb,
  ]
    .filter(Boolean) as string[];

  // 核心需要與恐懼
  const coreNeeds = [
    dominantDNA?.desire,
    actionDNA?.desire,
  ]
    .filter(Boolean) as string[];

  const coreFears = [
    dominantDNA?.fear,
    hiddenDNA?.fear,
  ]
    .filter(Boolean) as string[];

  // 融合梗（來自所有角色的梗元素）
  const fusedMemes = mergeMemeSeeds(
    dominantDNA?.memeSeeds || [],
    actionDNA?.memeSeeds || [],
    hiddenDNA?.memeSeeds || []
  );

  // 構建最終人格檔案
  return {
    archetype,
    coreTraits: dominantTraits,
    coreNeed: coreNeeds.join('或'),
    coreFear: coreFears.join('與'),

    decisionStyle: dominantDNA?.decisionStyle || '實用主義',
    actionStyle: actionDNA?.decisionStyle || dominantDNA?.decisionStyle || '行動導向',
    speechStyle: generateSpeechStyle(dominantDNA, actionDNA, pressureDNA),
    stressResponse: pressureDNA?.stressResponse || dominantDNA?.stressResponse || '更加沉著',

    relationshipStyle: generateRelationshipStyle(dominantDNA, actionDNA),
    conflictStyle: dominantDNA?.conflictStyle || '直接處理',

    strength: mergeArrays(
      dominantDNA?.strength || [],
      actionDNA?.strength || []
    ),
    shadow: mergeArrays(
      dominantDNA?.shadow || [],
      hiddenDNA?.shadow || []
    ),
    cost: generateCost(dominantDNA, actionDNA, hiddenDNA),

    humorDNA: mergeArrays(
      dominantDNA?.humorDNA || [],
      actionDNA?.humorDNA || []
    ),
    dominantVerb: dominantVerbs.join('/'),

    asuraTone: generateAsuraTone(dominantDNA, actionDNA, pressureDNA),
    memePool: fusedMemes,

    evidenceIds: allEvidenceIds,

    _internalComposition: {
      dominant: null,
      action: null,
      pressure: null,
      hidden: null,
    },
  };
}

// ===== 輔助函式 =====

function generateArchetypeName(
  dominant: StarPersonalityDNA | null,
  action: StarPersonalityDNA | null,
  hidden: StarPersonalityDNA | null
): string {
  // 例：「決策者」「思考者」「守護者」等，基於主導人格

  if (!dominant) return '未定義型';

  const patterns: Record<string, string> = {
    ZIWEI: '掌局者',
    TIANJI: '思考者',
    TAIYANG: '照顧者',
    WUQU: '執行者',
    TIANTONG: '享樂者',
    LIANZHEN: '魅力者',
    TIANFU: '守護者',
    TAIYIN: '觀察者',
    TANLANG: '探險家',
    JUMEN: '質疑者',
    TIANXIANG: '協調者',
    TIANLIANG: '保護者',
    QISHA: '決斷者',
    POJUN: '破局者',
  };

  const baseName = patterns[dominant.starKey] || '領導者';

  // 如果有行動人格，加上行動特色
  if (action) {
    const actionPatterns: Record<string, string> = {
      QISHA: '衝鋒型',
      POJUN: '拆局型',
      WUQU: '執行型',
      TANLANG: '開拓型',
    };
    const actionSuffix = actionPatterns[action.starKey];
    if (actionSuffix) return `${baseName}(${actionSuffix})`;
  }

  return baseName;
}

function generateSpeechStyle(
  dominant: StarPersonalityDNA | null,
  action: StarPersonalityDNA | null,
  pressure: StarPersonalityDNA | null
): string {
  const styles = [
    dominant?.speechStyle,
    action?.speechStyle,
    pressure?.speechStyle,
  ].filter(Boolean) as string[];

  return styles.join(', ');
}

function generateRelationshipStyle(
  dominant: StarPersonalityDNA | null,
  action: StarPersonalityDNA | null
): string {
  const styles = [
    dominant?.socialStyle,
    action?.socialStyle,
  ].filter(Boolean) as string[];

  return styles.length > 0 ? styles.join(' + ') : '社交型';
}

function generateCost(
  dominant: StarPersonalityDNA | null,
  action: StarPersonalityDNA | null,
  hidden: StarPersonalityDNA | null
): string {
  const costs = [
    dominant?.shadow ? `${dominant.shadow.join('/')}的代價` : '',
    action?.shadow ? `${action.shadow.join('/')}的風險` : '',
  ].filter(Boolean);

  return costs.length > 0
    ? costs.join(', ')
    : '人格本身帶來的代價';
}

function generateAsuraTone(
  dominant: StarPersonalityDNA | null,
  action: StarPersonalityDNA | null,
  pressure: StarPersonalityDNA | null
): string {
  const tones = [
    dominant?.asuraTone,
    action?.asuraTone,
  ].filter(Boolean) as string[];

  return tones.length > 0 ? tones.join(' + ') : '直白、有力';
}

function mergeMemeSeeds(
  dominantMemes: string[],
  actionMemes: string[],
  hiddenMemes: string[]
): string[] {
  const merged = new Set<string>();
  [...dominantMemes, ...actionMemes, ...hiddenMemes].forEach(m => merged.add(m));
  return Array.from(merged);
}

function mergeArrays(...arrays: string[][]): string[] {
  return Array.from(new Set(arrays.flat()));
}
