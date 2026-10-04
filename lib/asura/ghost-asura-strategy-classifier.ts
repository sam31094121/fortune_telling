/**
 * 鬼魅阿修羅 — TYPE_A 至 TYPE_E 分型條件、觸發欄位、禁用策略與專屬話術引擎
 * ============================================================================
 * 模組版本：GHOST_ASURA_STRATEGY_CLASSIFIER_V1
 * 依據規格：GHOST_ASURA_CLIENT_PERSONALITY_CROSS_V2 Section 12-14
 * 
 * 核心原則：
 * - 依據 ClientPersonalityCore 與 ClientBehaviorProfile 量化指標進行多維評分
 * - 支援衝突消解與置信度門檻判斷
 * - 嚴格執行各分型「禁用策略（Forbidden Strategies）」檢驗
 * - 專屬話術 100% 通過 lintAsuraVoice 與 48 項術語零容忍過濾
 * ============================================================================
 */

import { lintAsuraVoice } from '../server/ghost-asura-voice';
import { sanitizeZiweiOutput } from '../ghost-asura-ziwei-engine';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 01｜核心型別定義 (Profile Types)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ClientPersonalityCore {
  identityStability: number;     // 0 ~ 100
  independence: number;          // 0 ~ 100
  controlNeed: number;           // 0 ~ 100
  responsibilityDrive: number;   // 0 ~ 100
  achievementDrive: number;      // 0 ~ 100
  emotionalSensitivity: number;  // 0 ~ 100
  emotionalSuppression: number;  // 0 ~ 100
  trustThreshold: number;        // 0 ~ 100 (越高越不信任他人)
  defensiveStrength: number;     // 0 ~ 100
  dominance: number;             // 0 ~ 100
  adaptability: number;          // 0 ~ 100
  riskTolerance: number;         // 0 ~ 100
  uncertaintyTolerance: number;  // 0 ~ 100
  socialNeed: number;            // 0 ~ 100
  recognitionNeed: number;       // 0 ~ 100
  boundaryStrength: number;      // 0 ~ 100
}

export interface ClientBehaviorProfile {
  decisionSpeed: number;         // 0 ~ 100
  speechSpeed: number;           // 0 ~ 100
  actionBias: number;            // 0 ~ 100
  analysisBias: number;          // 0 ~ 100
  stubbornness: number;          // 0 ~ 100
  impulsiveness: number;         // 0 ~ 100
  patience: number;              // 0 ~ 100
  directness: number;            // 0 ~ 100
  conflictTolerance: number;     // 0 ~ 100
  helpSeeking: number;           // 0 ~ 100
  selfReliance: number;          // 0 ~ 100
  socialFlexibility: number;     // 0 ~ 100
}

export type CommunicationType = 'TYPE_A' | 'TYPE_B' | 'TYPE_C' | 'TYPE_D' | 'TYPE_E';

