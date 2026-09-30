/**
 * 鬼魅阿修羅完整命名母種 & 映射 Registry
 * ============================================================================
 * 業主定案 2026-09-30：50 項母種 + 9 大語系 → 無限延伸
 *
 * 鐵律：
 * 1. originalName → displayName 永久映射（不重名、不隨機）
 * 2. 50 項只是範本，後端幾項就轉幾項
 * 3. 新神煞自動分類 → 9 語系之一 → 對應詞彙庫
 * 4. AI 只做轉譯，不做命中判定
 * 5. 前後端數量必須一致（completeness guard）
 * ============================================================================
 */

import type { AsuraIntensityLevel } from './asura-narrative-engine';

/* ================================================================
   01｜50 項正式母種（17 項已有 + 33 項新增）
   ================================================================ */

export const GHOST_ASURA_50_SEEDS = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第一組：17 項既有（前期鎖定）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { original: '天德合', asura: '天赦神契', family: 'DIVINE_PROTECTION' },
  { original: '驛馬', asura: '逐界行者', family: 'MOVEMENT' },
  { original: '隔角', asura: '孤界之門', family: 'ISOLATION' },
  { original: '金匱', asura: '玄金寶庫', family: 'TREASURE' },
  { original: '五鬼', asura: '五陰纏影', family: 'SHADOW' },
  { original: '沐浴', asura: '洗魂之境', family: 'TRANSFORMATION' },
  { original: '日破', asura: '裂日之痕', family: 'RUPTURE' },
  { original: '天狗', asura: '噬天之影', family: 'SHADOW' },
  { original: '災煞', asura: '劫境之門', family: 'TRIBULATION' },
  { original: '月破', asura: '碎月之痕', family: 'RUPTURE' },
  { original: '將星', asura: '鎮軍之魂', family: 'POWER' },
  { original: '龍德', asura: '天龍護命', family: 'DIVINE_PROTECTION' },
  { original: '六厄', asura: '六劫之關', family: 'TRIBULATION' },
  { original: '元辰', asura: '幽辰之障', family: 'SHADOW' },
  { original: '羊刃', asura: '血刃之鋒', family: 'BLADE' },
  { original: '桃花', asura: '魅生之印', family: 'CHARM' },
  { original: '外桃花', asura: '界外魅緣', family: 'CHARM' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第二組：33 項新增（2026-09-30 正式列入）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { original: '天乙貴人', asura: '天乙神印', family: 'DIVINE_PROTECTION' },
  { original: '太極貴人', asura: '玄極天印', family: 'DIVINE_PROTECTION' },
  { original: '文昌貴人', asura: '文魂天契', family: 'DIVINE_PROTECTION' },
  { original: '福星貴人', asura: '福曜護命', family: 'DIVINE_PROTECTION' },
  { original: '國印貴人', asura: '鎮國之印', family: 'POWER' },
  { original: '學堂', asura: '靈學之門', family: 'DIVINE_PROTECTION' },
  { original: '詞館', asura: '文魄秘殿', family: 'DIVINE_PROTECTION' },
  { original: '天廚', asura: '天饗神庫', family: 'TREASURE' },
  { original: '祿神', asura: '玄祿寶印', family: 'TREASURE' },
  { original: '天醫', asura: '天醫靈契', family: 'DIVINE_PROTECTION' },
  { original: '華蓋', asura: '孤華幽冠', family: 'ISOLATION' },
  { original: '劫煞', asura: '劫魂之刃', family: 'TRIBULATION' },
  { original: '亡神', asura: '亡影幽魂', family: 'SHADOW' },
  { original: '白虎', asura: '白虎血印', family: 'BLADE' },
  { original: '喪門', asura: '喪界幽門', family: 'SHADOW' },
  { original: '弔客', asura: '弔魂之影', family: 'SHADOW' },
  { original: '披麻', asura: '麻衣冥印', family: 'SHADOW' },
  { original: '孤辰', asura: '孤辰絕界', family: 'ISOLATION' },
  { original: '寡宿', asura: '寡宿幽宮', family: 'ISOLATION' },
  { original: '紅鸞', asura: '紅鸞魅印', family: 'CHARM' },
  { original: '天喜', asura: '天喜緣契', family: 'CHARM' },
  { original: '咸池', asura: '魅池情印', family: 'CHARM' },
  { original: '紅艷', asura: '緋艷魅魂', family: 'CHARM' },
  { original: '童子', asura: '童靈之印', family: 'DIVINE_PROTECTION' },
  { original: '陰差陽錯', asura: '陰陽錯界', family: 'TRANSFORMATION' },
  { original: '十惡大敗', asura: '十敗劫印', family: 'TRIBULATION' },
  { original: '魁罡', asura: '魁罡戰魂', family: 'POWER' },
  { original: '飛刃', asura: '飛刃血痕', family: 'BLADE' },
  { original: '流霞', asura: '流霞魅痕', family: 'CHARM' },
  { original: '天羅地網', asura: '羅網禁界', family: 'ISOLATION' },
  { original: '血刃', asura: '赤血刃印', family: 'BLADE' },
  { original: '勾絞', asura: '勾魂絞界', family: 'TRIBULATION' },
  { original: '空亡', asura: '虛界空印', family: 'ISOLATION' },
] as const;

