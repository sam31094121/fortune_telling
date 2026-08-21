/**
 * 心理學引擎：OCEAN 五大人格 + 榮格原型識別
 * 將人格矩陣轉化為心理學語言，驅動更深層的音樂敘事
 */

import type { PersonalityMatrix } from './personality-matrix-engine';

// ─── OCEAN 五大人格模型 ──────────────────────────────────────────────
export interface OceanProfile {
  openness: number;        // 開放性（creativity主導）
  conscientiousness: number; // 盡責性（logic + security）
  extraversion: number;    // 外向性（social + leadership）
  agreeableness: number;   // 親和性（attachment + emotion）
  neuroticism: number;     // 神經質/情緒穩定性（emotion - security）
}

export function computeOcean(matrix: PersonalityMatrix): OceanProfile {
  return {
    openness: Math.round((matrix.creativity * 0.6 + matrix.risk * 0.4)),
    conscientiousness: Math.round((matrix.logic * 0.55 + matrix.security * 0.45)),
    extraversion: Math.round((matrix.social * 0.55 + matrix.leadership * 0.45)),
    agreeableness: Math.round((matrix.attachment * 0.55 + matrix.emotion * 0.45)),
    neuroticism: Math.round(
      Math.max(0, Math.min(100, 50 + (matrix.emotion - matrix.security) * 0.5)),
    ),
  };
}

export function getOceanDescription(ocean: OceanProfile): Record<keyof OceanProfile, string> {
  function level(score: number) {
    if (score >= 75) return 'high';
    if (score >= 45) return 'mid';
    return 'low';
  }

  const map: Record<string, Record<string, string>> = {
    openness: {
      high: '高開放性：渴望新體驗，想像力豐富，對藝術與抽象概念敏感',
      mid: '中開放性：在新奇與熟悉之間取得平衡',
      low: '低開放性：偏好熟悉的事物，重視傳統與實際',
    },
    conscientiousness: {
      high: '高盡責性：自律、有條理、目標導向，凡事力求完美',
      mid: '中盡責性：有一定的規律感，但不過度執著',
      low: '低盡責性：自由隨性，不受拘束，活在當下',
    },
    extraversion: {
      high: '高外向性：從人際互動汲取能量，熱愛舞台與社交',
      mid: '中外向性：視情況在獨處與社交間自由切換',
      low: '低外向性：內向，從獨處中恢復能量，偏好深度連結',
    },
    agreeableness: {
      high: '高親和性：富有同理心，樂於助人，重視和諧關係',
      mid: '中親和性：溫和但有自己的立場',
      low: '低親和性：獨立自主，直接表達，不輕易妥協',
    },
    neuroticism: {
      high: '高情緒敏感：感受豐富，容易情緒波動，情感深度驚人',
      mid: '中情緒穩定：能感受到情緒但有一定的調節能力',
      low: '低情緒敏感：情緒穩定，心理韌性強，不易受外界影響',
    },
  };

  return {
    openness: map.openness[level(ocean.openness)],
    conscientiousness: map.conscientiousness[level(ocean.conscientiousness)],
    extraversion: map.extraversion[level(ocean.extraversion)],
    agreeableness: map.agreeableness[level(ocean.agreeableness)],
    neuroticism: map.neuroticism[level(ocean.neuroticism)],
  };
}

// ─── 榮格原型系統 ────────────────────────────────────────────────────
export type JungianArchetypeId =
  | 'hero' | 'sage' | 'creator' | 'lover' | 'explorer'
  | 'caregiver' | 'ruler' | 'magician' | 'innocent' | 'rebel';

export interface JungianArchetype {
  id: JungianArchetypeId;
  zh: string;
  en: string;
  symbol: string;
  description: string;
  shadowSide: string;          // 陰影面（榮格 Shadow）
  coreWound: string;           // 核心傷（深層心理創傷傾向）
  coreGift: string;            // 核心天賦（靈魂最大的禮物）
  lifeLesson: string;          // 此生課題
  shadowIntegration: string;   // 陰影整合提醒（非批評）
  musicPersona: string;
  lyricThemes: string[];
  moodKeywords: string[];
}

