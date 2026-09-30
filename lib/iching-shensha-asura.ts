/**
 * 《神煞易經》阿修羅卡片 — 敘事層版（後端運算，前端零編結論）
 * ============================================================================
 * 業主定案 2026-09-30：「全部修改為阿修羅版」
 *
 * 完全用阿修羅敘事層引擎生成話術
 * 五層結構：破/鎖/斷/立/行
 * 三種強度：冷/狠（預設）/霸
 *
 * 數據流：
 *   同一張盤、同一組神煞、同一個生辰卦
 *   只改話術層，不改排盤資料
 *   後端運算 → 前端零編結論
 * ============================================================================
 */

import { generateAsuraNarrative, type AsuraNarrativeOutput, type AsuraIntensityLevel } from './asura-narrative-engine';
import { translateToAsuraName } from './ghost-asura-registry';
import type { IChingReading } from './iching-engine';
import type { ShenShaTone } from './iching-shensha-teacher-readings';
import type { ShenShaIChingView } from './iching-shensha-iching';

/** 阿修羅卡片輸出行 */
export interface ShenShaAsuraLine {
  originalName: string;
  displayName: string;
  tone: ShenShaTone | null;
  /** 敘事層產出的五層結構 */
  narrative: AsuraNarrativeOutput;
}

/** 阿修羅卡片完整視圖 */
export type ShenShaAsuraView =
  | {
      state: 'READY';
      /** 開場宣言 — 阿修羅本人的第一句 */
      opening: string;
      /** 四柱神煞組 */
      groups: { pillar: string; intro: string; lines: ShenShaAsuraLine[] }[];
      /** 整盤陣法 */
      formations: { title: string; narrative: string }[];
      /** 收場 — 最後的戰鬥宣言 */
      closing: string;
      /** 免責聲明 */
      disclaimer: string;
    }
  | { state: 'BLOCKED'; reason: string };

/**
 * 構建阿修羅卡片 — 純敘事層版本
 *
 * 輸入：已驗證的神煞視圖 + 易經卦象
 * 輸出：用阿修羅話術層轉換的卡片內容
 */
export function buildShenShaAsura(view: ShenShaIChingView, hexagram: IChingReading | null, intensity: AsuraIntensityLevel = 'LEVEL_2_HARSH'): ShenShaAsuraView {
  // 類型守衛
  if (view.state !== 'READY' || !hexagram) {
    return {
      state: 'BLOCKED',
      reason: '四柱還沒對齊，卡片不能開。排盤未完成，無法生成阿修羅解讀。',
    };
  }

  // 從此處開始，view 被確認為 READY 狀態
  const readyView = view as any; // TypeScript 守衛後安全轉換

  // 開場 — 阿修羅本人的宣言
  const opening = generateAsuraOpening(readyView.items?.length || 0);

  // 四柱分組 — 每個神煞一份敘事層輸出
  const groups = readyView.groups?.map((group: any) => ({
    pillar: group.pillar,
    intro: generateAsuraPillarIntro(group.pillar),
    lines: group.items.map((item: any) => {
      const originalName = item.name;
      const displayName = translateToAsuraName(originalName);
      return {
        originalName,
        displayName,
        tone: item.teacher?.tone ?? null,
        narrative: generateAsuraNarrative(
          {
            analysisId: `asura-shensha-${item.id}`,
            professionalData: { shenShaId: item.id, pillar: group.pillar },
            teacherInterpretation: (item.teacher?.text || null) ?? originalName,
            contentType: 'shensha',
            keyIndicators: { shenShaName: originalName, pillar: group.pillar, intensity },
          },
          intensity,
        ),
      };
    }),
  }));

  // 陣法 — 用阿修羅視角說明整盤組合
  const formations = (readyView.combos || []).map((combo: any) => ({
    title: `${combo.title}${combo.pillar ? `（${combo.pillar}）` : ''}`,
    narrative: generateAsuraFormationNarrative(combo.title, combo.members, combo.pillar),
  }));

  // 收場 — 戰鬥宣言
  const closing = generateAsuraClosing(groups.length, formations.length);

  // 免責聲明
  const disclaimer = '⚡ 這是阿修羅的戰鬥宣言——不是預言，不是宿命，只是戰場的地圖。你的刀在你手上。';

  return {
    state: 'READY',
    opening,
    groups,
    formations,
    closing,
    disclaimer,
  };
}

/**
 * 開場 — 阿修羅的第一句話
 */
