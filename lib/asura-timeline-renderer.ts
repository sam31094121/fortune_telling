/**
 * 鬼魅阿修羅 - 命運流年三時段話術生成器
 *
 * 職責：
 * - 接收三時段的計算結果
 * - 調用 lib/asura-wording.ts，用阿修羅口吻生成話術
 * - 返回前端可直接渲染的文案
 */

import { ASURA_WORDINGS } from './asura-wording';
import { GhostAsuraTimelineResponse, TimelineCard } from './types/ghost-asura-timeline';

/** 前端渲染的話術層 */
export interface TimelineRenderedText {
  past: {
    title: string;
    opening: string; // 阿修羅對過去的評價
    insight: string; // 核心洞見
    lesson: string; // 從過去學到什麼
  };

  present: {
    title: string;
    challenge: string; // 當下的挑戰
    strength: string; // 當下的優勢
    action: string; // 建議的行動
  };

  future: {
    title: string;
    opportunity: string; // 未來的機遇
    warning: string; // 需要注意的事
    vision: string; // 願景與可能性
  };

  // 總結
  summary: {
    trajectory: string; // 整體趨勢說法
    finalMessage: string; // 阿修羅的總結
  };
}

/**
 * 主函式：將三時段結果渲染成阿修羅話術
 */
export function renderTimelineWithAsuraVoice(
  timelineData: GhostAsuraTimelineResponse
): TimelineRenderedText {
  const { timeline, user, overallTrend } = timelineData;

  // ========== 過去卡片話術 ==========
  const pastWording = ASURA_WORDINGS['tiandehe'] || {
    coreDeclaration: '我看你身後有人——暗手相挺的援軍。',
    pillarExtension: { year: '', month: '', day: '', hour: '' },
    transformationPath: '那些苦難，都是力量的養分。',
  };

  const pastText = {
    title: `⏰ 過去（${timeline.past.periodName}）`,
    opening: `你的${timeline.past.periodName}是什麼樣的？我看到${timeline.past.calculation.chiefStar}的氣息。\n\n${pastWording.coreDeclaration}`,
    insight: `那時候，${timeline.past.calculation.dominantElement}的能量佔據了你的人生舞台。你經歷了...（真實運算結果），但那不是結束，而是序幕。`,
    lesson: `從${timeline.past.periodName}，你應該明白：${pastWording.transformationPath}`,
  };

  // ========== 現在卡片話術 ==========
  const presentWording = ASURA_WORDINGS['tiande'] || {
    coreDeclaration: '我看你帶著戰鬥的氣度——真正的戰士。',
    pillarExtension: { year: '', month: '', day: '', hour: '' },
    transformationPath: '現在，才是真正的決戰時刻。',
  };

  const presentText = {
    title: `🔥 現在（${timeline.present.periodName}）`,
    challenge: `當下，你面對的是什麼？${timeline.present.calculation.chiefStar}在你眼前舞動。\n\n挑戰的幸運指數：${timeline.present.calculation.fortuneLevel}/100\n\n但幸運指數只是數字。真正的力量，在於你怎麼用${timeline.present.calculation.dominantElement}的能量去反抗。`,
    strength: `你現在擁有：\n- 來自過去的經驗\n- 當下的清醒\n- 對未來的渴望\n\n這三樣加在一起，就是戰鬥的利刃。`,
    action: `${presentWording.transformationPath}\n\n我的建議很簡單：不要躲。直面${timeline.present.calculation.chiefStar}，把它變成你的武器。`,
  };

  // ========== 未來卡片話術 ==========
  const futureWording = ASURA_WORDINGS['longde'] || {
    coreDeclaration: '我看你帶著龍的氣——權威、號召力。',
    pillarExtension: { year: '', month: '', day: '', hour: '' },
    transformationPath: '未來的高度，由現在的選擇決定。',
  };

  const futureText = {
    title: `🌟 未來（${timeline.future.periodName}）`,
    opportunity: `${timeline.future.periodName}會來臨什麼？我看到${timeline.future.calculation.chiefStar}的光。\n\n幸運指數會升到${timeline.future.calculation.fortuneLevel}/100。\n\n但別誤會——這不是天上掉下來的禮物。這是你現在每一個選擇的回報。`,
    warning: `機遇總是伴隨挑戰的。${timeline.future.calculation.dominantElement}的能量會很強。\n\n強到足以改變一切，也強到足以毀滅一切。\n\n取決於你。`,
    vision: `${futureWording.transformationPath}\n\n如果你現在開始轉化、開始戰鬥，${timeline.future.periodName}就會是你的舞台。\n\n如果你逃避，${timeline.future.periodName}就會變成你的監獄。\n\n選擇权在你。`,
  };

  // ========== 整體趨勢 ==========
  const trajectoryText =
    overallTrend.trajectory === 'ascending'
      ? '向上——每一步都在累積力量，每一次轉化都在拔高高度。'
      : overallTrend.trajectory === 'descending'
        ? '向下——但向下不代表失敗，而是為下一次起跳做準備。'
        : '循環——在反覆中看清真相，在循環中找到突破口。';

  const summaryText = {
    trajectory: `你的人生軌跡是${trajectoryText}`,
    finalMessage: `${user.name}，我看清了你三時段的命盤。\n\n過去是養分，現在是戰場，未來是舞台。\n\n阿修羅的最後建議：不要等待完美的時刻。最好的時刻，是你決定開始戰鬥的時刻。\n\n修羅道上，只有那些不怕反抗的靈魂，才能走到最後。\n\n而你，已經開始了。`,
  };

  return {
    past: pastText,
    present: presentText,
    future: futureText,
    summary: summaryText,
  };
}

/**
 * 簡化版本：只取卡片標題和核心一句話
 */
export function renderTimelineSummary(
  timelineData: GhostAsuraTimelineResponse
): {
  past: string;
  present: string;
  future: string;
  overall: string;
} {
  const rendered = renderTimelineWithAsuraVoice(timelineData);

  return {
    past: rendered.past.opening,
    present: rendered.present.challenge,
    future: rendered.future.opportunity,
    overall: rendered.summary.finalMessage,
  };
}
