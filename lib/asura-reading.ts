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

  if (tenGodsMap['偏官'] >= 1) {
    declarations.push('我看你骨子裡帶著嗜血的殺伐之氣——七殺當道。這不是壞事，這是破陣的重戟。凡來犯者，以戰止戰！');
  }

  if (tenGodsMap['正官'] >= 1) {
    declarations.push('我看你生來便要號令三軍——正官是你的帥印。手握權威就得立起鐵血規矩，容不得宵小挑釁。');
  }

  if (tenGodsMap['傷官'] >= 1) {
    declarations.push('我看你狂傲反骨、專破舊規——傷官是撕裂平庸的利爪。才華不是用來討好人的，是用來讓對手臣服的。');
  }

  if (tenGodsMap['食神'] >= 1) {
    declarations.push('我看你深藏不露、外圓內剛——食神是暗藏的鋒芒。平時不爭，出招便定大局。');
  }

  if (tenGodsMap['偏財'] >= 1) {
    declarations.push('我看你野心滔天、志在掠奪——偏財是豪賭天下的底氣。看準戰機就全軍壓上，打一場漂亮的鯨吞戰！');
  }

  if (tenGodsMap['正財'] >= 1) {
    declarations.push('我看你步步為營、寸土必爭——正財是穩如泰山的城池。一城一池吃乾抹淨，絕不給敵人留生機。');
  }

  if (tenGodsMap['偏印'] >= 1) {
    declarations.push('我看你眼神極冷、孤絕脫俗——梟印是能照破虛偽的冷眼。別被凡夫俗子牽絆，獨行方能稱雄。');
  }

  if (tenGodsMap['正印'] >= 1) {
    declarations.push('我看你身披厚甲、底氣深重——正印是萬軍難破的城牆。但記住，仁慈是給弱者的恩賜，面對強敵唯有揮刀。');
  }

  if (tenGodsMap['比肩'] >= 1) {
    declarations.push('我看你戰意如山、寸步不退——比肩是死守陣地的硬骨。想從你手裡奪走地盤，除非從你身上踩過去。');
  }

  if (tenGodsMap['劫財'] >= 1) {
    declarations.push('我看你性烈如火、敢搶敢爭——劫財是奪人旗號的兇刃。戰場上沒有客氣，看上的戰略要地親手搶回來！');
  }

  if (declarations.length === 0) {
    declarations.push('我看你命格深邃暗藏殺機，這盤局不是凡人能輕易看透的。');
  }

  // 取前三強烈特徵
  return declarations.slice(0, 3).join('  \n');
}

function generateShiPatternDeclaration(): string {
  return '戰局之上，沒有平白無故的安寧。你的命性格局是利刃出鞘之相，主動進攻才是最好的防禦。一切勝負，全憑你出手的剎那！';
}

function generateConflictForecast(tenGodsMap: Record<string, number>): string {
  const forecasts: string[] = [];

  if (tenGodsMap['正官'] > 0 && tenGodsMap['偏官'] > 0) {
    forecasts.push('官殺交鋒，內外皆敵。身邊從來不缺挑戰者，但這正是你立威的最好機會。先斬暗敵，再定陣腳！');
  }

  if (tenGodsMap['傷官'] > 0 && tenGodsMap['正官'] > 0) {
    forecasts.push('傷官撞正官，反骨直面鐵律。既然不屑平庸的世俗規則，那就用實力自立陣營，重新定義誰才是主人！');
  }

  if (tenGodsMap['正財'] > 0 && tenGodsMap['傷官'] > 0) {
    forecasts.push('才智與資源在戰局中劇烈激盪。言辭若太過狠辣便會傷及利益，收斂鋒芒，直取實利才是大將之道。');
  }

  if (tenGodsMap['偏印'] > 0 && tenGodsMap['食神'] > 0) {
    forecasts.push('梟神奪食，暗流試圖打亂你的節奏。關鍵命脈與資源必須牢牢抓在自己掌心，別輕信外人。');
  }

  if ((tenGodsMap['比肩'] > 0 || tenGodsMap['劫財'] > 0) && (tenGodsMap['正財'] > 0 || tenGodsMap['偏財'] > 0)) {
    forecasts.push('群雄爭食之局，周圍窺伺你利益的眼睛太多。把刀亮出來，讓對手知道越界要付出慘痛代價！');
  }

  if (forecasts.length === 0) {
    forecasts.push('你的命盤深沉如海，外敵不敢輕易犯境。你最大的對手不是別人，而是自己內心的猶豫與退縮！');
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
