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
import { buildConciseOnion, buildEmpathicFromHexagram, patternNameOf, type ConciseOnionLayer } from './iching-psychology';
import type { RedLuanAffinityProfile, RedLuanEncounter, RedLuanMonthlyRhythm } from './red-luan-heartbeat-engine';

/**
 * 姻緣因果層（今生來世）：以下卦（內核）取「上輩子相欠的是什麼」，
 * 動爻取「這一世會怎麼再遇上」。這是易經式的文化敘事與心理學重新框架，
 * 不是對前世的事實主張——底下綁的是真實心理機制，跟其他層一致。
 */
const KARMIC_BY_LOWER_TRIGRAM: Record<string, { owed: string; lesson: string }> = {
  乾: { owed: '像是上輩子你替人扛了太多，該你的位子讓了出去', lesson: '這一世要學的是：可以承擔，但不必獨自承擔' },
  兌: { owed: '像是上輩子有一句話沒說完，兩個人就散了', lesson: '這一世要學的是：把話說出口，不要再等對的時機' },
  離: { owed: '像是上輩子你一直照亮別人，沒有人回頭照亮你', lesson: '這一世要學的是：允許自己被看見、被照顧' },
  震: { owed: '像是上輩子你動得太快，還沒等到對方跟上就走遠了', lesson: '這一世要學的是：慢半拍，等一個能同行的人' },
  巽: { owed: '像是上輩子你太順著別人，把自己的方向讓掉了', lesson: '這一世要學的是：溫柔可以有，但方向要自己拿' },
  坎: { owed: '像是上輩子有一段沒渡過的險，你一個人撐了過去', lesson: '這一世要學的是：讓人幫你，不必每次都自己渡' },
  艮: { owed: '像是上輩子你在門前停住了，該靠近的那一步沒有跨', lesson: '這一世要學的是：界線守得住，也要記得開門' },
  坤: { owed: '像是上輩子你承接了所有人的重量，包括不屬於你的', lesson: '這一世要學的是：放下不是你的那一份' },
};

const KARMIC_REUNION_BY_LINE: Record<number, string> = {
  1: '這一世的重逢會從一個很平常的開頭開始——不是轟轟烈烈，是某個你差點錯過的日常場合',
  2: '這一世的重逢會發生在「有人終於聽懂你」的那一刻——你不用解釋，對方就接上了',
  3: '這一世的重逢會出現在你正責怪自己的時候——有人替你說了一句「那不是你的錯」',
  4: '這一世的重逢會來自一句你原本不打算說的話——說出口之後，路就開了',
  5: '這一世的重逢會在你累到想放下的時候出現——有人問你「你還好嗎」，而且是真的在問',
  6: '這一世的重逢會發生在你終於願意放手之後——手放開了，新的才進得來',
};

export const RED_LUAN_TEACHERS = ['asura'] as const;
export type RedLuanTeacher = (typeof RED_LUAN_TEACHERS)[number];

