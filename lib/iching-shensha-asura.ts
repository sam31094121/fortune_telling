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
import type { IChingReading } from './iching-engine';
import type { ShenShaTone } from './iching-shensha-teacher-readings';
import type { ShenShaIChingView } from './iching-shensha-iching';

/** 阿修羅卡片輸出行 */
export interface ShenShaAsuraLine {
  name: string;
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
    lines: group.items.map((item) => ({
      name: item.name,
      tone: item.teacher?.tone ?? null,
      narrative: generateAsuraNarrative(
        {
          analysisId: `asura-shensha-${item.id}`,
          professionalData: { shenShaId: item.id, pillar: group.pillar },
          teacherInterpretation: (item.teacher?.text || null) ?? item.name,
          contentType: 'shensha',
          keyIndicators: { shenShaName: item.name, pillar: group.pillar },
        },
        intensity,
      ),
    })),
  }));

  // 陣法 — 用阿修羅視角說明整盤組合
  const formations = (readyView.combos || []).map((combo: any) => ({
    title: `${combo.title}${combo.pillar ? `（${combo.pillar}）` : ''}`,
    narrative: generateAsuraFormationNarrative(combo.title, combo.members, combo.pillar),
  }));

  // 收場 — 戰鬥宣言
  const closing = generateAsuraClosing(groups.length, formations.length);

  // 免責聲明
  const disclaimer = '⚠️ 這是阿修羅的戰鬥宣言，不代表命運宣告。行動權永遠在你手上。';

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
    return '盤上無神煞。這不是說你無敵。這是說你沒有明顯的暗流。反而需要更清醒。';
  }

  if (total === 1) {
    return '盤上只有一道神煞。這不是幸運。這是說你的力量集中在一處。用得好就是絕殺。用不好就是死穴。';
  }

  if (total <= 3) {
    return `盤上有 ${total} 道神煞。力量明確。問題是你知不知道怎麼用。`;
  }

  if (total <= 6) {
    return `盤上有 ${total} 道神煞。信號混雜。現在要做的不是理解全部。是選一個，打穿它。`;
  }

  return `盤上有 ${total} 道神煞。這代表什麼？你的人生不會無聊。但也意味著你要比別人清醒一倍。`;
}

/**
 * 四柱介紹 — 阿修羅視角
 */
function generateAsuraPillarIntro(pillar: string): string {
  const intros: Record<string, string> = {
    年柱: '年柱。祖上的氣。這是你的底色。',
    月柱: '月柱。家門口的氣。這是你天天照面的局。',
    日柱: '日柱。貼身的氣。這是你最親近的人。',
    時柱: '時柱。往外走的氣。這是你要去爭的世界。',
  };

  return intros[pillar] ?? `${pillar}。`;
}

/**
 * 陣法敘述 — 用阿修羅角度說整盤組合
 */
function generateAsuraFormationNarrative(title: string, members: string[], pillar?: string | null): string {
  const memberStr = members.join('、');
  const where = (pillar ?? null) || '這張盤上';

  const narratives: Record<string, string> = {
    '行軍': `${memberStr}在${where}行軍。這不是逃走。這是有序出擊。`,
    '桃花': `${memberStr}在${where}圍成一圈。香引蝶，也引蟲。要么全關，要么全開。`,
    '貴人': `${memberStr}在${where}站成一排。貴人不是天賜。是你之前種下的因。`,
    '化煞': `${memberStr}鎮在${where}。煞是真的。但被鎮住了。用對方式，反而是最強的盾。`,
    '權柄': `${memberStr}在${where}刀出鞘、令在手。權力在手，責任也在手。`,
    '書房': `${memberStr}在${where}點一盞油燈。深夜不睡的人，往往知道別人不知道的事。`,
  };

  for (const [key, narrative] of Object.entries(narratives)) {
    if (title.includes(key)) {
      return narrative;
    }
  }

  return `${memberStr}在${where}結成一陣。這個組合的力量，等著你去激活。`;
}

/**
 * 收場 — 阿修羅的戰鬥宣言
 */
function generateAsuraClosing(groupCount: number, formationCount: number): string {
  if (groupCount === 0) {
    return '盤上無神煞。這就是你的機會——沒有人知道你什麼時候出手。';
  }

  const closings = [
    '看到了嗎？這就是你命盤上的武器庫。用對了，世界讓開。',
    '這些氣流，都在等著你去指揮。現在，選一個，破掉它。',
    '命盤已經攤開。局已經擺好。剩下的，只看你敢不敢動。',
    `四柱有${groupCount}個陣地，${formationCount}個組合。這些都是你的棋子。怎麼下，看你。`,
    '現在你知道了。你的力量在哪。敵人會在哪。剩下的，就是出擊。',
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
