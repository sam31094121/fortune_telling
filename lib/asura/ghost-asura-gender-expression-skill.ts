/**
 * 鬼魅阿修羅 — 客戶性別 × 剛柔人格 × 個人化話術技能引擎
 * ============================================================================
 * 模組標識：GHOST_ASURA_GENDER_EXPRESSION_SKILL_V1
 * 落地檔案：lib/asura/ghost-asura-gender-expression-skill.ts
 * 
 * 核心原則：
 * - 性別 ≠ 人格；偏剛／偏柔 ≠ 性別認同；不得由命盤推斷性別認同。
 * - 嚴禁性別刻板印象（不得因為男性就固定硬、女性就固定柔）。
 * - 資料嚴格分兩層：DeclaredSex（客戶自填）+ ExpressionProfile（後端交叉）。
 * - 服務過去／現在／未來三張卡片，輸出 100% 通過 lintAsuraVoice 與 48 術語過濾。
 * ============================================================================
 */

import { lintAsuraVoice } from '../server/ghost-asura-voice';
import { sanitizeZiweiOutput } from '../ghost-asura-ziwei-engine';
import { ClientPersonalityCore, ClientBehaviorProfile } from './ghost-asura-strategy-classifier';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 01｜核心型別定義 (Profile Types)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DeclaredSex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';

export type ExpressionStyle =
  | 'HARD'                   // 內外皆剛
  | 'SOFT'                   // 內外皆柔
  | 'BALANCED'               // 剛柔平衡
  | 'OUTER_HARD_INNER_SOFT'  // 外剛內柔（外撐鋼板，內藏隔音棉）
  | 'OUTER_SOFT_INNER_HARD'  // 外柔內剛（外棉內骨，底線極硬）
  | 'MIXED';                 // 情境切換型

export interface AsuraGenderExpressionProfile {
  declaredSex: DeclaredSex;
  expressionStyle: ExpressionStyle;

  outerHardness: number;           // 外顯剛硬度 (0-100)
  innerHardness: number;           // 內在剛硬度 (0-100)

  emotionalDirectness: number;     // 情緒直接度 (0-100)
  emotionalSensitivity: number;    // 情緒敏銳感知度 (0-100)

  commandPreference: number;       // 主導與掌控偏向 (0-100)
  confrontationTolerance: number;  // 衝突對撞耐受力 (0-100)

  careNeed: number;                // 被理解與關懷需求 (0-100)
  autonomyNeed: number;            // 獨立自主需求 (0-100)

  prideSensitivity: number;        // 自尊與防衛敏感度 (0-100)
  trustThreshold: number;          // 信任建立門檻 (0-100)

  communicationPreference: string[];
  evidenceIds: string[];
}

export type AsuraAttackVector =
  | 'DIRECT_STRIKE'      // 直截砍：極限短句，不留餘地
  | 'COLD_REVEAL'        // 冷冷講：抽離視角，揭穿盲點
  | 'ACID_JOKE'          // 酸一下：黑色幽默，戳破防線
  | 'SOFT_THEN_KNIFE';   // 先放軟最後補一刀：先點出扛壓，再直刺死穴

export interface AsuraSpeechDirectives {
  directness: number;              // 直率強度 (0-100)
  emotionalDepth: number;          // 情感下探深度 (0-100)
  confrontation: number;           // 衝突碰撞度 (0-100)
  humorStyle: string;              // 幽默梗定位
  attackVector: AsuraAttackVector; // 切入下刀策略
}

