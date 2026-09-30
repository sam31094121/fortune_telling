/**
 * 阿修羅完整解盤引擎 — 後端產出、前端零編結論
 * ============================================================================
 * 角色：阿修羅本人直面命盤，用三千年戰神的口吻說真話
 * 承諾：霸氣 × 霸道 × 好戰心 — 不溫柔、不退縮、不妥協
 * 規則：只有後端能生成話術，前端只負責照印
 *
 * 業主定案 2026-09-30：
 * 「把『鬼魅阿修羅』卡片完全阿修羅化」
 * 「八字、紫微、神煞、易經全部用阿修羅的口吻重新唱一遍」
 * 「後端運算、前端只顯示」
 * ============================================================================
 */

import type { BaziPillars } from './bazi-engine';
import type { ShenShaIChingView } from './iching-shensha-iching';

/**
 * 阿修羅的八字宣言 — 十神視角
 */
export interface AsuraBaziCoreDeclaration {
  /** 第一人稱宣言 — 直接說你的十神組合代表什麼 */
  tenGodDeclaration: string;
  /** 格局宣言 — 你的強弱局面是什麼 */
  shiPattern: string;
  /** 衝突預告 — 你會遇上什麼類型的對手 */
  conflictForecast: string;
}

/**
 * 阿修羅的紫微定位 — 宮位視角
 */
export interface AsuraZiweiPositioning {
  /** 你的位置 — 宮位含義轉化為戰場位置 */
  position: string;
  /** 盟友與對手 — 誰會跟你在這個位置衝突 */
  enemies: string;
  /** 權力邊界 — 你能控制什麼、控制不了什麼 */
  boundary: string;
}

/**
 * 阿修羅完整解盤視圖
 */
export interface AsuraReadingView {
  state: 'READY' | 'BLOCKED';
  baziDeclaration?: AsuraBaziCoreDeclaration;
  ziweiPositioning?: AsuraZiweiPositioning;
  shenShaView?: ShenShaIChingView;
  disclaimer: string;
}

/**
 * 八字層 — 十神與格局的阿修羅宣言
 */
export function buildAsuraBaziDeclaration(pillars: BaziPillars): AsuraBaziCoreDeclaration {
  const tenGodsMap = analyzeTenGods(pillars);
  const tenGodDeclaration = generateTenGodDeclaration(tenGodsMap);
  const shiPattern = generateShiPatternDeclaration();
  const conflictForecast = generateConflictForecast(tenGodsMap);

  return { tenGodDeclaration, shiPattern, conflictForecast };
}

function analyzeTenGods(pillars: BaziPillars): Record<string, number> {
  const tenGods: Record<string, number> = {
    正官: 0, 偏官: 0, 正財: 0, 偏財: 0,
    食神: 0, 傷官: 0, 正印: 0, 偏印: 0,
    比肩: 0, 劫財: 0,
  };

  Object.values(pillars).forEach((pillar) => {
    if (pillar.stemTenGod) tenGods[pillar.stemTenGod] = (tenGods[pillar.stemTenGod] || 0) + 1;
    pillar.hiddenStems?.forEach((stem) => {
      if (stem.tenGod) tenGods[stem.tenGod] = (tenGods[stem.tenGod] || 0) + 1;
    });
  });

  return tenGods;
}

function generateTenGodDeclaration(tenGodsMap: Record<string, number>): string {
  const declarations: string[] = [];

  if (tenGodsMap['偏官'] >= 2) {
    declarations.push('我看你身上帶著反叛的氣——偏官在你的命盤裡佔上風。這不是缺點，這是武器。');
  }

  if (tenGodsMap['正官'] >= 2) {
    declarations.push('我看你天生就要統御他人——正官是你的權威。但權威越大，挑戰者越多。');
  }

  if (tenGodsMap['傷官'] >= 2) {
    declarations.push('我看你的言論與才華會得罪人——傷官就是這個性質。用這個去戰鬥，不要怕被討厭。');
  }

  if (tenGodsMap['偏財'] >= 2) {
    declarations.push('我看你對錢有野心，但也容易被錢迷惑——偏財就是投機與冒險。押注前要清楚代價。');
  }

  if (declarations.length === 0) {
    declarations.push('我看你的十神組合帶著某種矛盾——這正是有趣的地方。');
  }

  return declarations.join('  \n');
}

function generateShiPatternDeclaration(): string {
  return '你的命格中存在著某種平衡與衝突。一切取決於你怎麼出手。';
}

function generateConflictForecast(tenGodsMap: Record<string, number>): string {
  const forecasts: string[] = [];

  if (tenGodsMap['正官'] > 0 && tenGodsMap['偏官'] > 0) {
    forecasts.push('你的命盤裡正官和偏官在較勁——這代表你會遇上「權力爭奪戰」。對手是誰？往往是和你一樣強勢的人。');
  }

  if (tenGodsMap['正財'] > 0 && tenGodsMap['傷官'] > 0) {
    forecasts.push('你的命盤裡正財和傷官在衝突——這代表你的理性和你的言論會打架。');
  }

  if (forecasts.length === 0) {
    forecasts.push('你的命盤裡沒有明顯的十神衝突。這代表你的敵人不是命盤決定的，而是你自己吸引來的。');
  }

  return forecasts.join('  \n');
}

/**
 * 紫微定位 — 你的位置與敵人
 */
export function buildAsuraZiweiPositioning(): AsuraZiweiPositioning {
  return {
    position: '你在紫微斗數裡站上了舞台。讓所有人都看得見。',
    enemies: '來這個位置挑戰你的人，往往是能力相當的對手。他們會針對你的弱點。',
    boundary: '認清你的權力邊界：你能統御什麼，但統御不了什麼。這決定了你能打什麼仗。',
  };
}

/**
 * 完整解盤組裝
 */
export function buildAsuraReading(
  pillars: BaziPillars,
  shenShaView: ShenShaIChingView,
): AsuraReadingView {
  return {
    state: 'READY',
    baziDeclaration: buildAsuraBaziDeclaration(pillars),
    ziweiPositioning: buildAsuraZiweiPositioning(),
    shenShaView,
    disclaimer: '⚠️ 這是阿修羅的話術解讀，不代表命運宣告。行動權永遠在你手上。',
  };
}