export type RedLuanTeacherReading = {
  key: RedLuanTeacher;
  name: string;
  tagline: string;
  /** 按鈕上的內容預告——客戶要知道按下去會拿到什麼，才會想按。 */
  preview: string;
  opening: string;
  /** 依序顯示時間、對象、同一顆卦與行動提醒。 */
  sections: Array<{ title: string; text: string }>;
  closing: string;
  sources: Array<{ title: string; reference: string }>;
};

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
  /** 心理學洋蔥：一層一句重點，不繞圈。同一顆卦。 */
  onion: ConciseOnionLayer[];
  closing: string;
  /** 姻緣因果：上輩子相欠、這一世再聚。文化敘事＋心理學重新框架，非事實主張。 */
  karmicBond: { title: string; owed: string; lesson: string; reunion: string; note: string };
  /** 保留既有陣列契約，本卡現在只提供阿修羅；來源另列。 */
  teachers: RedLuanTeacherReading[];
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
  /** 必填。紅鸞卡在無時辰時本來就不起卦（見 route.ts 的 selectedHour 判斷），型別一併鎖死。 */
  shichenIndex: number;
  year: number;
  peakMonths: RedLuanMonthlyRhythm[];
  /** 首屏用的「下一次」；老師必須引用同一個時間，不能各說各話。 */
  nextEncounter?: RedLuanEncounter | null;
  affinity: RedLuanAffinityProfile;
}): RedLuanIChingReading {
  const hexagram: IChingReading = castHexagramFromBirth(input.birthDate, input.shichenIndex);
  const empathic = buildEmpathicFromHexagram(input.name, hexagram);
  const patternName = patternNameOf(hexagram);

  // 優先用「下一次」，跟首屏同一個答案；沒有才退回整年高峰。
  const months = input.nextEncounter
    ? `${Number(input.nextEncounter.startsOn.slice(0, 4))} 年 ${Number(input.nextEncounter.startsOn.slice(5, 7))} 月（${input.nextEncounter.jieqi}起）`
    : input.peakMonths.length > 0
      ? `${input.year} 年 ${input.peakMonths.map(monthPhrase).join('、')}`
      : '今年十二個節氣月裡，這組規則都沒有命中';
  // 同一個地支可能同時是天喜與桃花，講給客戶聽時只講一次。
  const uniqueBranches = input.affinity.branches.filter(
    (row, index, all) => all.findIndex((item) => item.branch === row.branch) === index,
  );
  const directions = [...new Set(uniqueBranches.map((row) => row.direction))];
  const traits = uniqueBranches.slice(0, 2).map((row) => row.trait);
  const starTraits = input.affinity.spouseStars.slice(0, 2).map((row) => row.trait);

  const hasTiming = Boolean(input.nextEncounter) || input.peakMonths.length > 0;
  const heaven = hasTiming
    ? `【天】流月天時：時間落在${months}，流月地支正好踩中你命盤的紅鸞、天喜、桃花或貴人位——這是你下一個最容易被勾動的窗口。`
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
    onion: buildConciseOnion(hexagram),
    closing: empathic.closing,
    karmicBond: (() => {
      const karmic = KARMIC_BY_LOWER_TRIGRAM[hexagram.lower.name];
      return {
        title: '今生來世・上輩子相欠的那一筆',
        owed: `${karmic.owed}。`,
        lesson: `${karmic.lesson}。`,
        reunion: `${KARMIC_REUNION_BY_LINE[hexagram.changingLine] ?? KARMIC_REUNION_BY_LINE[2]}。`,
        note: '這是用來把「為什麼一直遇到同一種人」講成可以理解、也可以改寫的東西，不是對前世的事實陳述。',
      };
    })(),
    teachers: buildTeacherReadings({ hexagram, patternName, empathic, affinity: input.affinity, monthsPhrase: months, hasPeak: hasTiming, year: input.year }),
    seedText: hexagram.seedText,
  };
}

/**
 * 2026-10-28 業主批准：本卡改為單一阿修羅解說。
 * 僅重組已算出的月份、傳統對應與同一卦內容；不新增規則或提高來源狀態。
 * 開場／收尾逐字取自鬼魅阿修羅〈阿修羅脾氣系統〉現在卡與未來卡梗例。
 */
function buildTeacherReadings(input: {
  hexagram: IChingReading;
  patternName: string;
  empathic: ReturnType<typeof buildEmpathicFromHexagram>;
  affinity: RedLuanAffinityProfile;
  monthsPhrase: string;
  hasPeak: boolean;
  year: number;
}): RedLuanTeacherReading[] {
  const { hexagram, affinity } = input;
  return [{
    key: 'asura',
    name: '鬼魅阿修羅',
    tagline: '先講時間，再講對象。',
    preview: '點開，看時間、對象與行動提醒',
    opening: '別再繞了。',
    sections: [
      { title: '時間', text: input.hasPeak ? input.monthsPhrase :                 String(input.year) + ' 年沒有月份命中這組規則' },
      { title: '傳統對應的對象', text: affinity.onionLayers[0]?.headline || '暫時無法取得' },
      { title: '你的卦', text: hexagram.hexagramName + '・' + input.patternName + '。' + hexagram.essence },
      { title: '行動提醒', text: hexagram.advice },
    ],
    closing: '我先把話放這裡。你自己決定要不要踩。',
    sources: [
      { title: '阿修羅口吻', reference: 'docs/技能戰鬥檔案/鬼魅阿修羅/阿修羅脾氣系統.md：現在卡 STUBBORNNESS、未來卡梗例；只借口氣，不據此判斷客戶人格。' },
      { title: '時間與傳統對應', reference: '本次 nextEncounter／peakMonths 與 affinity；規則、取法及核對狀態見下方原有證據，不代表全部來源已核定。' },
      { title: '卦與行動提醒', reference: '本次同一顆生辰卦的 essence／advice，沿用既有易經層；不冒充另外起卦或紫微流年共同證實。' },
    ],
  }];
}
