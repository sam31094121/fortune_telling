/** New Asura language helpers. Selected unchanged from lib/asura-name-map.ts on 2026-10-04.
 * Historical source remains read-only. No runtime fallback to its naming registry.
 * This is display grammar/hash, never a bazi or shensha calculation.
 */
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

