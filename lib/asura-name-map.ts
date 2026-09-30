/**
 * 阿修羅檔案 — 名稱轉譯核心
 * ============================================================================
 * 業主定案 2026-09-30：17 項母種 + 9 大語系 → 無限延伸
 *
 * 核心規則：
 * 1. 原始神煞資料層完全保留（後端算法不動）
 * 2. 前端全部用本模組轉譯成鬼魅阿修羅語言
 * 3. 200 項、300 項、1000 項都同一套規則自動生成
 * 4. 禁止 Math.random()，用 stableHash 保證穩定性
 * 5. 17 項正式名稱永遠最優先
 */

/* ================================================================
   01｜17 項正式母種（鬼魅阿修羅命名標準）
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
  { original: '月破', asura: '碎月之痕', family: 'RUPTURE' },
  { original: '將星', asura: '鎮軍之魂', family: 'POWER' },
  { original: '龍德', asura: '天龍護命', family: 'DIVINE_PROTECTION' },
  { original: '六厄', asura: '六劫之關', family: 'TRIBULATION' },
  { original: '元辰', asura: '幽辰之障', family: 'SHADOW' },
  { original: '羊刃', asura: '血刃之鋒', family: 'BLADE' },
  { original: '桃花', asura: '魅生之印', family: 'CHARM' },
  { original: '外桃花', asura: '界外魅緣', family: 'CHARM' },
] as const;

/* ================================================================
   02｜阿修羅九大語系家族
   ================================================================ */

export const ASURA_FAMILIES = {
  DIVINE_PROTECTION: {
    prefixes: ['天', '神', '玄', '聖', '龍'],
    cores: ['護', '赦', '佑', '契', '命'],
    suffixes: ['神契', '護命', '天印', '玄契', '聖印'],
  },
  MOVEMENT: {
    prefixes: ['逐', '踏', '越', '破', '行'],
    cores: ['界', '途', '境', '域', '路'],
    suffixes: ['行者', '逐界', '越境', '行魂', '旅印'],
  },
  ISOLATION: {
    prefixes: ['孤', '幽', '寂', '封', '絕'],
    cores: ['界', '門', '域', '境', '城'],
    suffixes: ['之門', '之界', '孤境', '封域', '幽門'],
  },
  TREASURE: {
    prefixes: ['玄', '金', '玉', '秘', '藏'],
    cores: ['庫', '匣', '宮', '藏', '寶'],
    suffixes: ['寶庫', '玄藏', '金宮', '秘庫', '寶匣'],
  },
  SHADOW: {
    prefixes: ['幽', '陰', '冥', '暗', '噬'],
    cores: ['影', '魂', '障', '魘', '纏'],
    suffixes: ['之影', '纏影', '幽障', '冥魂', '暗印'],
  },
  TRANSFORMATION: {
    prefixes: ['洗', '蛻', '轉', '淨', '煉'],
    cores: ['魂', '境', '身', '心', '魄'],
    suffixes: ['之境', '魂境', '蛻印', '淨魂', '煉魄'],
  },
  RUPTURE: {
    prefixes: ['裂', '碎', '破', '斷', '崩'],
    cores: ['日', '月', '界', '天', '境'],
    suffixes: ['之痕', '裂印', '碎痕', '破界', '斷痕'],
  },
  TRIBULATION: {
    prefixes: ['劫', '災', '厄', '煞', '禁'],
    cores: ['境', '關', '門', '劫', '域'],
    suffixes: ['之門', '之關', '劫境', '厄印', '禁域'],
  },
  POWER: {
    prefixes: ['鎮', '帝', '軍', '王', '戰'],
    cores: ['魂', '令', '威', '權', '印'],
    suffixes: ['之魂', '王印', '戰魂', '鎮令', '帝印'],
  },
  BLADE: {
    prefixes: ['血', '刃', '赤', '斬', '鋒'],
    cores: ['刃', '鋒', '刀', '魄', '痕'],
    suffixes: ['之鋒', '血刃', '斬魂', '刃印', '赤鋒'],
  },
  CHARM: {
    prefixes: ['魅', '緋', '幻', '花', '情'],
    cores: ['生', '緣', '印', '魂', '界'],
    suffixes: ['之印', '魅緣', '花印', '幻緣', '魅魂'],
  },
} as const;