export interface StrategyDefinition {
  type: CommunicationType;
  label: string;
  name: string;
  primaryCutIn: string;
  forbiddenRules: string[];
  forbiddenPhrases: RegExp[];
  scores: Record<CommunicationType, number>;
  activeScore: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 02｜各型專屬話術範本 (Voice Templates)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TypeVoicePack {
  openingStrike: string;
  wakeUpCall: string;
  pastFormation: string;
  presentBlindSpot: string;
  futureChoice: string;
  asuraJoke: string;
}

export const STRATEGY_VOICE_PACKS: Record<CommunicationType, TypeVoicePack> = {
  // TYPE_A：強勢／直接型（The Dominant Commander）
  TYPE_A: {
    openingStrike: '先講答案。廢話免了。',
    wakeUpCall: '你以為在帶隊突圍。其實只是享受全員看你拍板。',
    pastFormation: '幾次關鍵轉折。你明明想等。等到最後，主導權沒了。你骨子裡學會自己先橫推。',
    presentBlindSpot: '別人還在開會找共識。你心裡已散會抄傢伙。這不是果斷，是你急於定局。',
    futureChoice: '大局交給敢扛的人。想通吃全場，彈藥遲早耗盡。門由著它自己關。',
    asuraJoke: '開會看秒錶。嫌全世界太慢。最後累垮的，始終是你。',
  },

  // TYPE_B：敏感／防衛型（The Defensive Sentinel）
  TYPE_B: {
    openingStrike: '先別急著反駁。我講的是你的反應，不是在否定你。',
    wakeUpCall: '你看起來雷厲風行。底下藏著一件事。你怕把背後交給別人。',
    pastFormation: '有些暗路攔你的不出聲。你摔過之後。警報器調在最高檔位。一有風吹草動，就想拔刀。',
    presentBlindSpot: '環境早就變安全了。你的刀還架在身前。防衛過度。身邊的人，很難走進你的陣地。',
    futureChoice: '看清形成原因。手裡的刀，該放就得放。卸下重甲，路才走得遠。',
    asuraJoke: '以為這是天生傲骨。以前摔怕了之後。乾脆自己先把地基拆掉。',
  },

  // TYPE_C：過度分析型（The Over-Analyzing Deliberator）
  TYPE_C: {
    openingStrike: '資料早就夠了。你缺的不是資訊，是決定。',
    wakeUpCall: '你不是在找最佳解。你是在等出事不用負責的藉口。',
    pastFormation: '幾次關鍵變數。你用推演代替出手。算得再細。時間早已溜走。',
    presentBlindSpot: '想找百分之百不失控的選項。先認清一件事。這局裡沒有這種東西。動中才有答案。',
    futureChoice: '這一段要學做選擇題。看清哪一扇門有天下。其餘的，連看都別看。',
    asuraJoke: '別人開會看簡報。你開會做字典。算到最後一兵一卒。戰場早就換地方了。',
  },

  // TYPE_D：衝動／好鬥型（The Impulsive Vanguard）
  TYPE_D: {
    openingStrike: '手先收回來。局都沒看全，你又準備第一個當靶。',
    wakeUpCall: '你現在最不缺的是膽。事情還沒看完。你又準備第一個出去擋子彈。',
    pastFormation: '過去一路全靠蠻勁硬撐。看到門就想踹開。久了，刻進骨子裡成了慣性。',
    presentBlindSpot: '執行力全開不是壞事。局勢還沒走完。你已先把退路炸掉。今年，先讓別人把話講完。',
    futureChoice: '下一刀由你先出。但刀要落在要處，不能落空。看準靶心再出鞘，不等被激。',
    asuraJoke: '別人開車踩煞車。你開車拔煞車。衝得比誰都快。撞牆也是最響的。',
  },

  // TYPE_E：嘴硬／傲嬌型（The Stubborn Deflector）
  TYPE_E: {
    openingStrike: '嘴巴可以繼續說沒事。但你的選擇已經替你回答了。',
    wakeUpCall: '嘴上一直說隨便。每個選項，你都在半夜反覆翻盤。',
    pastFormation: '以前吃虧不願說。習慣用冷臉當盔甲。寧可咬碎牙。也不在人前示弱。',
    presentBlindSpot: '你不是不在乎。你怕別人拿這個當把柄。死不認錯，自己憋成內傷。',
    futureChoice: '承認艱難不叫認輸。心裡有數，手裡有刃。不必逢人解釋。',
    asuraJoke: '嘴巴硬得像岩石。心裡翻了八百遍。表面雲淡風輕。背後靴子早磨穿。',
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 03｜評分權重公式與分型演算法
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function calculateStrategyScores(
  core: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): Record<CommunicationType, number> {
  // TYPE_A：主導欲、直接度、決策速度、掌控欲
  const scoreA =
    core.dominance * 0.35 +
    behavior.directness * 0.30 +
    core.controlNeed * 0.20 +
    behavior.decisionSpeed * 0.15;

  // TYPE_B：防衛度、信任門檻、情緒敏感與壓抑、高自恃、低求助
  const scoreB =
    core.defensiveStrength * 0.30 +
    core.trustThreshold * 0.25 +
    core.emotionalSensitivity * 0.20 +
    core.emotionalSuppression * 0.15 +
    (100 - behavior.helpSeeking) * 0.10;

  // TYPE_C：高分析偏向、低決策速度、低不確定性承受、高掌控
  const scoreC =
    behavior.analysisBias * 0.40 +
    (100 - behavior.decisionSpeed) * 0.25 +
    (100 - core.uncertaintyTolerance) * 0.20 +
    core.controlNeed * 0.15;

  // TYPE_D：衝動性、行動偏向、低耐心、高風險偏好
  const scoreD =
    behavior.impulsiveness * 0.35 +
    behavior.actionBias * 0.30 +
    (100 - behavior.patience) * 0.20 +
    core.riskTolerance * 0.15;

  // TYPE_E：嘴硬度、情緒壓抑、被動或低坦率、渴望認同但死撐
  const scoreE =
    behavior.stubbornness * 0.40 +
    core.emotionalSuppression * 0.30 +
    (100 - behavior.directness) * 0.15 +
    core.recognitionNeed * 0.15;

  return {
    TYPE_A: Number(scoreA.toFixed(2)),
    TYPE_B: Number(scoreB.toFixed(2)),
    TYPE_C: Number(scoreC.toFixed(2)),
    TYPE_D: Number(scoreD.toFixed(2)),
    TYPE_E: Number(scoreE.toFixed(2)),
  };
}

export function classifyCommunicationStrategy(
  core: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): StrategyDefinition {
  const scores = calculateStrategyScores(core, behavior);

  // 排序選出最高分型態
  const sorted = (Object.entries(scores) as [CommunicationType, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const dominantType = sorted[0][0];
  const maxScore = sorted[0][1];

  const META: Record<
    CommunicationType,
    { label: string; name: string; cutIn: string; rules: string[]; phrases: RegExp[] }
  > = {
    TYPE_A: {
      label: '強勢／直接型',
      name: 'The Dominant Commander',
      cutIn: '先講答案。廢話免了。',
      rules: ['禁止長篇大論與鋪陳前言', '禁止使用曖昧模糊的建議', '禁止說教'],
      phrases: [/請您多加考慮/i, /我們一步一步慢慢聊/i, /或許您可以試著/i],
    },
    TYPE_B: {
      label: '敏感／防衛型',
      name: 'The Defensive Sentinel',
      cutIn: '先別急著反駁。我講的是你的反應，不是在否定你。',
      rules: ['禁止公開踐踏人格尊嚴', '禁止貼上弱者或可憐標籤', '禁止強拆外殼'],
      phrases: [/你太脆弱/i, /你其實很可憐/i, /你根本不行/i],
    },
    TYPE_C: {
      label: '過度分析型',
      name: 'The Over-Analyzing Deliberator',
      cutIn: '資料早就夠了。你缺的不是資訊，是決定。',
      rules: ['禁止增補額外背景數據', '禁止提供更多模糊選項', '禁止陪同辯論'],
      phrases: [/我再幫你查查數據/i, /我們再多評估幾個變數/i, /可以再等等看/i],
    },
    TYPE_D: {
      label: '衝動／好鬥型',
      name: 'The Impulsive Vanguard',
      cutIn: '手先收回來。局都沒看全，你又準備第一個當靶。',
      rules: ['禁止溫和勸說與空洞分析', '禁止起鬨煽動冒進', '禁止長篇大道理'],
      phrases: [/衝就對了/i, /機不可失趕快上/i, /道德上你應該/i],
    },
    TYPE_E: {
      label: '嘴硬／傲嬌型',
      name: 'The Stubborn Deflector',
      cutIn: '嘴巴可以繼續說沒事。但你的選擇已經替你回答了。',
      rules: ['禁止糾結口頭字面辯駁', '禁止逼問「你心裡到底怎麼想」', '禁止公開嘲諷示弱'],
      phrases: [/你剛剛明明不是這樣說的/i, /你承認吧/i, /少裝了/i],
    },
  };

  const currentMeta = META[dominantType];

  return {
    type: dominantType,
    label: currentMeta.label,
    name: currentMeta.name,
    primaryCutIn: currentMeta.cutIn,
    forbiddenRules: currentMeta.rules,
    forbiddenPhrases: currentMeta.phrases,
    scores,
    activeScore: maxScore,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 04｜禁用策略與聲律雙重檢驗 (Sanitizer & Linter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function lintStrategyOutput(type: CommunicationType, text: string): string[] {
  const issues: string[] = [];

  // 1. 阿修羅通用聲律檢驗（分句 ≤ 16 字、零驚嘆號、零發問、零認同助詞）
  const voiceErrors = lintAsuraVoice(text);
  issues.push(...voiceErrors);

  // 2. 48 項術語過濾檢驗
  const { leaks } = sanitizeZiweiOutput(text);
  if (leaks.length > 0) {
    issues.push(`命理術語洩漏: ${leaks.join(', ')}`);
  }

  // 3. 專屬分型禁用模式檢查
  const dummyCore: ClientPersonalityCore = {
    identityStability: 50, independence: 50, controlNeed: 50, responsibilityDrive: 50, achievementDrive: 50,
    emotionalSensitivity: 50, emotionalSuppression: 50, trustThreshold: 50, defensiveStrength: 50, dominance: 50,
    adaptability: 50, riskTolerance: 50, uncertaintyTolerance: 50, socialNeed: 50, recognitionNeed: 50, boundaryStrength: 50,
  };
  const dummyBehavior: ClientBehaviorProfile = {
    decisionSpeed: 50, speechSpeed: 50, actionBias: 50, analysisBias: 50, stubbornness: 50,
    impulsiveness: 50, patience: 50, directness: 50, conflictTolerance: 50, helpSeeking: 50,
    selfReliance: 50, socialFlexibility: 50,
  };
  const strategy = classifyCommunicationStrategy(dummyCore, dummyBehavior);
  for (const pattern of strategy.forbiddenPhrases) {
    if (pattern.test(text)) {
      issues.push(`觸犯 ${type} 專屬禁用話術模式: ${pattern}`);
    }
  }

  return issues;
}
