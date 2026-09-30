/**
 * 阿修羅名稱轉譯層
 * ============================================================================
 * 核心規則：後端保留原始神煞 + 正統算法
 *         前端全部用本表轉譯成「鬼魅阿修羅」語言
 *
 * 可無限擴展：17項 → 200項 → 300項，同一套規則
 * 添加新神煞：只需在 ASURA_NAME_MAP 加一行映射，自動生效
 */

/**
 * 阿修羅正式名稱映射表
 * key = 正統神煞原始名稱
 * value = 鬼魅阿修羅專用名稱
 */
export const ASURA_NAME_MAP: Record<string, string> = {
  // 第一批（已驗證）
  '天德合': '天赦神契',
  '驛馬': '逐界行者',
  '隔角': '孤界之門',
  '金匱': '玄金寶庫',
  '五鬼': '五陰纏影',
  '沐浴': '洗魂之境',
  '日破': '裂日之痕',
  '天狗': '噬天之影',
  '災煞': '劫境之門',
  '月破': '碎月之痕',
  '將星': '鎮軍之魂',
  '龍德': '天龍護命',
  '六厄': '六劫之關',
  '元辰': '幽辰之障',
  '羊刃': '血刃之鋒',
  '桃花': '魅生之印',
  '外桃花': '界外魅緣',

  // 預留位置（後續擴充）
  // 第二批、第三批... 按同一套規則添加即可
};

/**
 * 轉譯神煞名稱 — 原始名 → 鬼魅阿修羅名
 *
 * 規則：
 * 1. 若在映射表中 → 返回阿修羅名
 * 2. 若不在映射表 → 返回原始名（向下相容）
 * 3. 未來擴充新神煞 → 只需加入映射表，無需改此函式
 */
export function translateToAsuraName(originalName: string): string {
  return ASURA_NAME_MAP[originalName] ?? originalName;
}

/**
 * 批量轉譯 — 用於卡片內容整理
 */
export function translateMultipleNames(names: string[]): string[] {
  return names.map(translateToAsuraName);
}

/**
 * 檢查是否已映射 — 用於後端驗證轉譯完整度
 */
export function isNameMapped(originalName: string): boolean {
  return originalName in ASURA_NAME_MAP;
}

/**
 * 統計覆蓋率 — 用於監控轉譯完整度
 * 回傳：{ total: 全部神煞數, mapped: 已映射數, coverage: 覆蓋率 }
 */
export function getNameMapCoverage(allOriginalNames: string[]): {
  total: number;
  mapped: number;
  coverage: number;
} {
  const mapped = allOriginalNames.filter(isNameMapped).length;
  return {
    total: allOriginalNames.length,
    mapped,
    coverage: allOriginalNames.length > 0 ? Math.round((mapped / allOriginalNames.length) * 100) : 0,
  };
}