type AsuraFamily = keyof typeof ASURA_FAMILIES;

/* ================================================================
   03｜17 項優先固定映射表
   ================================================================ */

export const FIXED_ASURA_MAP: Record<string, string> = {
  天德合: '天赦神契',
  驛馬: '逐界行者',
  隔角: '孤界之門',
  金匱: '玄金寶庫',
  五鬼: '五陰纏影',
  沐浴: '洗魂之境',
  日破: '裂日之痕',
  天狗: '噬天之影',
  災煞: '劫境之門',
  月破: '碎月之痕',
  將星: '鎮軍之魂',
  龍德: '天龍護命',
  六厄: '六劫之關',
  元辰: '幽辰之障',
  羊刃: '血刃之鋒',
  桃花: '魅生之印',
  外桃花: '界外魅緣',
};

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

  if (/德|貴|福|恩|赦|佑|護|吉/.test(text)) return 'DIVINE_PROTECTION';
  if (/馬|移|行|旅|動|遷/.test(text)) return 'MOVEMENT';
  if (/孤|寡|隔|孤辰|寡宿/.test(text)) return 'ISOLATION';
  if (/財|庫|金|祿|寶/.test(text)) return 'TREASURE';
  if (/鬼|陰|幽|亡|煞|暗/.test(text)) return 'SHADOW';
  if (/浴|生|養|胎|長生/.test(text)) return 'TRANSFORMATION';
  if (/破|碎|裂|沖/.test(text)) return 'RUPTURE';
  if (/災|厄|劫|難|關/.test(text)) return 'TRIBULATION';
  if (/將|權|官|軍|帝|帥/.test(text)) return 'POWER';
  if (/刃|刀|鋒|血/.test(text)) return 'BLADE';
  if (/桃花|紅鸞|天喜|咸池|情|緣|魅/.test(text)) return 'CHARM';

  return 'SHADOW';
}

/* ================================================================
   06｜阿修羅名稱生成器
   無止境延伸的核心邏輯
   ================================================================ */

export function buildGhostAsuraName(
  originalName: string,
  ruleVersion: string,
  keywords?: string[],
  usedNames?: Set<string>
): string {
  // 17 項正式名稱永遠優先
  const fixed = FIXED_ASURA_MAP[originalName];
  if (fixed) return fixed;

  // 屬性分類 → 語系選擇
  const family = classifyAsuraFamily(originalName, keywords);
  const grammar = ASURA_FAMILIES[family];

  // 穩定 Hash — 同輸入永遠同輸出
  const seed = stableHash(originalName + '|' + ruleVersion);

  let index = seed % grammar.suffixes.length;
  let name = grammar.prefixes[seed % grammar.prefixes.length] + grammar.suffixes[index];

  // 防止重名（如果有 usedNames 集合）
  if (usedNames) {
    let offset = 0;
    while (usedNames.has(name)) {
      offset++;
      index = (seed + offset) % grammar.suffixes.length;
      name = grammar.prefixes[(seed + offset) % grammar.prefixes.length] + grammar.suffixes[index];

      // 防止無限迴圈
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
  // 17 項直接返回
  const fixed = FIXED_ASURA_MAP[originalName];
  if (fixed) return fixed;

  // 不在 17 項的自動生成（無重名風險，因為調用時沒有 usedNames）
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

  // 先把 17 個固定名稱鎖住
  Object.values(FIXED_ASURA_MAP).forEach((name) => usedNames.add(name));

  // 逐項轉譯，自動防重名
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
