/**
 * 鬼魅阿修羅 - 前端話術生成器
 *
 * 職責：
 * - 接收後端計算結果（GhostAsuraCalculationResponse）
 * - 調用 lib/asura-wording.ts 的話術庫
 * - 生成完整的阿修羅風格話術
 * - 返回給前端元件呈現
 */

import { ASURA_WORDINGS } from './asura-wording';
import { GhostAsuraCalculationResponse } from './types/ghost-asura-calculation';

/** 前端生成的話術層 */
export interface AsuraRenderedText {
  // 八字話術
  baziDeclaration: string;
  baziPillarTexts: Record<'year' | 'month' | 'day' | 'hour', string>;

  // 神煞話術
  shenShaTexts: Array<{
    id: string;
    name: string;
    pillarText: string;
    transformationText: string;
  }>;

  // 整盤組合話術
  combinationInsight: string;

  // 易經話術
  ichingInterpretation: string;

  // 老師總結
  teacherOpening: string;
  teacherMainInsight: string;
  teacherGuidance: string;
  teacherClosing: string;
}

/**
 * 主函式：將計算結果渲染成阿修羅話術
 */
export function renderGhostAsuraVoice(
  calculationData: GhostAsuraCalculationResponse
): AsuraRenderedText {
  const { bazi, shensha, iching, user } = calculationData;

  // 提取日主（用於話術查詢）
  const dayMaster = bazi.pillars[2]; // 日柱
  const dayMasterStem = dayMaster.stem; // 日天干

  // ========== 八字話術 ==========
  const baziWording = ASURA_WORDINGS[dayMasterStem] || {
    coreDeclaration: '我看你身上有特別的氣度——戰士的覺知。',
    pillarExtension: {
      year: '年柱象徵根源。',
      month: '月柱象徵環境。',
      day: '日柱象徵你的本質。',
      hour: '時柱象徵去向。',
    },
    transformationPath: '轉化的路，往往在反抗中找到。',
  };

  const baziPillarTexts: Record<'year' | 'month' | 'day' | 'hour', string> = {
    year: `【年柱 ${bazi.pillars[0].stem}${bazi.pillars[0].branch}】${
      baziWording.pillarExtension.year || '家族影響你的根源。'
    }`,
    month: `【月柱 ${bazi.pillars[1].stem}${bazi.pillars[1].branch}】${
      baziWording.pillarExtension.month || '環境塑造你的格局。'
    }`,
    day: `【日柱 ${bazi.pillars[2].stem}${bazi.pillars[2].branch}】${
      baziWording.pillarExtension.day || '你的本質在此刻顯現。'
    }`,
    hour: `【時柱 ${bazi.pillars[3].stem}${bazi.pillars[3].branch}】${
      baziWording.pillarExtension.hour || '未來的種子在此埋下。'
    }`,
  };

  // ========== 神煞話術 ==========
  const shenShaTexts = shensha.items
    .map((item) => {
      const wording = ASURA_WORDINGS[item.id];
      if (!wording) return null;

      return {
        id: item.id,
        name: item.name,
        pillarText:
          wording.pillarExtension[item.pillar as keyof typeof wording.pillarExtension] ||
          `${item.name}在${item.pillar}展現其力量。`,
        transformationText: wording.transformationPath || '轉化這股力量，方能超越。',
      };
    })
    .filter((item) => item !== null) as Array<{
    id: string;
    name: string;
    pillarText: string;
    transformationText: string;
  }>;

  // ========== 整盤組合話術 ==========
  // 根據神煞數量和類型生成組合洞見
  const positiveCount = shensha.items.filter(
    (item) => ASURA_WORDINGS[item.id]?.tone === 'blessing'
  ).length;
  const negativeCount = shensha.items.filter(
    (item) => ASURA_WORDINGS[item.id]?.tone === 'reminder'
  ).length;

  let combinationInsight = '';
  if (positiveCount > negativeCount) {
    combinationInsight = `你的整盤透著福氣 — 但福氣不是逃避的理由，而是更大舞台的邀請。${positiveCount} 股福星交織，形成了你天生的優勢。現在問題是：你準備好用這些優勢去戰鬥了嗎？`;
  } else if (negativeCount > positiveCount) {
    combinationInsight = `你的整盤洋溢著挑戰 — 但挑戰不是詛咒，而是靈魂的磨刀石。${negativeCount} 道困境等著你轉化。每一次轉化，都是一次修煉。`;
  } else {
    combinationInsight = `你的命盤在福氣與挑戰之間找到了平衡。這不是平凡，而是戰場上最清醒的位置 — 既能感知福運，也不被幸運所迷。`;
  }

  // ========== 易經話術 ==========
  const ichingWording = `你所得卦象是【${iching.result.hexagram}. ${iching.result.name}】卦。\n\n在易經的語言裡，這個卦象告訴你：現在正是覺醒的時刻。卦象與你的命盤相呼應 — 命運在邀請你，去做只有你能做的選擇。`;

  // ========== 老師話術 ==========
  const teacherOpening = `你好，${user.name}。我是鬼魅阿修羅。今天我直面你的命盤，用三千年戰神的眼光，看清你靈魂的樣貌。`;

  const teacherMainInsight = `你的命盤不是溫順的湖，而是動盪的海。這不是詛咒 — 這是力量的象徵。\n\n${baziWording.coreDeclaration}\n\n你天生就具有轉化與反抗的潛質。無論生活給你什麼樣的考驗，你都有能力轉變它、超越它。`;

  const teacherGuidance = `接下來的日子裡，我建議你：\n\n1. 觀察你的模式，但不要被它們限制\n2. 在挑戰中尋找轉化的機會\n3. 相信直覺，但也驗證現實\n4. 為自己的選擇負責，同時寬恕你的過去\n\n這不是命運的指示，而是一份邀請 — 邀請你成為自己人生的設計者。`;

  const teacherClosing = `修羅道上，你已經開始覺醒。\n\n在無常的世界裡，你擁有選擇的自由。在每個決定的時刻，問自己：這是我的靈魂真正想要的嗎？\n\n祝福你。\n— 鬼魅阿修羅`;

  return {
    baziDeclaration: baziWording.coreDeclaration,
    baziPillarTexts,
    shenShaTexts,
    combinationInsight,
    ichingInterpretation: ichingWording,
    teacherOpening,
    teacherMainInsight,
    teacherGuidance,
    teacherClosing,
  };
}

/**
 * 簡化版本：只取核心話術（用於卡片摘要）
 */
export function renderGhostAsuraSummary(
  calculationData: GhostAsuraCalculationResponse
): {
  title: string;
  subtitle: string;
  keyInsight: string;
} {
  const rendered = renderGhostAsuraVoice(calculationData);

  return {
    title: `${calculationData.user.name} 的命盤`,
    subtitle: `${calculationData.bazi.pillars[0].stem}${calculationData.bazi.pillars[0].branch}年 ${calculationData.shensha.items.length} 股神煞 × 【${calculationData.iching.result.hexagram}. ${calculationData.iching.result.name}】卦`,
    keyInsight: rendered.baziDeclaration,
  };
}