/* ================================================================
   02｜完整映射表（50 項 → displayName）
   ================================================================ */

export const GHOST_ASURA_FIXED_MAP: Record<string, string> = Object.fromEntries(
  GHOST_ASURA_50_SEEDS.map(seed => [seed.original, seed.asura])
);

/* ================================================================
   03｜9 大語系家族（用於無限延伸）
   ================================================================ */

export const ASURA_FAMILIES = {
  DIVINE_PROTECTION: {
    prefixes: ['天', '神', '玄', '聖', '龍', '乙', '極', '昌', '福', '印', '學', '醫', '童'],
    suffixes: ['神契', '護命', '天印', '玄契', '聖印', '神印', '天印', '寶印', '靈契', '之門'],
  },
  MOVEMENT: {
    prefixes: ['逐', '踏', '越', '破', '行', '馬', '行', '旅', '飛', '流'],
    suffixes: ['行者', '逐界', '越境', '行魂', '旅印', '之跡', '痕', '波', '逐', '界'],
  },
  ISOLATION: {
    prefixes: ['孤', '幽', '寂', '封', '絕', '華', '孤', '寡', '華', '羅', '虛'],
    suffixes: ['之門', '之界', '孤境', '封域', '幽門', '幽冠', '絕界', '幽宮', '禁界', '空印'],
  },
  TREASURE: {
    prefixes: ['玄', '金', '玉', '秘', '藏', '天', '祿', '庫', '寶', '匣'],
    suffixes: ['寶庫', '玄藏', '金宮', '秘庫', '寶匣', '神庫', '寶印', '寶庫', '寶', '藏'],
  },
  SHADOW: {
    prefixes: ['幽', '陰', '冥', '暗', '噬', '亡', '喪', '弔', '披', '五', '元'],
    suffixes: ['之影', '纏影', '幽障', '冥魂', '暗印', '幽魂', '幽門', '之影', '冥印', '纏影', '之障'],
  },
  TRANSFORMATION: {
    prefixes: ['洗', '蛻', '轉', '淨', '煉', '陰', '陽'],
    suffixes: ['之境', '魂境', '蛻印', '淨魂', '煉魄', '錯界', '錯界'],
  },
  RUPTURE: {
    prefixes: ['裂', '碎', '破', '斷', '崩', '日', '月'],
    suffixes: ['之痕', '裂印', '碎痕', '破界', '斷痕', '之痕', '之痕'],
  },
  TRIBULATION: {
    prefixes: ['劫', '災', '厄', '煞', '禁', '劫', '十', '勾'],
    suffixes: ['之門', '之關', '劫境', '厄印', '禁域', '之刃', '敗劫印', '絞界'],
  },
  POWER: {
    prefixes: ['鎮', '帝', '軍', '王', '戰', '國', '魁', '罡'],
    suffixes: ['之魂', '王印', '戰魂', '鎮令', '帝印', '之印', '戰魂', '戰魂'],
  },
  BLADE: {
    prefixes: ['血', '刃', '赤', '斬', '鋒', '白', '飛', '赤'],
    suffixes: ['之鋒', '血刃', '斬魂', '刃印', '赤鋒', '血印', '血痕', '血刃印'],
  },
  CHARM: {
    prefixes: ['魅', '緋', '幻', '花', '情', '紅', '天', '咸', '紅', '流'],
    suffixes: ['之印', '魅緣', '花印', '幻緣', '魅魂', '魅印', '緣契', '情印', '魅魂', '魅痕'],
  },
} as const;

type AsuraFamily = keyof typeof ASURA_FAMILIES;

/* ================================================================
   04｜穩定 Hash（無隨機性）
   ================================================================ */

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/* ================================================================
   05｜自動分類（新神煞 → 9 語系）
   ================================================================ */

