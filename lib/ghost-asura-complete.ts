/**
 * 鬼魅阿修羅完整轉譯引擎 — 工程師專用直接開工版
 *
 * 核心規格：後端數量 = 轉譯數量 = 前端顯示數量
 * 固定映射對齊附件「四」／asura-name-map／registry
 * 本檔自洽（無相對 import），避免 node 完整度測試解析失敗。
 */

export const GHOST_ASURA_FIXED_MAP: Record<string, string> = {
  天德合: '天赦神契',
  驛馬: '逐界行者',
  隔角: '孤界之門',
  金匱: '玄金寶庫',
  五鬼: '五陰纏影',
  沐浴: '洗魂之境',
  日破: '裂日之痕',
  天狗: '噬天之影',
  災煞: '劫境之門',
  天煞: '裂天劫印',
  月破: '碎月之痕',
  將星: '鎮軍之魂',
  龍德: '天龍護命',
  六厄: '六劫之關',
  元辰: '幽辰之障',
  羊刃: '血刃之鋒',
  桃花: '魅生之印',
  外桃花: '界外魅緣',
  天乙貴人: '天乙神印',
  太極貴人: '玄極天印',
  文昌貴人: '文魂天契',
  福星貴人: '福曜護命',
  國印貴人: '鎮國之印',
  學堂: '靈學之門',
  詞館: '文魄秘殿',
  天廚: '天饗神庫',
  祿神: '玄祿寶印',
  天醫: '天醫靈契',
  華蓋: '孤華幽冠',
  劫煞: '劫魂之刃',
  亡神: '亡影幽魂',
  白虎: '白虎血印',
  喪門: '喪界幽門',
  弔客: '弔魂之影',
  披麻: '麻衣冥印',
  孤辰: '孤辰絕界',
  寡宿: '寡宿幽宮',
  紅鸞: '紅鸞魅印',
  天喜: '天喜緣契',
  咸池: '魅池情印',
  紅艷: '緋艷魅魂',
  童子: '童靈之印',
  陰差陽錯: '陰陽錯界',
  十惡大敗: '十敗劫印',
  魁罡: '魁罡戰魂',
  飛刃: '飛刃血痕',
  流霞: '流霞魅痕',
  天羅地網: '羅網禁界',
  血刃: '赤血刃印',
  勾絞: '勾魂絞界',
  空亡: '虛界空印',
};

const ASURA_LANGUAGE_FAMILIES = {
  DIVINE_PROTECTION: {
    prefixes: ['天', '神', '玄', '聖', '龍'],
    suffixes: ['神契', '護命', '天印', '玄契', '聖印'],
  },
  MOVEMENT: {
    prefixes: ['逐', '踏', '越', '破', '行'],
    suffixes: ['行者', '逐界', '越境', '行魂', '旅印'],
  },
  ISOLATION: {
    prefixes: ['孤', '幽', '寂', '封', '絕'],
    suffixes: ['之門', '之界', '孤境', '封域', '幽門'],
  },
  TREASURE: {
    prefixes: ['玄', '金', '玉', '秘', '藏'],
    suffixes: ['寶庫', '玄藏', '金宮', '秘庫', '寶匣'],
  },
  SHADOW: {
    prefixes: ['幽', '陰', '冥', '暗', '噬'],
    suffixes: ['之影', '纏影', '幽障', '冥魂', '暗印'],
  },
  TRANSFORMATION: {
    prefixes: ['洗', '蛻', '轉', '淨', '煉'],
    suffixes: ['之境', '魂境', '蛻印', '淨魂', '煉魄'],
  },
  RUPTURE: {
    prefixes: ['裂', '碎', '破', '斷', '崩'],
    suffixes: ['之痕', '裂印', '碎痕', '破界', '斷痕'],
  },
  TRIBULATION: {
    prefixes: ['劫', '災', '厄', '煞', '禁'],
    suffixes: ['之門', '之關', '劫境', '厄印', '禁域'],
  },
  POWER: {
    prefixes: ['鎮', '帝', '軍', '王', '戰'],
    suffixes: ['之魂', '王印', '戰魂', '鎮令', '帝印'],
  },
  BLADE: {
    prefixes: ['血', '刃', '赤', '斬', '鋒'],
    suffixes: ['之鋒', '血刃', '斬魂', '刃印', '赤鋒'],
  },
  CHARM: {
    prefixes: ['魅', '緋', '幻', '花', '情'],
    suffixes: ['之印', '魅緣', '花印', '幻緣', '魅魂'],
  },
} as const;