export interface CardPersonalizedSpeech {
  period: 'PAST' | 'PRESENT' | 'FUTURE';
  openingStrike: string;           // 開場臨場定位（含姓名注入）
  formationOrBlindSpot: string;    // 過去成因／現在盲點／未來趨勢
  asuraJoke: string;               // 專屬黑色幽默比喻
  finalStrike: string;             // 致命收尾金句
  attackVector: AsuraAttackVector;
  style: ExpressionStyle;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 02｜剛柔表達推算引擎 (Derivation Engine)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function deriveGenderExpressionProfile(
  declaredSex: DeclaredSex,
  core: ClientPersonalityCore,
  behavior: ClientBehaviorProfile,
  evidenceIds: string[] = []
): AsuraGenderExpressionProfile {
  // 1. 計算外在剛硬度 (Outer Hardness)：取決於行動偏向、直接度、主導欲與拍板速度
  const outerRaw =
    behavior.actionBias * 0.30 +
    behavior.directness * 0.30 +
    core.dominance * 0.25 +
    behavior.decisionSpeed * 0.15;
  const outerHardness = Number(Math.min(100, Math.max(0, outerRaw)).toFixed(2));

  // 2. 計算內在剛硬度 (Inner Hardness)：取決於死不認錯度、自主需求、抗壓自恃與控制欲，並扣除求助意願
  const innerRaw =
    behavior.stubbornness * 0.35 +
    core.controlNeed * 0.25 +
    core.defensiveStrength * 0.20 +
    (100 - behavior.helpSeeking) * 0.20;
  const innerHardness = Number(Math.min(100, Math.max(0, innerRaw)).toFixed(2));

  // 3. 次級維度正規化
  const emotionalDirectness = behavior.directness;
  const emotionalSensitivity = core.emotionalSensitivity;
  const commandPreference = Math.round(core.dominance * 0.6 + core.controlNeed * 0.4);
  const confrontationTolerance = behavior.conflictTolerance;
  const careNeed = Math.round(core.socialNeed * 0.5 + (100 - core.emotionalSuppression) * 0.5);
  const autonomyNeed = Math.round(core.independence * 0.6 + (100 - behavior.helpSeeking) * 0.4);
  const prideSensitivity = Math.round(core.defensiveStrength * 0.5 + core.recognitionNeed * 0.5);
  const trustThreshold = core.trustThreshold;

  // 4. 判定 ExpressionStyle（雙軸剛柔矩陣判定）
  let expressionStyle: ExpressionStyle;

  if (outerHardness >= 60 && innerHardness <= 45) {
    expressionStyle = 'OUTER_HARD_INNER_SOFT'; // 外剛內柔
  } else if (outerHardness <= 45 && innerHardness >= 60) {
    expressionStyle = 'OUTER_SOFT_INNER_HARD'; // 外柔內剛
  } else if (outerHardness >= 60 && innerHardness >= 60) {
    expressionStyle = 'HARD';                  // 內外皆剛
  } else if (outerHardness <= 45 && innerHardness <= 45) {
    expressionStyle = 'SOFT';                  // 內外皆柔
  } else if (Math.abs(outerHardness - innerHardness) <= 12 && outerHardness >= 46 && outerHardness <= 59) {
    expressionStyle = 'BALANCED';              // 剛柔平衡
  } else {
    expressionStyle = 'MIXED';                 // 情境切換型
  }

  // 5. 構建溝通偏好標籤
  const communicationPreference: string[] = [];
  if (outerHardness >= 65) communicationPreference.push('拒絕囉嗦');
  if (innerHardness <= 45) communicationPreference.push('防踩痛處');
  if (innerHardness >= 65) communicationPreference.push('直面底線');
  if (emotionalSensitivity >= 70) communicationPreference.push('忌當眾批判');

  return {
    declaredSex,
    expressionStyle,
    outerHardness,
    innerHardness,
    emotionalDirectness,
    emotionalSensitivity,
    commandPreference,
    confrontationTolerance,
    careNeed,
    autonomyNeed,
    prideSensitivity,
    trustThreshold,
    communicationPreference,
    evidenceIds,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 03｜話術策略選擇器 (Strategy Selector)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function selectAsuraCommunicationStyle(input: {
  declaredSex: DeclaredSex;
  profile: AsuraGenderExpressionProfile;
  cardType: 'PAST' | 'PRESENT' | 'FUTURE';
  evidenceStrength?: 1 | 2 | 3 | 4;
}): AsuraSpeechDirectives {
  const { profile, cardType, evidenceStrength = 3 } = input;
  const strengthFactor = evidenceStrength / 4;

  let directness = Math.round(profile.outerHardness * 0.7 + profile.emotionalDirectness * 0.3);
  let emotionalDepth = Math.round(profile.emotionalSensitivity * 0.6 + profile.careNeed * 0.4);
  let confrontation = Math.round(profile.confrontationTolerance * 0.6 + profile.innerHardness * 0.4);

  // 根據卡片週期微調強度
  if (cardType === 'PAST') {
    emotionalDepth = Math.min(100, Math.round(emotionalDepth * 1.15)); // 過去卡重視深層溯源
  } else if (cardType === 'PRESENT') {
    directness = Math.min(100, Math.round(directness * 1.2));          // 現在卡最直最快
    confrontation = Math.min(100, Math.round(confrontation * 1.1));
  } else if (cardType === 'FUTURE') {
    confrontation = Math.max(30, Math.round(confrontation * 0.9));     // 未來卡重預判警告
  }

  // 決定切入下刀策略 (Attack Vector)
  let attackVector: AsuraAttackVector;
  let humorStyle: string;

  switch (profile.expressionStyle) {
    case 'OUTER_HARD_INNER_SOFT':
      attackVector = 'SOFT_THEN_KNIFE';
      humorStyle = '表面是鋼板，裡面其實有隔音棉。';
      break;
    case 'OUTER_SOFT_INNER_HARD':
      attackVector = 'COLD_REVEAL';
      humorStyle = '語氣很柔，立場沒有。';
      break;
    case 'HARD':
      attackVector = 'DIRECT_STRIKE';
      humorStyle = '開車拔煞車，撞牆最響。';
      break;
    case 'SOFT':
      attackVector = 'ACID_JOKE';
      humorStyle = '拿自己去補別人的洞。';
      break;
    case 'BALANCED':
    case 'MIXED':
    default:
      attackVector = 'COLD_REVEAL';
      humorStyle = '切換太快，旁人根本沒跟上。';
      break;
  }

  // 遵循「性別 ≠ 人格」鐵律：力度 100% 由人格剛柔與耐受度決定，性別絕不硬塞偏見加成
  return {
    directness: Math.round(directness * strengthFactor),
    emotionalDepth: Math.round(emotionalDepth * strengthFactor),
    confrontation: Math.round(confrontation * strengthFactor),
    humorStyle,
    attackVector,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 04｜姓名聲律防禦處理 (Name Sanitizer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function sanitizeClientName(name?: string): string {
  if (!name) return '';
  // 移除標點與特殊字元（防問號、驚嘆號等違規符號破壞聲律），截取最多 6 字
  const cleaned = name.replace(/[^\p{L}\p{N}]/gu, '').trim().slice(0, 6);
  return cleaned;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 05｜剛柔六大型態三時態專屬話術庫 (Voice Repository)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PeriodSpeechItem {
  openingTemplate: (name?: string) => string;
  narrative: string;
  asuraJoke: string;
  finalStrike: string;
}

export interface TriplePeriodSpeechPack {
  past: PeriodSpeechItem;
  present: PeriodSpeechItem;
  future: PeriodSpeechItem;
}

export const GENDER_EXPRESSION_VOICE_PACKS: Record<ExpressionStyle, TriplePeriodSpeechPack> = {
  // 1. 外剛內柔（外撐鋼板，內藏隔音棉）
  OUTER_HARD_INNER_SOFT: {
    past: {
      openingTemplate: (name) => (name ? `${name}。這段底細我先掀開。` : '這段底細我先掀開。'),
      narrative: '以前不是什麼都自己扛。幾次需要人時沒人接得住。你學會外面先硬起來。裡面的事自己扛完。',
      asuraJoke: '以前摔怕了之後。乾脆自己先把地基拆掉。',
      finalStrike: '看清形成原因。手裡的重甲，該放就得放。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。這局我直接講。` : '這局我直接講。'),
      narrative: '現在最大問題不是扛不住。是你太會撐。撐到旁邊根本沒人知道。你不講，旁人全瞎猜。',
      asuraJoke: '表面是鋼板。裡面其實有隔音棉。最會的不是不痛。是痛了還裝正常。',
      finalStrike: '你不是沒情緒。你只是藏得比問題深。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。後面的路看準再踩。` : '後面的路看準再踩。'),
      narrative: '後面位置越重。越不能什麼都自己抓。以前這叫可靠。再往後走，這叫過載。',
      asuraJoke: '位置往上走。不代表所有事都要一起背上去。',
      finalStrike: '大局要的是分工。不是一個人當全場肉盾。',
    },
  },

  // 2. 外柔內剛（外棉內骨，底線極硬）
  OUTER_SOFT_INNER_HARD: {
    past: {
      openingTemplate: (name) => (name ? `${name}。有些帳以前結過。` : '有些帳以前結過。'),
      narrative: '有些虧以前吃過。你學會不急著翻臉。表面客氣禮貌。底下地基早已焊死。',
      asuraJoke: '表面雲淡風輕。心裡早把門檻築高。',
      finalStrike: '以前吃虧不願說。習慣用冷臉當盔甲。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。別再裝好商量。` : '別再裝好商量。'),
      narrative: '你看起來很好商量。其實不是。你只是願意聽。聽完改不改是另一回事。踩到底線，你斷得最乾脆。',
      asuraJoke: '外面是棉。裡面有骨架。語氣很柔。立場沒有。',
      finalStrike: '你不是好脾氣。你只是懶得浪費時間。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。後面的門留一扇。` : '後面的門留一扇。'),
      narrative: '立場清楚不是壞事。別把所有關門當保護。留一扇通氣的窗。大局才有活路。',
      asuraJoke: '防禦做得像堡壘。最後連自己也出不來。',
      finalStrike: '站穩自己的陣地。但別把盟友拒之門外。',
    },
  },

  // 3. 內外皆剛（極限短句，不留餘地）
  HARD: {
    past: {
      openingTemplate: (name) => (name ? `${name}。蠻勁是怎麼刻進骨子的。` : '蠻勁是怎麼刻進骨子的。'),
      narrative: '幾次重大轉折。全靠你自己蠻勁硬撞。骨子裡只信手裡的刀。不相信別人能替你善後。',
      asuraJoke: '一路硬撞到底。看到門就想踹開。',
      finalStrike: '蠻勁救過你。但也讓你渾身是傷。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。收起你的脾氣。` : '收起你的脾氣。'),
      narrative: '你不缺膽量。缺的是何時不該出刀。每一場都打，不叫強悍。叫沒在挑戰場。',
      asuraJoke: '開車把煞車拆掉。衝得比誰都快。撞在牆上也是最響的。',
      finalStrike: '想通吃全場。彈藥遲早耗盡。門由著它自己關。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。後面的仗要靠腦子打。` : '後面的仗要靠腦子打。'),
      narrative: '大局要的是分寸。不是誰衝得最猛。刀要落在要害。學會收刀，才能立足。',
      asuraJoke: '不是每一隻蒼蠅都要拔刀去砍。',
      finalStrike: '看準靶心再出鞘。不等被激。',
    },
  },

  // 4. 內外皆柔（禁止雞湯，直戳爛好人內耗）
  SOFT: {
    past: {
      openingTemplate: (name) => (name ? `${name}。退讓不是天生的。` : '退讓不是天生的。'),
      narrative: '習慣先替別人著想。幾次退讓選擇嚥下去。以為退一步能海闊天空。換來的只是底線一再後退。',
      asuraJoke: '寧可自己受內傷。也不在人前起衝突。',
      finalStrike: '退讓換不來尊重。只換來更多要求。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。別再當爛好人。` : '別再當爛好人。'),
      narrative: '每次都先體諒別人。最後漏掉的，就是你自己。善良可以。不要拿自己去補別人的洞。',
      asuraJoke: '心軟得像海綿。吸飽別人的爛攤子。自己沉到水底爬不起來。',
      finalStrike: '善良沒有牙齒。那就是軟弱。把你的刺亮出來。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。後面的陣地自己守。` : '後面的陣地自己守。'),
      narrative: '這一段路要畫出邊界。把自己的陣地守好。誰也別想輕易踩進來。站得穩，別人才懂分寸。',
      asuraJoke: '別把別人的重擔當成自己的功課。',
      finalStrike: '先把自己站穩。再去管別人的事。',
    },
  },

  // 5. 剛柔平衡（精準制衡）
  BALANCED: {
    past: {
      openingTemplate: (name) => (name ? `${name}。分寸不是一天學會的。` : '分寸不是一天學會的。'),
      narrative: '在幾次起伏中摸出分寸。知道何時該退，何時該頂。這套生存法則，護過你很多次。',
      asuraJoke: '看慣了風浪。才學會不隨便表態。',
      finalStrike: '懂得收斂鋒芒。才保全了今日實力。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。你心裡早有算盤。` : '你心裡早有算盤。'),
      narrative: '該硬時硬，該軟時軟。最怕該拍板時又兩頭顧。兩頭都想保，最後兩頭空。',
      asuraJoke: '走在鋼索上算步數。平衡極佳。站在原地也會被風吹下去。',
      finalStrike: '平衡不是原地不動。動中求平衡，才不會失足。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。未來的局要一錘定音。` : '未來的局要一錘定音。'),
      narrative: '後面的路考驗定力。別讓平衡變成拖延藉口。看清主線，一錘定音。其餘枝節隨它去。',
      asuraJoke: '算盤打得再精。不動手也是一場空。',
      finalStrike: '該出手時便出手。大局不等人。',
    },
  },

  // 6. 情境混合型（切換太快，旁人掉隊）
  MIXED: {
    past: {
      openingTemplate: (name) => (name ? `${name}。見招拆招的來歷。` : '見招拆招的來歷。'),
      narrative: '在不同局勢被逼出不同面貌。久了連自己都分不清本色。見招拆招，成了你的習慣。',
      asuraJoke: '環境逼著你變。你變得比環境還快。',
      finalStrike: '多面是你的生存技。也是你的迷宮。',
    },
    present: {
      openingTemplate: (name) => (name ? `${name}。你切換得太快了。` : '你切換得太快了。'),
      narrative: '你不是固定哪一種人。你看場合。麻煩的是切換太快。旁邊的人根本跟不上。',
      asuraJoke: '臉譜換得比翻書還快。自己以為靈活。旁邊的人早就看暈了。',
      finalStrike: '手腕再靈活。心裡要有定數。不然全盤皆空。',
    },
    future: {
      openingTemplate: (name) => (name ? `${name}。後面的局需要定海神針。` : '後面的局需要定海神針。'),
      narrative: '後面的局面需要核心定錨。別讓節奏隨環境亂晃。錨定一處，才能立住陣腳。',
      asuraJoke: '招式換得再多。沒有底盤也是虛胖。',
      finalStrike: '立定腳跟。任由風浪去翻騰。',
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 06｜卡片專屬個人化話術生成器 (Card Speech Generator)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function generatePersonalizedCardSpeech(input: {
  cardType: 'PAST' | 'PRESENT' | 'FUTURE';
  profile: AsuraGenderExpressionProfile;
  clientName?: string;
  evidenceStrength?: 1 | 2 | 3 | 4;
}): CardPersonalizedSpeech {
  const { cardType, profile, clientName, evidenceStrength = 3 } = input;
  const directives = selectAsuraCommunicationStyle({
    declaredSex: profile.declaredSex,
    profile,
    cardType,
    evidenceStrength,
  });

  const safeName = sanitizeClientName(clientName);
  const triplePack = GENDER_EXPRESSION_VOICE_PACKS[profile.expressionStyle];
  const periodKey = cardType.toLowerCase() as 'past' | 'present' | 'future';
  const item = triplePack[periodKey];

  return {
    period: cardType,
    openingStrike: item.openingTemplate(safeName),
    formationOrBlindSpot: item.narrative,
    asuraJoke: item.asuraJoke,
    finalStrike: item.finalStrike,
    attackVector: directives.attackVector,
    style: profile.expressionStyle,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 06｜合規檢驗與聲律 Linter (Linter & Compliance)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function lintGenderExpressionOutput(text: string): string[] {
  const issues: string[] = [];

  // 1. 阿修羅通用聲律檢驗（分句 ≤ 16 字、零驚嘆號、零發問、零認同助詞）
  const voiceErrors = lintAsuraVoice(text);
  issues.push(...voiceErrors);

  // 2. 48 項術語過濾檢驗
  const { leaks } = sanitizeZiweiOutput(text);
  if (leaks.length > 0) {
    issues.push(`命理術語洩漏: ${leaks.join(', ')}`);
  }

  // 3. 性別刻板印象與粗暴標籤檢查
  const forbiddenPatterns = [
    /兄弟，你/i,
    /女生，你/i,
    /男人就該/i,
    /女人就該/i,
    /男子氣概/i,
    /女人本分/i,
    /你屬於外剛內柔型/i, // 禁止念分類
    /你屬於外柔內剛型/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      issues.push(`觸犯性別刻板或直接念分類禁忌: ${pattern}`);
    }
  }

  return issues;
}