export function classifyAsuraFamily(originalName: string, keywords?: string[]): AsuraFamily {
  const text = [originalName, ...(keywords ?? [])].join(' ');

  if (/德|貴|福|恩|赦|佑|護|吉|乙|極|昌|福|印|學|醫|童|契/.test(text)) return 'DIVINE_PROTECTION';
  if (/馬|移|行|旅|動|遷|踏|越|飛|流/.test(text)) return 'MOVEMENT';
  if (/孤|寡|隔|孤辰|寡宿|華|寂|封|絕|羅|虛/.test(text)) return 'ISOLATION';
  if (/財|庫|金|祿|寶|天|廚|食/.test(text)) return 'TREASURE';
  if (/鬼|陰|幽|亡|煞|暗|喪|弔|披|麻|五/.test(text)) return 'SHADOW';
  if (/浴|生|養|胎|長生|陰|陽|錯/.test(text)) return 'TRANSFORMATION';
  if (/破|碎|裂|沖|日|月/.test(text)) return 'RUPTURE';
  if (/災|厄|劫|難|關|十|惡|敗|勾|絞/.test(text)) return 'TRIBULATION';
  if (/將|權|官|軍|帝|帥|國|魁|罡/.test(text)) return 'POWER';
  if (/刃|刀|鋒|血|白|虎|飛|赤/.test(text)) return 'BLADE';
  if (/桃花|紅鸞|天喜|咸池|情|緣|魅|紅|艷|花/.test(text)) return 'CHARM';

  return 'SHADOW'; // 預設類別
}

/* ================================================================
   06｜名稱生成（新神煞自動延伸）
   ================================================================ */

export function buildGhostAsuraName(
  originalName: string,
  ruleVersion: string = '1.0',
  keywords?: string[],
  usedNames?: Set<string>
): string {
  // 50 項優先：直接返回
  const fixed = GHOST_ASURA_FIXED_MAP[originalName];
  if (fixed) return fixed;

  // 自動分類 → 語系選擇
  const family = classifyAsuraFamily(originalName, keywords);
  const grammar = ASURA_FAMILIES[family];

  // 穩定 Hash
  const seed = stableHash(originalName + '|' + ruleVersion);
  let index = seed % grammar.suffixes.length;
  let name = grammar.prefixes[seed % grammar.prefixes.length] + grammar.suffixes[index];

  // 防重名
  if (usedNames) {
    let offset = 0;
    while (usedNames.has(name)) {
      offset++;
      index = (seed + offset) % grammar.suffixes.length;
      name = grammar.prefixes[(seed + offset) % grammar.prefixes.length] + grammar.suffixes[index];

      if (offset > 100) {
        throw new Error(`ASURA_NAME_COLLISION: ${originalName}`);
      }
    }
    usedNames.add(name);
  }

  return name;
}

/* ================================================================
   07｜轉譯入口
   ================================================================ */

export function translateToAsuraName(originalName: string, ruleVersion: string = '1.0'): string {
  const fixed = GHOST_ASURA_FIXED_MAP[originalName];
  if (fixed) return fixed;

  return buildGhostAsuraName(originalName, ruleVersion);
}

/* ================================================================
   08｜批量轉譯（去重）
   ================================================================ */

export function translateMultipleNames(
  names: string[],
  ruleVersion: string = '1.0'
): string[] {
  const usedNames = new Set<string>();

  // 先鎖住 50 項固定名稱
  Object.values(GHOST_ASURA_FIXED_MAP).forEach(name => usedNames.add(name));

  return names.map(originalName => {
    const fixed = GHOST_ASURA_FIXED_MAP[originalName];
    if (fixed) return fixed;

    return buildGhostAsuraName(originalName, ruleVersion, undefined, usedNames);
  });
}

/* ================================================================
   09｜完整度守門（後端 = 前端）
   ================================================================ */

export function validateGhostAsuraCompleteness(
  originalCount: number,
  asuraCount: number
): { status: 'PASSED' | 'FAILED'; originalCount: number; asuraCount: number; message: string } {
  if (originalCount !== asuraCount) {
    return {
      status: 'FAILED',
      originalCount,
      asuraCount,
      message: `GHOST_ASURA_INCOMPLETE: 原始神煞 ${originalCount} 項，阿修羅只有 ${asuraCount} 項。不得送到正式前端。`,
    };
  }

  return {
    status: 'PASSED',
    originalCount,
    asuraCount,
    message: `GHOST_ASURA_COMPLETE: ${originalCount} 項完全對應`,
  };
}

/* ================================================================
   10｜監控覆蓋率
   ================================================================ */

export function getNameMapCoverage(allOriginalNames: string[]): {
  total: number;
  mapped: number;
  coverage: number;
} {
  const mapped = allOriginalNames.filter(name => name in GHOST_ASURA_FIXED_MAP).length;
  return {
    total: allOriginalNames.length,
    mapped,
    coverage: allOriginalNames.length > 0 ? Math.round((mapped / allOriginalNames.length) * 100) : 0,
  };
}