export interface ShenShaRaw {
  id: string;
  originalName: string;
  matched: boolean;
  category?: string;
  source?: string;
  ruleVersion?: string;
  hitPillar?: string;
}

export interface GhostAsuraItem {
  id: string;
  originalName: string;
  displayName: string;
  matched: boolean;
  family: string;
  generated: boolean;
  hitPillar?: string;
}

function classifyAsuraFamily(originalName: string): string {
  const text = originalName;

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

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function generateAsuraNameFromPattern(
  originalName: string,
  usedNames: Set<string>
): string {
  const family = classifyAsuraFamily(originalName);
  const grammar =
    ASURA_LANGUAGE_FAMILIES[family as keyof typeof ASURA_LANGUAGE_FAMILIES];

  if (!grammar) {
    throw new Error(`Unknown family for ${originalName}`);
  }

  const hash = stableHash(originalName);
  const prefix = grammar.prefixes[hash % grammar.prefixes.length];
  let name = prefix + grammar.suffixes[hash % grammar.suffixes.length];
  let offset = 0;

  while (usedNames.has(name) && offset < 100) {
    offset++;
    name = prefix + grammar.suffixes[(hash + offset) % grammar.suffixes.length];
  }

  if (offset >= 100) {
    throw new Error(`ASURA_NAME_COLLISION: ${originalName}`);
  }

  usedNames.add(name);
  return name;
}

function translateShenShaToAsura(
  item: ShenShaRaw,
  usedNames: Set<string>
): GhostAsuraItem {
  const fixed = GHOST_ASURA_FIXED_MAP[item.originalName];
  const displayName =
    fixed || generateAsuraNameFromPattern(item.originalName, usedNames);

  if (fixed) {
    usedNames.add(fixed);
  }

  // 雙盤頁目前把柱位放在 category（year/month/day/hour）；優先 hitPillar
  const hitPillar = item.hitPillar || item.category;

  return {
    id: item.id,
    originalName: item.originalName,
    displayName,
    matched: item.matched,
    family: classifyAsuraFamily(item.originalName),
    generated: !fixed,
    hitPillar,
  };
}

export function translateAllShenSha(results: ShenShaRaw[]): GhostAsuraItem[] {
  const usedNames = new Set<string>();
  Object.values(GHOST_ASURA_FIXED_MAP).forEach((name) => usedNames.add(name));
  return results.map((item) => translateShenShaToAsura(item, usedNames));
}

export function validateCounts(
  backendCount: number,
  translatedCount: number,
  displayedCount: number
): {
  valid: boolean;
  message: string;
  backend: number;
  translated: number;
  displayed: number;
} {
  const valid =
    backendCount === translatedCount && translatedCount === displayedCount;

  return {
    valid,
    message: valid
      ? `✅ PASSED: ${backendCount} = ${translatedCount} = ${displayedCount}`
      : `❌ FAILED: 後端 ${backendCount} ≠ 轉譯 ${translatedCount} ≠ 前端 ${displayedCount}`,
    backend: backendCount,
    translated: translatedCount,
    displayed: displayedCount,
  };
}

export function validateEachItemPresent(
  backendIds: string[],
  displayedIds: string[]
): {
  passed: boolean;
  missing: string[];
  message: string;
} {
  const displayedSet = new Set(displayedIds);
  const missing = backendIds.filter((id) => !displayedSet.has(id));

  return {
    passed: missing.length === 0,
    missing,
    message:
      missing.length === 0
        ? `✅ 全部 ${backendIds.length} 項都有顯示`
        : `❌ 缺少 ${missing.length} 項：${missing.join(', ')}`,
  };
}

export function assertCompleteTranslation(input: {
  backendShenSha: ShenShaRaw[];
  translatedResults: GhostAsuraItem[];
  displayedResults: GhostAsuraItem[];
}): {
  passed: boolean;
  countCheck: ReturnType<typeof validateCounts>;
  itemCheck: ReturnType<typeof validateEachItemPresent>;
  details: string;
} {
  const backendIds = input.backendShenSha.map((x) => x.id);
  const displayedIds = input.displayedResults.map((x) => x.id);

  const countCheck = validateCounts(
    input.backendShenSha.length,
    input.translatedResults.length,
    input.displayedResults.length
  );

  const itemCheck = validateEachItemPresent(backendIds, displayedIds);
  const passed = countCheck.valid && itemCheck.passed;

  return {
    passed,
    countCheck,
    itemCheck,
    details: passed ? '✅ 完全通過驗收' : '❌ 驗收失敗',
  };
}
