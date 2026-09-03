/**
 * 紅鸞心動・易經層（2026-09-03）
 *
 * 把已凍結的八字／紫微證據，接到全站既有的易經素材上：
 * `castHexagramFromBirth`（梅花易數生辰起卦）、`patternNameOf`（64 格局名）、
 * `buildEmpathicFromHexagram`（剝洋蔥共感話術）。
 *
 * 依 docs/iching-skill-manual.md：
 * - §二　生辰以梅花易數起卦，決定性、可回查
 * - §十一 同一模組的卦象與共感層必須是同一顆卦
 * - §七　前端只顯示「易經」二字
 *
 * 本層只負責「怎麼說」。哪幾個月、哪個方向，全部來自 red-luan-heartbeat-engine
 * 的確定性規則；這裡不新增任何規則，也不改寫任何證據。
 */

import { castHexagramFromBirth, type IChingReading } from './iching-engine';
import { buildEmpathicFromHexagram, patternNameOf } from './iching-psychology';
import type { RedLuanAffinityProfile, RedLuanMonthlyRhythm } from './red-luan-heartbeat-engine';

export type RedLuanIChingReading = {
  hexagram: {
    name: string;
    kingWen: number;
    glyph: string;
    upperName: string;
    lowerName: string;
    upperSymbol: string;
    lowerSymbol: string;
    changingLine: number;
    essence: string;
    judgment: string;
    advice: string;
  };
  /** 64 格局名，例如「焰照懷珠格」。 */
  patternName: string;
  /** 卜卦儀式開場（手機溫度感應 → 靜心 → 卦成 → 特殊格局）。 */
  ritualOpening: string;
  /** 天人勾動地火：天＝流月天時、人＝本命根基、地＝方位生肖、火＝心動的那一下。 */
  spark: {
    title: string;
    heaven: string;
    human: string;
    earth: string;
    fire: string;
  };
  /** 剝洋蔥四層＋核心，沿用共感引擎；同一顆卦。 */
  onion: Array<{ layer: string; text: string }>;
  closing: string;
  /** 起卦依據，可回查驗算。 */
  seedText: string;
};

function monthPhrase(month: RedLuanMonthlyRhythm) {
  return `${month.lunarLabel}（${month.jieqi}起，${month.gregorianHint}）`;
}

/**
 * 起一顆卦，把月份與有緣方向講成客戶聽得懂的話。
 * hexagram 由生辰決定，因此同一個人永遠同一卦——可回查、可驗算。
 */
export function buildRedLuanIChingReading(input: {
  name: string;
  birthDate: string;
  shichenIndex?: number | null;
  year: number;
  peakMonths: RedLuanMonthlyRhythm[];
  affinity: RedLuanAffinityProfile;
}): RedLuanIChingReading {
  const hexagram: IChingReading = castHexagramFromBirth(input.birthDate, input.shichenIndex ?? null);
  const empathic = buildEmpathicFromHexagram(input.name, hexagram);
  const patternName = patternNameOf(hexagram);

  const months = input.peakMonths.length > 0
    ? input.peakMonths.map(monthPhrase).join('、')
    : '今年十二個節氣月裡，這組規則都沒有命中';
  // 同一個地支可能同時是天喜與桃花，講給客戶聽時只講一次。
  const uniqueBranches = input.affinity.branches.filter(
    (row, index, all) => all.findIndex((item) => item.branch === row.branch) === index,
  );
  const directions = [...new Set(uniqueBranches.map((row) => row.direction))];
  const traits = uniqueBranches.slice(0, 2).map((row) => row.trait);
  const starTraits = input.affinity.spouseStars.slice(0, 2).map((row) => row.trait);

  const heaven = input.peakMonths.length > 0
    ? `【天】流月天時：${input.year} 年的 ${months}，流月地支正好踩中你命盤的紅鸞、天喜、桃花或貴人位——這幾個月是你今年最容易被勾動的窗口。`
    : `【天】流月天時：${input.year} 年這十二個節氣月，紅鸞、天喜、桃花與貴人規則都沒有命中你的月支。今年的節奏在「養」不在「動」，不是沒有機會，是機會不從時間這一路來。`;

  const human = `【人】本命根基：你的卦是${hexagram.hexagramName}（第${hexagram.kingWen}卦 ${hexagram.glyph}），上${hexagram.upper.nature}下${hexagram.lower.nature}——外顯是${hexagram.upper.attribute}，底盤是${hexagram.lower.attribute}。六十四格裡就這一格是你：「${patternName}」。`;

  const earth = uniqueBranches.length > 0
    ? `【地】有緣方位：你的紅鸞、天喜、桃花與貴人落在 ${uniqueBranches.map((row) => `${row.branch}（屬${row.zodiac}）`).join('、')}，方位在 ${directions.join('、')}。容易對上頻率的，是${traits.join('；或是')}這一類的人。${starTraits.length > 0 ? `紫微夫妻宮再補一筆：${starTraits.join('、')}。` : ''}`
    : '【地】有緣方位：本命四柱未見這組神煞現位，方位這一路先不強斷。';

  const fire = `【火】勾動的那一下：動爻落在第${hexagram.changingLine}爻（${hexagram.changingLine <= 3 ? `下卦${hexagram.lower.name}` : `上卦${hexagram.upper.name}`}）。${hexagram.essence}——${hexagram.advice}`;

  return {
    hexagram: {
      name: hexagram.hexagramName,
      kingWen: hexagram.kingWen,
      glyph: hexagram.glyph,
      upperName: hexagram.upper.name,
      lowerName: hexagram.lower.name,
      upperSymbol: hexagram.upper.symbol,
      lowerSymbol: hexagram.lower.symbol,
      changingLine: hexagram.changingLine,
      essence: hexagram.essence,
      judgment: hexagram.judgment,
      advice: hexagram.advice,
    },
    patternName,
    ritualOpening: empathic.greeting,
    spark: { title: '天人勾動地火', heaven, human, earth, fire },
    onion: [
      { layer: '第一層｜人格外殼', text: empathic.iKnowYourSurface },
      { layer: '第二層｜殼下的自我', text: empathic.iKnowYourInside },
      { layer: '第三層｜此刻的心思', text: empathic.iKnowYourMindNow },
      { layer: '第四層｜外冷內熱', text: empathic.specialYou },
      { layer: '核心｜那不是你的錯', text: empathic.absolution },
    ],
    closing: empathic.closing,
    seedText: hexagram.seedText,
  };
}
