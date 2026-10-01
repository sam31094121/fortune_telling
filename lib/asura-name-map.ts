/**
 * 阿修羅檔案 — 名稱轉譯核心
 *
 * 業主定案《工程師專用｜鬼魅阿修羅單卡｜直接開工版》
 *
 * 核心規則：
 * 1. 原始神煞資料層完全保留（後端算法不動）
 * 2. 前端全部用本模組轉譯成鬼魅阿修羅語言
 * 3. 固定映射覆蓋附件「四」；未收錄項用穩定延伸語系
 * 4. 禁止 Math.random()，用 stableHash 保證同神煞每次同名
 * 5. 禁止把總數寫死；後端有多少已驗證神煞就轉多少
 */

/* ================================================================
   01｜附件「四」固定母種（非上限）
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

/* ================================================================
   02｜阿修羅九大語系家族（附件「六」延伸語系）
   ================================================================ */

export const ASURA_FAMILIES = {
  DIVINE_PROTECTION: {
    prefixes: ['天', '神', '玄', '龍', '聖'],
    cores: ['護', '命', '契', '印', '赦'],
    suffixes: ['神契', '護命', '天印', '玄契', '聖印'],
  },
  MOVEMENT: {
    prefixes: ['逐', '行', '越', '踏', '破'],
    cores: ['界', '境', '域', '途', '路'],
    suffixes: ['行者', '逐界', '越境', '行魂', '旅印'],
  },
  ISOLATION: {
    prefixes: ['孤', '幽', '絕', '封', '虛'],
    cores: ['界', '門', '域', '境', '宮'],
    suffixes: ['之門', '之界', '孤境', '封域', '幽門'],
  },
  TREASURE: {
    prefixes: ['玄', '金', '寶', '祿', '藏'],
    cores: ['庫', '匣', '宮', '藏', '印'],
    suffixes: ['寶庫', '玄藏', '金宮', '秘庫', '寶匣'],
  },
  SHADOW: {
    prefixes: ['幽', '冥', '陰', '魂', '噬'],
    cores: ['影', '障', '魘', '纏', '魂'],
    suffixes: ['之影', '纏影', '幽障', '冥魂', '暗印'],
  },
  TRANSFORMATION: {
    prefixes: ['洗', '蛻', '淨', '煉', '轉'],
    cores: ['魂', '魄', '生', '境', '身'],
    suffixes: ['之境', '魂境', '蛻印', '淨魂', '煉魄'],
  },
  RUPTURE: {
    prefixes: ['裂', '碎', '破', '斷', '崩'],
    cores: ['日', '月', '天', '界', '境'],
    suffixes: ['之痕', '裂印', '碎痕', '破界', '斷痕'],
  },
  TRIBULATION: {
    prefixes: ['劫', '裂', '禁', '厄', '災'],
    cores: ['關', '境', '門', '痕', '域'],
    suffixes: ['之門', '之關', '劫境', '厄印', '禁域'],
  },
  POWER: {
    prefixes: ['鎮', '軍', '王', '帝', '戰'],
    cores: ['令', '威', '權', '魂', '印'],
    suffixes: ['之魂', '王印', '戰魂', '鎮令', '帝印'],
  },
  BLADE: {
    prefixes: ['血', '刃', '鋒', '斬', '赤'],
    cores: ['刃', '鋒', '魄', '痕', '刀'],
    suffixes: ['之鋒', '血刃', '斬魂', '刃印', '赤鋒'],
  },
  CHARM: {
    prefixes: ['魅', '緣', '情', '艷', '鸞'],
    cores: ['花', '魂', '印', '緣', '界'],
    suffixes: ['之印', '魅緣', '花印', '幻緣', '魅魂'],
  },
} as const;

type AsuraFamily = keyof typeof ASURA_FAMILIES;

/* ================================================================
   03｜固定映射表（附件「四」）
   ================================================================ */

export const FIXED_ASURA_MAP: Record<string, string> = Object.fromEntries(
  GHOST_ASURA_SEEDS.map((seed) => [seed.original, seed.asura])
);