function generateAsuraOpening(total: number): string {

  if (total === 0) {
    return '⚔️ 盤上無神煞——沒有明顯敵人，反而最危險。你要找的，是那些看不見的刀。';
  }

  if (total === 1) {
    return '⚔️ 只有一道神煞。你的力量集中在一點。用好了是破城槌，用不好就是自殺刀。';
  }

  if (total <= 3) {
    return `⚔️ 盤上有 ${total} 道神煞。敵人明確。問題是你敢不敢正面迎戰。`;
  }

  if (total <= 6) {
    return `⚔️ 盤上有 ${total} 道神煞。信號混雜，戰局複雜。現在不是理解全部，而是選一個敵人，打穿他。`;
  }

  return `⚔️ 盤上有 ${total} 道神煞。這是什麼意思？這是說你的人生註定不會安寧。但這也代表你有 ${total} 個理由去戰鬥。`;
}

/**
 * 四柱介紹 — 阿修羅視角
 */
function generateAsuraPillarIntro(pillar: string): string {
  const intros: Record<string, string> = {
    年柱: '年柱 ◇ 你的血脈帝國——祖先的戰爭遺產，刻在你的骨子裡。',
    月柱: '月柱 ◇ 當下的戰場——每一天都在上演的局，沒有休戰日。',
    日柱: '日柱 ◇ 近身的對手——最親近的人，也是最容易傷你的刀。',
    時柱: '時柱 ◇ 遠方的領地——你要征服的世界，所有敵人都在那裡等。',
  };

  return intros[pillar] ?? `${pillar} ◇ 戰局在此。`;
}

/**
 * 陣法敘述 — 用阿修羅角度說整盤組合
 */
function generateAsuraFormationNarrative(title: string, members: string[], pillar?: string | null): string {
  const memberStr = members.join('、');
  const where = (pillar ?? null) || '這張盤上';

  const narratives: Record<string, string> = {
    '行軍': `⚔️ ${memberStr}在${where}行軍——不是潰逃，是戰術調動。節奏、秩序、力量。這是專業的打法。`,
    '桃花': `⚔️ ${memberStr}在${where}圍成一圈——香氣引來蝴蝶，也引來蒼蠅。你得決定：全部關掉，還是全部打爆。`,
    '貴人': `⚔️ ${memberStr}在${where}站成一排——這不是天賜的幸運，是你過去種下的因。現在該收割了。`,
    '化煞': `⚔️ ${memberStr}鎮在${where}——煞氣是真實的，但也被鎖死了。用對方法，反而成為最銳利的刀。`,
    '權柄': `⚔️ ${memberStr}在${where}刀已出鞘、令已在手。權力不只是榮耀，是責任。也是戰爭。`,
    '書房': `⚔️ ${memberStr}在${where}點起一盞燈——夜裡不睡的人，往往看穿了別人看不見的戰局。`,
  };

  for (const [key, narrative] of Object.entries(narratives)) {
    if (title.includes(key)) {
      return narrative;
    }
  }

  return `⚔️ ${memberStr}在${where}結成一陣——這個組合就是你的致命武器。問題是，你敢不敢用。`;
}

/**
 * 收場 — 阿修羅的戰鬥宣言
 */
function generateAsuraClosing(groupCount: number, formationCount: number): string {
  if (groupCount === 0) {
    return '⚡ 盤上無神煞——沒有明顯的敵人，反而給了你最大的自由。沒人知道你什麼時候亮刀。';
  }

  const closings = [
    '⚡ 看清楚了嗎？這就是你的武器庫。用對了，世界會為你讓路。不用對，你會成為自己的敵人。',
    '⚡ 這些力量都在等著你去揮霍。現在選一個敵人，打穿他。不要等，不要想，就是打。',
    '⚡ 命盤已經攤開——這是你的戰場地圖。剩下的，全看你敢不敢真的動。',
    `⚡ 四柱有 ${groupCount} 個陣地，${formationCount} 個組合——都是你的武器。現在問題是，你怎麼用它們去贏。`,
    '⚡ 你已經看清了。你的力量在哪，敵人在哪，上風口在哪。現在沒有藉口了。該出擊了。',
  ];

  return closings[Math.floor(Math.random() * closings.length)];
}

/**
 * 實例化阿修羅卡片
 *
 * 對標 GHOST_SEALED，阿修羅卡片預設可見
 */
export const ASURA_SEALED = false;

export function isAsuraCardAvailable(): boolean {
  return !ASURA_SEALED;
}