export const JUNGIAN_ARCHETYPES: Record<JungianArchetypeId, JungianArchetype> = {
  hero: {
    id: 'hero', zh: '英雄', en: 'The Hero', symbol: '⚔️',
    description: '勇於面對挑戰，突破自我極限，保護身邊珍視之人',
    shadowSide: '過度自我要求，難以承認脆弱',
    coreWound: '害怕懦弱，害怕讓人失望',
    coreGift: '在最黑暗的時刻仍能點燃前行的光',
    lifeLesson: '學會在脆弱中找到真正的勇氣',
    shadowIntegration: '允許自己有時候不需要是英雄，休息也是一種力量',
    musicPersona: '音樂充滿力量感與前進性，旋律在高潮處迸發',
    lyricThemes: ['征服', '使命', '守護', '勝利', '崛起'],
    moodKeywords: ['powerful', 'triumphant', 'driving', 'bold'],
  },
  sage: {
    id: 'sage', zh: '智者', en: 'The Sage', symbol: '🔭',
    description: '永遠追求真理與洞見，以智慧解讀世界的本質',
    shadowSide: '冷漠超然，難以建立情感連結',
    coreWound: '害怕無知，害怕被誤解',
    coreGift: '能看見他人看不到的模式與深層真相',
    lifeLesson: '讓智慧落地，學會以心連結，而非只用頭腦',
    shadowIntegration: '知識不是盔甲，讓感受也有空間存在',
    musicPersona: '音樂沉靜深邃，如夜空般有無限延伸感',
    lyricThemes: ['真理', '洞見', '宇宙', '意識', '解碼'],
    moodKeywords: ['contemplative', 'deep', 'mysterious', 'timeless'],
  },
  creator: {
    id: 'creator', zh: '創造者', en: 'The Creator', symbol: '🎨',
    description: '以創意重塑現實，藝術表達是靈魂最真實的語言',
    shadowSide: '完美主義、創作焦慮、自我批判過重',
    coreWound: '害怕表達出來的不夠好，害怕靈感枯竭',
    coreGift: '能將無形的感受轉化為有形的美，觸動他人心底',
    lifeLesson: '完成比完美重要，不完美也是創作的一部分',
    shadowIntegration: '放下對作品的全能掌控，讓靈感自由流動',
    musicPersona: '音樂突破框架，充滿意想不到的聲音選擇與色彩',
    lyricThemes: ['創造', '蛻變', '表達', '靈感', '無限'],
    moodKeywords: ['imaginative', 'vibrant', 'experimental', 'expressive'],
  },
  lover: {
    id: 'lover', zh: '戀人', en: 'The Lover', symbol: '💜',
    description: '以愛連結一切，深情是生命的核心驅動力',
    shadowSide: '過度依賴，害怕失去，在關係中失去自我',
    coreWound: '害怕不被愛，害怕孤獨',
    coreGift: '能以全然的愛打開他人緊閉的心門',
    lifeLesson: '先學會愛自己，才能給出真正無條件的愛',
    shadowIntegration: '愛不是失去自己，界限是愛最深的形式',
    musicPersona: '音樂充滿感官溫度，每個音符都在述說情感',
    lyricThemes: ['愛', '連結', '渴望', '溫度', '相遇'],
    moodKeywords: ['intimate', 'warm', 'sensual', 'emotional'],
  },
  explorer: {
    id: 'explorer', zh: '探索者', en: 'The Explorer', symbol: '🧭',
    description: '永遠在尋找更廣闊的可能性，自由是靈魂最深的渴望',
    shadowSide: '逃避承諾，難以停留，永遠在尋找下一個地平線',
    coreWound: '害怕被困住，害怕錯過更好的可能',
    coreGift: '能帶著好奇與開放的心，看見別人忽略的美好',
    lifeLesson: '真正的自由不是逃離，是在當下也能找到宇宙',
    shadowIntegration: '學會落地，深根也是一種探索',
    musicPersona: '音樂有強烈的流動性，帶著遠方的氣息與冒險感',
    lyricThemes: ['自由', '遠方', '出走', '發現', '地平線'],
    moodKeywords: ['adventurous', 'free', 'wandering', 'open'],
  },
  caregiver: {
    id: 'caregiver', zh: '照顧者', en: 'The Caregiver', symbol: '🌿',
    description: '以同理心守護他人，溫柔是最強大的力量',
    shadowSide: '過度犧牲自我，難以拒絕，燃燒殆盡',
    coreWound: '害怕自私，害怕讓人失望',
    coreGift: '能在他人最脆弱的時刻給予最溫柔的接納',
    lifeLesson: '照顧自己，才能持續照顧他人',
    shadowIntegration: '說「不」也是一種愛，你的需求同樣值得被看見',
    musicPersona: '音樂如擁抱般溫暖，有強烈的療癒與撫慰感',
    lyricThemes: ['守護', '療癒', '給予', '溫柔', '陪伴'],
    moodKeywords: ['nurturing', 'healing', 'gentle', 'compassionate'],
  },
  ruler: {
    id: 'ruler', zh: '統治者', en: 'The Ruler', symbol: '👑',
    description: '建立秩序與結構，以遠見領導周遭的人與事',
    shadowSide: '控制欲強，難以授權，孤獨於高位',
    coreWound: '害怕混亂，害怕失控',
    coreGift: '能在動盪中創建穩定，讓周圍的人有所依靠',
    lifeLesson: '真正的領導者懂得放手，信任是最高的控制',
    shadowIntegration: '允許不確定性存在，秩序中也有留白的美',
    musicPersona: '音樂宏大且有秩序感，如交響曲般有強烈的架構意識',
    lyricThemes: ['秩序', '版圖', '傳承', '責任', '掌舵'],
    moodKeywords: ['commanding', 'structured', 'grand', 'authoritative'],
  },
  magician: {
    id: 'magician', zh: '魔法師', en: 'The Magician', symbol: '✨',
    description: '轉化與蛻變，以意念改變現實的催化者',
    shadowSide: '沉迷力量，可能流於操控',
    coreWound: '害怕無能為力，害怕改變不了現實',
    coreGift: '能在廢墟中看見黃金，在危機中創造蛻變',
    lifeLesson: '最深的魔法是改變自己，而非改變外在',
    shadowIntegration: '力量是為了服務，不是為了控制',
    musicPersona: '音樂充滿神秘轉折，每次聆聽都有全新發現',
    lyricThemes: ['轉化', '魔法', '蛻變', '秘密', '點金'],
    moodKeywords: ['transformative', 'mysterious', 'visionary', 'catalytic'],
  },
  innocent: {
    id: 'innocent', zh: '純真者', en: 'The Innocent', symbol: '☀️',
    description: '保有初心，以純粹的善意看待世界，相信美好',
    shadowSide: '逃避現實，難以面對陰暗面',
    coreWound: '害怕失去純真，害怕世界的惡意',
    coreGift: '能在複雜的世界中保留一份不被污染的純粹',
    lifeLesson: '看見黑暗，仍選擇光，才是真正的純真',
    shadowIntegration: '擁抱世界的複雜，而不是逃離它',
    musicPersona: '音樂純淨清澈，有一種觸動人心的純真美感',
    lyricThemes: ['純粹', '初心', '善念', '相信', '光'],
    moodKeywords: ['pure', 'hopeful', 'simple', 'wholesome'],
  },
  rebel: {
    id: 'rebel', zh: '反叛者', en: 'The Rebel', symbol: '⚡',
    description: '挑戰既有框架，打破不合理的秩序，活出真實',
    shadowSide: '反抗成癮，連合理的事也要對抗',
    coreWound: '害怕被同化，害怕失去自我',
    coreGift: '能打破阻止集體進化的舊有框架',
    lifeLesson: '不是所有規則都是枷鎖，辨別哪些值得打破',
    shadowIntegration: '革命的力量在於建設，不只是破壞',
    musicPersona: '音樂有強烈的邊緣感與反骨氣質，不按牌理出牌',
    lyricThemes: ['反抗', '打破', '覺醒', '真實', '出走'],
    moodKeywords: ['rebellious', 'raw', 'edgy', 'authentic'],
  },
};

