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
 *
 * 核心設計：
 * - 過去：解剖式分析根源（為什麼會這樣）
 * - 現在：直白指控陷阱（你現在的真相）
 * - 未來：絕對預言結局（兩條路，選一條）
 * 每張卡片零重複、零通用、零模板
 */
export function renderTimelineWithAsuraVoice(
  timelineData: GhostAsuraTimelineResponse
): TimelineRenderedText {
  const { timeline, user, overallTrend } = timelineData;

  // ========== 過去卡片話術：解剖根源 ==========
  // 過去不是美麗的回憶，是問題的源頭。阿修羅要挖出為什麼。
  const pastFortuneLevel = timeline.past.calculation.fortuneLevel || 65;
  const pastElement = timeline.past.calculation.dominantElement || '木';
  const pastStar = timeline.past.calculation.chiefStar || '貴人';

  const pastInsight =
    pastFortuneLevel >= 70 ? '你當時運勢不錯，所以放鬆了警戒。那叫「溫水煮青蛙」。'
    : pastFortuneLevel >= 50 ? '你當時搖擺不定，既想進也想退。這才是問題的根源。'
    : '你當時窮途末路，被迫做選擇。有時候，絕望反而是清醒的開始。';

  const pastText = {
    title: `📜 過去：根源（${timeline.past.periodName}）`,
    opening: `你的${timeline.past.periodName}？我看得很清楚——根本不是運氣好壞，而是你選擇了什麼。\n\n${pastInsight}`,
    insight: `${pastElement}元素當時支配你的決策。你選了「${pastStar}」——\n但那個選擇，帶你走到現在的十字路口。\n\n這不是命運，是累積。`,
    lesson: `該學的功課很簡單：你當時的每一個退縮、每一個妥協，都在給現在的挑戰鋪路。\n\n所以別怨天尤人。過去的你，已經決定了現在的局面。`,
  };

  // ========== 現在卡片話術：直白陷阱 ==========
  // 現在不是舞台，是陷阱。阿修羅要指出你在哪裡被騙。
  const presentFortuneLevel = timeline.present.calculation.fortuneLevel || 78;
  const presentElement = timeline.present.calculation.dominantElement || '火';
  const presentStar = timeline.present.calculation.chiefStar || '熱情';

  const presentTrap =
    presentFortuneLevel >= 75 ? '你現在感覺幸運，所以掉以輕心。這叫「虛假繁榮」。真正的危機，藏在幸運底下。'
    : presentFortuneLevel >= 60 ? '你現在搖擺，感覺有機會也有風險。這種時候最容易做錯決定，因為你在賭。'
    : '你現在感覺被逼到角落。好，至少你清醒了。但別自暴自棄——這是逆轉的機會。';

  const presentPower =
    presentElement === '火' ? '焦躁、急進、容易衝動。這在某些時刻是優勢，在另一些時刻是致命傷。'
    : presentElement === '木' ? '執著、堅持、難以轉向。你走的路沒錯，但走過頭就要摔跤。'
    : presentElement === '水' ? '流動、適應、但也容易失去方向。現在你需要的不是柔軟，而是硬度。'
    : presentElement === '土' ? '穩定、信任、但也容易被困。你被自己的安心所困住。'
    : '金屬性：切割、決斷、但也容易傷人。小心別砍到自己。';

  const presentText = {
    title: `🔥 現在：陷阱（${timeline.present.periodName}）`,
    challenge: `你現在面對的${presentStar}？別被表面騙了。\n\n${presentTrap}\n\n我看到的真相是：你在一個分岔路口，而你還沒意識到自己在做選擇。`,
    strength: `唯一的優勢，就是${presentElement}元素給你的東西——${presentPower}\n\n但優勢也是陷阱。你必須學會在該用的時候用，不該用的時候收起來。\n\n這就是戰士的修為。`,
    action: `阿修羅不會跟你說「加油」或「相信自己」那種廢話。\n\n我只告訴你：現在就決定。不是「找到更多資訊再決定」，不是「等機會更明朗再決定」。\n\n就是現在。決定，然後承擔後果。`,
  };

  // ========== 未來卡片話術：分岔預言 ==========
  // 未來不是一條路，是兩條。阿修羅要看透你走哪條。
  const futureFortuneLevel = timeline.future.calculation.fortuneLevel || 85;
  const futureElement = timeline.future.calculation.dominantElement || '火';
  const futureStar = timeline.future.calculation.chiefStar || '機遇';

  const futurePath1 = futureFortuneLevel >= 80
    ? `如果你現在開始轉化，${timeline.future.periodName}你會遇到${futureStar}。\n那時候，${futureElement}的力量會成為你的利器，而不是絆腳石。\n幸運指數會升到${futureFortuneLevel}/100。`
    : `如果你現在做對選擇，${timeline.future.periodName}的路會比現在寬敞。\n但「比現在寬敞」不代表坦蕩。挑戰還是挑戰。\n幸運指數${futureFortuneLevel}/100——夠用，但不豐富。`;

  const futurePath2 = futureFortuneLevel >= 80
    ? `如果你現在選擇逃避或騙自己，${timeline.future.periodName}就會是監獄。\n${futureStar}會變成你的鎖鏈，${futureElement}的力量會反噬你。\n你會後悔，但後悔時已晚。`
    : `如果你現在什麼都不做，${timeline.future.periodName}你會被動地被改變。\n不是轉化，是摧毀。${futureStar}會變成你無法對抗的力量。`;

  const futureText = {
    title: `✨ 未來：分岔（${timeline.future.periodName}）`,
    opportunity: `${timeline.future.periodName}有兩條路。\n\n第一條：${futurePath1}`,
    warning: `\n\n第二條：${futurePath2}\n\n沒有第三條路。沒有「兩者都不選」。你不決定，命運會幫你決定。`,
    vision: `所以，${user.name}，阿修羅的話很直白：\n\n過去的根源，你改不了。\n現在的陷阱，你要看清。\n未來的分岔，你必須選。\n\n修羅道上，沒有旁觀者。你要麼是戰士，要麼是獵物。\n\n選擇吧。`,
  };

  // ========== 整體趨勢：命運的弧線 ==========
  const trajectoryText =
    overallTrend.trajectory === 'ascending'
      ? `向上的弧線——但別被假象迷惑，最陡峭的上升，往往在最深的谷底開始。你現在還在谷底。`
      : overallTrend.trajectory === 'descending'
        ? `向下的弧線——但阿修羅看透了：下降到底，就是反彈的開始。你現在在下坡，但下坡有終點。`
        : `循環的弧線——最危險的軌跡。因為你會以為「反正會回來」，所以不認真。結果某一圈，你沒回來。`;

  const summaryText = {
    trajectory: `你的人生軌跡是：${trajectoryText}`,
    finalMessage: `${user.name}，三時段已讀。\n\n過去養出了你的盲點。\n現在就是你轉身的時刻。\n未來，由你的決定決定。\n\n我不會祝你好運。好運是給被動等待的人。\n\n我只看著你，問一句：你敢嗎？\n\n敢，就開始。不敢，就別怨。\n\n——鬼魅阿修羅`,
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
