/**
 * 鬼魅阿修羅轉譯層 — 工程師專用版
 *
 * 核心原則：後端神煞數量 = 轉譯數量 = 前端顯示數量
 *
 * 固定中文映射對齊附件「四」／lib/asura-name-map.ts／lib/ghost-asura-registry.ts
 * 本檔自洽（無相對 import），避免 node 完整度測試解析失敗。
 */

/** 附件「四」中文固定映射 + 羅馬拼音別名 */
export const FIXED_SHENSHA_MAP: Record<string, string> = {
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

  // 羅馬拼音別名（相容）
  tiandehe: '天赦神契',
  tiande: '天德護印',
  yuede: '月德靈契',
  longde: '天龍護命',
  jinkui: '玄金寶庫',
  tiangou: '噬天之影',
  wugui: '五陰纏影',
  zaisha: '劫境之門',
  liue: '六劫之關',
  yuanchen: '幽辰之障',
  muyu: '洗魂之境',
  yuepo: '碎月之痕',
  ripo: '裂日之痕',
  jiangxing: '鎮軍之魂',
  yima: '逐界行者',
  gejiao: '孤界之門',
  tianshu: '天樞禁印',
  tian_e: '裂天劫印',
  tiansha: '裂天劫印',
  yangren: '血刃之鋒',
  taohua: '魅生之印',
  waiTaohua: '界外魅緣',
  tianyigui: '天乙神印',
  taijigui: '玄極天印',
  wenchanggui: '文魂天契',
  fuxinggui: '福曜護命',
  guoyingui: '鎮國之印',
  xuetang: '靈學之門',
  cigun: '文魄秘殿',
  tianchu: '天饗神庫',
  lushen: '玄祿寶印',
  tianyi: '天醫靈契',
  huagai: '孤華幽冠',
  jiesha: '劫魂之刃',
  wangshen: '亡影幽魂',
  baihuo: '白虎血印',
  baihu: '白虎血印',
  sangmen: '喪界幽門',
  piaomai: '麻衣冥印',
  pima: '麻衣冥印',
  guanchen: '孤辰絕界',
  guchen: '孤辰絕界',
  guashu: '寡宿幽宮',
  hongluan: '紅鸞魅印',
  tianxi: '天喜緣契',
  xiánchí: '魅池情印',
  xianchi: '魅池情印',
  hongyan: '緋艷魅魂',
  tongzi: '童靈之印',
  yinchayangcuo: '陰陽錯界',
  shie_defeat: '十敗劫印',
  shiedabai: '十敗劫印',
  kuigang: '魁罡戰魂',
  feirendao: '飛刃血痕',
  feiren: '飛刃血痕',
  liuxia: '流霞魅痕',
  tianluodiwang: '羅網禁界',
  xuerendao: '赤血刃印',
  xueren: '赤血刃印',
  gouliao: '勾魂絞界',
  goujiao: '勾魂絞界',
  kongwang: '虛界空印',
  diaoke: '弔魂之影',
};

const DYNAMIC_REGISTRY: Record<string, { displayName: string; category: string }> = {};

const EXTENSION_SYSTEM = {
  blessing: ['天', '神', '玄', '龍', '護', '命', '契', '印'],
  reminder: ['幽', '冥', '陰', '魂', '影', '障', '魘', '纏'],
  dynamic: ['劫', '裂', '碎', '破', '禁', '關', '境', '痕', '門'],
  edge: ['血', '刃', '鋒', '斬', '赤', '魄', '戰'],
  romance: ['魅', '緣', '情', '艷', '鸞', '花', '魂', '印'],
  power: ['鎮', '軍', '王', '帝', '令', '威', '權', '魂'],
  wealth: ['玄', '金', '寶', '庫', '藏', '宮', '匣', '祿'],
  movement: ['逐', '行', '越', '踏', '界', '境', '域', '途'],
  transform: ['洗', '蛻', '淨', '煉', '魂', '魄', '生', '境'],
} as const;

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function extendAsuraNameStable(
  originalName: string,
  category: 'blessing' | 'reminder' | 'dynamic'
): string {
  const system =
    EXTENSION_SYSTEM[category as keyof typeof EXTENSION_SYSTEM] || EXTENSION_SYSTEM.dynamic;
  const seed = stableHash(`${originalName}|${category}|1.0`);
  const char1 = system[seed % system.length];
  const char2 = system[(seed + 1) % system.length];

  let result = `${char1}${originalName}${char2}`;
  if (result.length > 8) {
    result = `${char1}${originalName.substring(0, 2)}${char2}`;
  }
  return result;
}

export function translateToAsuraName(
  originalName: string,
  category: 'blessing' | 'reminder' | 'dynamic' = 'dynamic'
): string {
  if (FIXED_SHENSHA_MAP[originalName]) {
    return FIXED_SHENSHA_MAP[originalName];
  }

  if (DYNAMIC_REGISTRY[originalName]) {
    return DYNAMIC_REGISTRY[originalName].displayName;
  }

  const generatedName = extendAsuraNameStable(originalName, category);
  DYNAMIC_REGISTRY[originalName] = {
    displayName: generatedName,
    category,
  };

  return generatedName;
}

export function validateCounts(
  backendCount: number,
  translatedCount: number,
  displayedCount: number
): {
  valid: boolean;
  backend: number;
  translated: number;
  displayed: number;
  message: string;
} {
  const valid = backendCount === translatedCount && translatedCount === displayedCount;

  return {
    valid,
    backend: backendCount,
    translated: translatedCount,
    displayed: displayedCount,
    message: valid
      ? `✅ PASSED: ${backendCount} = ${translatedCount} = ${displayedCount}`
      : `❌ FAILED: 後端 ${backendCount} ≠ 轉譯 ${translatedCount} ≠ 前端 ${displayedCount}`,
  };
}

export function validateEachItemPresent(
  backendIds: string[],
  displayedIds: string[]
): {
  valid: boolean;
  total: number;
  missing: string[];
  message: string;
} {
  const displayedSet = new Set(displayedIds);
  const missing = backendIds.filter((id) => !displayedSet.has(id));

  return {
    valid: missing.length === 0,
    total: backendIds.length,
    missing,
    message:
      missing.length === 0
        ? `✅ 全部 ${backendIds.length} 項都有顯示`
        : `❌ 缺少 ${missing.length} 項：${missing.join(', ')}`,
  };
}

export function assertCompleteTranslation(input: {
  backendShenSha: Array<{ id: string; originalName: string }>;
  translatedResults: Array<{ id: string; displayName: string }>;
  displayedResults: Array<{ id: string; displayName: string }>;
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
  const passed = countCheck.valid && itemCheck.valid;

  return {
    passed,
    countCheck,
    itemCheck,
    details: passed ? '✅ 通過' : '❌ 失敗',
  };
}