// 根據人格矩陣識別主要原型
interface ArchetypeScore {
  id: JungianArchetypeId;
  score: number;
}

function scoreArchetype(id: JungianArchetypeId, m: PersonalityMatrix): number {
  switch (id) {
    case 'hero':      return (m.leadership * 0.5 + m.risk * 0.5);
    case 'sage':      return (m.logic * 0.55 + m.creativity * 0.45);
    case 'creator':   return (m.creativity * 0.6 + m.emotion * 0.4);
    case 'lover':     return (m.attachment * 0.55 + m.emotion * 0.45);
    case 'explorer':  return (m.risk * 0.55 + m.creativity * 0.3 + m.social * 0.15);
    case 'caregiver': return (m.attachment * 0.5 + m.security * 0.3 + m.emotion * 0.2);
    case 'ruler':     return (m.leadership * 0.5 + m.logic * 0.3 + m.security * 0.2);
    case 'magician':  return (m.creativity * 0.4 + m.logic * 0.3 + m.risk * 0.3);
    case 'innocent':  return (m.security * 0.5 + m.attachment * 0.3 + (100 - m.risk) * 0.2);
    case 'rebel':     return (m.risk * 0.6 + (100 - m.security) * 0.4);
  }
}

export function identifyArchetypes(matrix: PersonalityMatrix): {
  primary: JungianArchetype;
  secondary: JungianArchetype;
  scores: ArchetypeScore[];
} {
  const ids = Object.keys(JUNGIAN_ARCHETYPES) as JungianArchetypeId[];
  const scores: ArchetypeScore[] = ids
    .map(id => ({ id, score: Math.round(scoreArchetype(id, matrix)) }))
    .sort((a, b) => b.score - a.score);

  return {
    primary: JUNGIAN_ARCHETYPES[scores[0].id],
    secondary: JUNGIAN_ARCHETYPES[scores[1].id],
    scores,
  };
}

// OCEAN → BPM 修正（心理學對音樂速度的影響）
export function getOceanBpmAdjust(ocean: OceanProfile): number {
  let adj = 0;
  if (ocean.extraversion > 70) adj += 8;
  if (ocean.extraversion < 40) adj -= 8;
  if (ocean.openness > 75) adj += 5;
  if (ocean.conscientiousness > 70) adj -= 5; // 高盡責性偏好精準、不過快
  if (ocean.neuroticism > 70) adj -= 3;        // 高情緒敏感偏好慢一點的療癒感
  return Math.round(adj);
}

// OCEAN → 音調修正
export function getOceanKeyAdjust(ocean: OceanProfile): 'prefer_major' | 'prefer_minor' | 'neutral' {
  const majorSignal = ocean.extraversion + (100 - ocean.neuroticism);
  const minorSignal = ocean.neuroticism + (100 - ocean.extraversion);
  if (majorSignal - minorSignal > 30) return 'prefer_major';
  if (minorSignal - majorSignal > 30) return 'prefer_minor';
  return 'neutral';
}
