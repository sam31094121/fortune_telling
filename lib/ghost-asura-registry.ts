/**
 * 鬼魅阿修羅完整命名母種 & 映射 Registry
 *
 * 業主定案《工程師專用｜鬼魅阿修羅單卡｜直接開工版》
 *
 * 鐵律：
 * 1. originalName → displayName 永久映射（不重名、不隨機）
 * 2. 固定母種只是範本，後端幾項就轉幾項（禁止寫死總數上限）
 * 3. 新神煞自動分類 → 語系 → 穩定延伸
 * 4. 前後端數量必須一致（completeness guard）
 *
 * 固定映射必須與 lib/asura-name-map.ts 附件「四」對齊。
 * 本檔刻意自洽（無相對 import），以便 node 完整度測試可直接載入。
 */

/* ================================================================
   01｜固定母種（對齊附件「四」；非總數上限）
   ================================================================ */

export const GHOST_ASURA_SEEDS = [
  { original: '天德合', asura: '天赦神契', family: 'DIVINE_PROTECTION' },
  { original: '驛馬', asura: '逐界行者', family: 'MOVEMENT' },
  { original: '隔角', asura: '孤界之門', family: 'ISOLATION' },
  { original: '金匱', asura: '玄金寶庫', family: 'TREASURE' },
  { original: '五鬼', asura: '五陰纏影', family: 'SHADOW' },
  { original: '沐浴', asura: '洗魂之境', family: 'TRANSFORMATION' },
  { original: '日破', asura: '裂日之痕', family: 'RUPTURE' },
  { original: '天狗', asura: '噬天之影', family: 'SHADOW' },
  { original: '災煞', asura: '劫境之門', family: 'TRIBULATION' },
  { original: '天煞', asura: '裂天劫印', family: 'TRIBULATION' },
  { original: '月破', asura: '碎月之痕', family: 'RUPTURE' },
  { original: '將星', asura: '鎮軍之魂', family: 'POWER' },
  { original: '龍德', asura: '天龍護命', family: 'DIVINE_PROTECTION' },
  { original: '六厄', asura: '六劫之關', family: 'TRIBULATION' },
  { original: '元辰', asura: '幽辰之障', family: 'SHADOW' },
  { original: '羊刃', asura: '血刃之鋒', family: 'BLADE' },
  { original: '桃花', asura: '魅生之印', family: 'CHARM' },
  { original: '外桃花', asura: '界外魅緣', family: 'CHARM' },
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

/** @deprecated 名稱保留相容；實際為附件「四」固定母種，非上限 50 */
export const GHOST_ASURA_50_SEEDS = GHOST_ASURA_SEEDS;

export const GHOST_ASURA_FIXED_MAP: Record<string, string> = Object.fromEntries(
  GHOST_ASURA_SEEDS.map((seed) => [seed.original, seed.asura])
);

export const ASURA_FAMILIES = {
  DIVINE_PROTECTION: {
    prefixes: ['天', '神', '玄', '龍', '聖'],
    suffixes: ['神契', '護命', '天印', '玄契', '聖印'],
  },
  MOVEMENT: {
    prefixes: ['逐', '行', '越', '踏', '破'],
    suffixes: ['行者', '逐界', '越境', '行魂', '旅印'],
  },
  ISOLATION: {
    prefixes: ['孤', '幽', '絕', '封', '虛'],
    suffixes: ['之門', '之界', '孤境', '封域', '幽門'],
  },
  TREASURE: {
    prefixes: ['玄', '金', '寶', '祿', '藏'],
    suffixes: ['寶庫', '玄藏', '金宮', '秘庫', '寶匣'],
  },
  SHADOW: {
    prefixes: ['幽', '冥', '陰', '魂', '噬'],
    suffixes: ['之影', '纏影', '幽障', '冥魂', '暗印'],
  },
  TRANSFORMATION: {
    prefixes: ['洗', '蛻', '淨', '煉', '轉'],
    suffixes: ['之境', '魂境', '蛻印', '淨魂', '煉魄'],
  },
  RUPTURE: {
    prefixes: ['裂', '碎', '破', '斷', '崩'],
    suffixes: ['之痕', '裂印', '碎痕', '破界', '斷痕'],
  },
  TRIBULATION: {
    prefixes: ['劫', '裂', '禁', '厄', '災'],
    suffixes: ['之門', '之關', '劫境', '厄印', '禁域'],
  },
  POWER: {
    prefixes: ['鎮', '軍', '王', '帝', '戰'],
    suffixes: ['之魂', '王印', '戰魂', '鎮令', '帝印'],
  },
  BLADE: {
    prefixes: ['血', '刃', '鋒', '斬', '赤'],
    suffixes: ['之鋒', '血刃', '斬魂', '刃印', '赤鋒'],
  },
  CHARM: {
    prefixes: ['魅', '緣', '情', '艷', '鸞'],
    suffixes: ['之印', '魅緣', '花印', '幻緣', '魅魂'],
  },
} as const;

type AsuraFamily = keyof typeof ASURA_FAMILIES;

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

export function classifyAsuraFamily(originalName: string, keywords?: string[]): AsuraFamily {
  const text = [originalName, ...(keywords ?? [])].join(' ');

  if (/德|貴|福|恩|赦|佑|護|吉|乙|極|昌|學|醫|童/.test(text)) return 'DIVINE_PROTECTION';
  if (/馬|移|行|旅|動|遷/.test(text)) return 'MOVEMENT';
  if (/孤|寡|隔|孤辰|寡宿|華蓋|羅網|空亡/.test(text)) return 'ISOLATION';
  if (/財|庫|金|祿|寶|廚/.test(text)) return 'TREASURE';
  if (/鬼|陰|幽|亡|暗|喪|弔|披|麻/.test(text)) return 'SHADOW';
  if (/浴|生|養|胎|長生|陰差|陽錯/.test(text)) return 'TRANSFORMATION';
  if (/破|碎|裂|沖/.test(text)) return 'RUPTURE';
  if (/災|厄|劫|難|關|天煞|十惡|勾絞/.test(text)) return 'TRIBULATION';
  if (/將|權|官|軍|帝|帥|魁|罡|國印/.test(text)) return 'POWER';
  if (/刃|刀|鋒|血|白虎|飛刃/.test(text)) return 'BLADE';
  if (/桃花|紅鸞|天喜|咸池|情|緣|魅|紅艷|流霞/.test(text)) return 'CHARM';

  return 'SHADOW';
}

export function buildGhostAsuraName(
  originalName: string,
  ruleVersion: string = '1.0',
  keywords?: string[],
  usedNames?: Set<string>
): string {
  const fixed = GHOST_ASURA_FIXED_MAP[originalName];
  if (fixed) return fixed;

  const family = classifyAsuraFamily(originalName, keywords);
  const grammar = ASURA_FAMILIES[family];
  const seed = stableHash(originalName + '|' + ruleVersion);

  let index = seed % grammar.suffixes.length;
  let name = grammar.prefixes[seed % grammar.prefixes.length] + grammar.suffixes[index];

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

export function translateToAsuraName(originalName: string, ruleVersion: string = '1.0'): string {
  const fixed = GHOST_ASURA_FIXED_MAP[originalName];
  if (fixed) return fixed;
  return buildGhostAsuraName(originalName, ruleVersion);
}

export function translateMultipleNames(
  names: string[],
  ruleVersion: string = '1.0'
): string[] {
  const usedNames = new Set<string>();
  Object.values(GHOST_ASURA_FIXED_MAP).forEach((name) => usedNames.add(name));

  return names.map((originalName) => {
    const fixed = GHOST_ASURA_FIXED_MAP[originalName];
    if (fixed) return fixed;
    return buildGhostAsuraName(originalName, ruleVersion, undefined, usedNames);
  });
}

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

export function getNameMapCoverage(allOriginalNames: string[]): {
  total: number;
  mapped: number;
  coverage: number;
} {
  const mapped = allOriginalNames.filter((name) => name in GHOST_ASURA_FIXED_MAP).length;
  return {
    total: allOriginalNames.length,
    mapped,
    coverage: allOriginalNames.length > 0 ? Math.round((mapped / allOriginalNames.length) * 100) : 0,
  };
}