/** 附件「四」必收清單（驗收用，非總數上限） */
export const ATTACHMENT_SECTION_FOUR_REQUIRED = [
  ['天德合', '天赦神契'],
  ['驛馬', '逐界行者'],
  ['隔角', '孤界之門'],
  ['金匱', '玄金寶庫'],
  ['五鬼', '五陰纏影'],
  ['沐浴', '洗魂之境'],
  ['日破', '裂日之痕'],
  ['天狗', '噬天之影'],
  ['災煞', '劫境之門'],
  ['天煞', '裂天劫印'],
  ['月破', '碎月之痕'],
  ['將星', '鎮軍之魂'],
  ['龍德', '天龍護命'],
  ['六厄', '六劫之關'],
  ['元辰', '幽辰之障'],
  ['羊刃', '血刃之鋒'],
  ['桃花', '魅生之印'],
  ['外桃花', '界外魅緣'],
  ['天乙貴人', '天乙神印'],
  ['太極貴人', '玄極天印'],
  ['文昌貴人', '文魂天契'],
  ['福星貴人', '福曜護命'],
  ['國印貴人', '鎮國之印'],
  ['學堂', '靈學之門'],
  ['詞館', '文魄秘殿'],
  ['天廚', '天饗神庫'],
  ['祿神', '玄祿寶印'],
  ['天醫', '天醫靈契'],
  ['華蓋', '孤華幽冠'],
  ['劫煞', '劫魂之刃'],
  ['亡神', '亡影幽魂'],
  ['白虎', '白虎血印'],
  ['喪門', '喪界幽門'],
  ['弔客', '弔魂之影'],
  ['披麻', '麻衣冥印'],
  ['孤辰', '孤辰絕界'],
  ['寡宿', '寡宿幽宮'],
  ['紅鸞', '紅鸞魅印'],
  ['天喜', '天喜緣契'],
  ['咸池', '魅池情印'],
  ['紅艷', '緋艷魅魂'],
  ['童子', '童靈之印'],
  ['陰差陽錯', '陰陽錯界'],
  ['十惡大敗', '十敗劫印'],
  ['魁罡', '魁罡戰魂'],
  ['飛刃', '飛刃血痕'],
  ['流霞', '流霞魅痕'],
  ['天羅地網', '羅網禁界'],
  ['血刃', '赤血刃印'],
  ['勾絞', '勾魂絞界'],
  ['空亡', '虛界空印'],
] as const;

/* ================================================================
   04｜穩定 Hash — 同輸入永遠同輸出（禁止 Math.random()）
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
   05｜神煞屬性 → 阿修羅語系判斷
   ================================================================ */

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

/* ================================================================
   06｜阿修羅名稱生成器
   ================================================================ */

export function buildGhostAsuraName(
  originalName: string,
  ruleVersion: string,
  keywords?: string[],
  usedNames?: Set<string>
): string {
  const fixed = FIXED_ASURA_MAP[originalName];
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

/* ================================================================
   07｜轉譯入口 — 前端調用
   ================================================================ */

export function translateToAsuraName(originalName: string, ruleVersion: string = '1.0'): string {
  const fixed = FIXED_ASURA_MAP[originalName];
  if (fixed) return fixed;

  return buildGhostAsuraName(originalName, ruleVersion);
}

/* ================================================================
   08｜批量轉譯
   ================================================================ */

export function translateMultipleNames(
  names: string[],
  ruleVersion: string = '1.0'
): string[] {
  const usedNames = new Set<string>();

  Object.values(FIXED_ASURA_MAP).forEach((name) => usedNames.add(name));

  return names.map((originalName) => {
    const fixed = FIXED_ASURA_MAP[originalName];
    if (fixed) return fixed;

    return buildGhostAsuraName(originalName, ruleVersion, undefined, usedNames);
  });
}

/* ================================================================
   09｜統計覆蓋率（監控轉譯完整度）
   ================================================================ */

export function getNameMapCoverage(allOriginalNames: string[]): {
  total: number;
  mapped: number;
  coverage: number;
} {
  const mapped = allOriginalNames.filter((name) => name in FIXED_ASURA_MAP).length;
  return {
    total: allOriginalNames.length,
    mapped,
    coverage: allOriginalNames.length > 0 ? Math.round((mapped / allOriginalNames.length) * 100) : 0,
  };
}
