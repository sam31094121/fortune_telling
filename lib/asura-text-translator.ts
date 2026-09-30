/**
 * 阿修羅文字全轉譯 — 非神煞文本轉譯層
 * ============================================================================
 * 業主定案 2026-09-30：所有固定文本都改為鬼魅阿修羅版本
 *
 * 轉譯對象：
 *   ✅ 四柱描述（年月日時）
 *   ✅ 分類標籤（福氣、動能、提醒）
 *   ✅ 本命盤標題
 *   ✅ 卡片說明文字
 * ============================================================================
 */

/* ================================================================
   01｜四柱描述轉譯
   ================================================================ */

const PILLAR_DESCRIPTION_MAP: Record<string, string> = {
  // 傳統描述 → 阿修羅版本
  '年柱。祖上的氣。這是你的底色。': '年柱 ◇ 你的血脈帝國——祖先的戰爭遺產，刻在你的骨子裡。',
  '月柱。家門口的氣。這是你天天照面的局。': '月柱 ◇ 當下的戰場——每一天都在上演的局，沒有休戰日。',
  '日柱。貼身的氣。這是你最親近的人。': '日柱 ◇ 近身的對手——最親近的人，也是最容易傷你的刀。',
  '時柱。往外走的氣。這是你要去爭的世界。': '時柱 ◇ 遠方的領地——你要征服的世界，所有敵人都在那裡等。',

  // 簡化版本的轉譯
  '年柱': '年柱 ◆ 帝國之基',
  '月柱': '月柱 ◆ 當日戰火',
  '日柱': '日柱 ◆ 近身之敵',
  '時柱': '時柱 ◆ 征服的領地',
};

export function translatePillarDescription(original: string): string {
  return PILLAR_DESCRIPTION_MAP[original] ?? original;
}

/* ================================================================
   02｜分類標籤轉譯
   ================================================================ */

const CATEGORY_MAP: Record<string, string> = {
  // 傳統分類 → 阿修羅分類
  '福氣': '福曜系',
  '提醒': '戰警系',
  '動能': '戰力系',
  '破局': '破局系',

  // 完整版本
  '福氣系': '福曜戰序',
  '提醒系': '戰鬼警報',
  '動能系': '戰力激昂',
  '破局系': '陣局破壞',

  // 組合類別
  '行軍': '行軍戰線',
  '桃花': '魅力漩渦',
  '貴人': '戰神盟約',
  '化煞': '煞印鎮守',
  '權柄': '權力戰場',
  '書房': '智者秘殿',
};

export function translateCategory(original: string): string {
  return CATEGORY_MAP[original] ?? original;
}

/* ================================================================
   03｜本命盤標題和說明文字
   ================================================================ */

const CHART_TEXT_MAP: Record<string, string> = {
  // 卡片標題
  '四柱宣言': '⚔️ 四柱戰線',
  '四柱神煞': '⚔️ 四柱戰煞',
  '整盤陣法': '⚔️ 整盤戰陣',
  '整盤分析': '⚔️ 整盤戰局',

  // 卡片說明
  '易經老師': '📖 易經導師',
  '鬼魅老師': '👻 鬼魅引路',
  '阿修羅': '⚡ 戰神宣言',

  // 互動提示
  '展開': '⚔️ 激活',
  '更多': '⚔️ 全部戰譜',
  '完整敘述': '⚔️ 完整戰計',
  '摺疊': '⚔️ 封印',

  // 狀態提示
  '印記覺醒': '⚡ 戰印已激',
  '印記沉眠': '⚡ 戰印沉睡',
  '落印': '⚡ 煞星已命中',

  // 導航文本
  '回到頂部': '⚔️ 重返戰場',
  '返回': '⚔️ 撤退',
  '下一步': '⚔️ 進擊',
  '上一步': '⚔️ 退守',

  // 查詢相關
  '查詢命盤': '⚔️ 喚起戰譜',
  '分析完成': '⚔️ 戰局已定',
  '重新計算': '⚔️ 重啟戰場',
  '分享卡片': '⚔️ 分享戰譜',
  '下載': '⚔️ 銘刻印記',

  // 時間相關
  '今年': '⚔️ 本戰季',
  '明年': '⚔️ 下個戰季',
  '本月': '⚔️ 本戰月',
  '流年': '⚔️ 戰年',
};

export function translateChartText(original: string): string {
  return CHART_TEXT_MAP[original] ?? original;
}

/* ================================================================
   04｜完整的轉譯路由函式
   ================================================================ */

export function translateAsuraText(text: string, textType: 'pillar' | 'category' | 'ui'): string {
  switch (textType) {
    case 'pillar':
      return translatePillarDescription(text);
    case 'category':
      return translateCategory(text);
    case 'ui':
      return translateChartText(text);
    default:
      return text;
  }
}

/* ================================================================
   05｜批量轉譯（用於渲染時）
   ================================================================ */

export function translateAsuraUIBundle(ui: {
  pillarName?: string;
  categoryLabel?: string;
  title?: string;
  description?: string;
}): typeof ui {
  return {
    pillarName: ui.pillarName ? translatePillarDescription(ui.pillarName) : undefined,
    categoryLabel: ui.categoryLabel ? translateCategory(ui.categoryLabel) : undefined,
    title: ui.title ? translateChartText(ui.title) : undefined,
    description: ui.description ? translateChartText(ui.description) : undefined,
  };
}

/* ================================================================
   06｜確認清單
   ================================================================ */

export const TRANSLATION_COVERAGE = {
  pillarDescriptions: Object.keys(PILLAR_DESCRIPTION_MAP).length,
  categories: Object.keys(CATEGORY_MAP).length,
  chartTexts: Object.keys(CHART_TEXT_MAP).length,
  total: Object.keys(PILLAR_DESCRIPTION_MAP).length +
         Object.keys(CATEGORY_MAP).length +
         Object.keys(CHART_TEXT_MAP).length,
};
