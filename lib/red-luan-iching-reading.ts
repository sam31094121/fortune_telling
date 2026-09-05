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
import { buildConciseOnion, buildEmpathicFromHexagram, buildGhostDecoding, patternNameOf, type ConciseOnionLayer } from './iching-psychology';
import type { RedLuanAffinityProfile, RedLuanEncounter, RedLuanMonthlyRhythm } from './red-luan-heartbeat-engine';

/**
 * 姻緣因果層（今生來世）：以下卦（內核）取「上輩子相欠的是什麼」，
 * 動爻取「這一世會怎麼再遇上」。這是易經式的文化敘事與心理學重新框架，
 * 不是對前世的事實主張——底下綁的是真實心理機制，跟其他層一致。
 */
const KARMIC_BY_LOWER_TRIGRAM: Record<string, { owed: string; lesson: string }> = {
  乾: { owed: '上輩子你替人扛了太多，該你的位子讓了出去', lesson: '這一世要學的是：可以承擔，但不必獨自承擔' },
  兌: { owed: '上輩子有一句話沒說完，兩個人就散了', lesson: '這一世要學的是：把話說出口，不要再等對的時機' },
  離: { owed: '上輩子你一直照亮別人，沒有人回頭照亮你', lesson: '這一世要學的是：允許自己被看見、被照顧' },
  震: { owed: '上輩子你動得太快，還沒等到對方跟上就走遠了', lesson: '這一世要學的是：慢半拍，等一個能同行的人' },
  巽: { owed: '上輩子你太順著別人，把自己的方向讓掉了', lesson: '這一世要學的是：溫柔可以有，但方向要自己拿' },
  坎: { owed: '上輩子有一段沒渡過的險，你一個人撐了過去', lesson: '這一世要學的是：讓人幫你，不必每次都自己渡' },
  艮: { owed: '上輩子你在門前停住了，該靠近的那一步沒有跨', lesson: '這一世要學的是：界線守得住，也要記得開門' },
  坤: { owed: '上輩子你承接了所有人的重量，包括不屬於你的', lesson: '這一世要學的是：放下不是你的那一份' },
};

const KARMIC_REUNION_BY_LINE: Record<number, string> = {
  1: '這一世的重逢會從一個很平常的開頭開始——不是轟轟烈烈，是某個你差點錯過的日常場合',
  2: '這一世的重逢會發生在「有人終於聽懂你」的那一刻——你不用解釋，對方就接上了',
  3: '這一世的重逢會出現在你正責怪自己的時候——有人替你說了一句「那不是你的錯」',
  4: '這一世的重逢會來自一句你原本不打算說的話——說出口之後，路就開了',
  5: '這一世的重逢會在你累到想放下的時候出現——有人問你「你還好嗎」，而且是真的在問',
  6: '這一世的重逢會發生在你終於願意放手之後——手放開了，新的才進得來',
};

export const RED_LUAN_TEACHERS = ['iching', 'ghost'] as const;
export type RedLuanTeacher = (typeof RED_LUAN_TEACHERS)[number];

export type RedLuanTeacherReading = {
  key: RedLuanTeacher;
  name: string;
  tagline: string;
  /** 按鈕上的內容預告——客戶要知道按下去會拿到什麼，才會想按。 */
  preview: string;
  opening: string;
  /** 逐層揭露；兩位老師層數與口吻不同，但引用的是同一顆卦。 */
  sections: Array<{ title: string; text: string }>;
  closing: string;
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
  /** 兩位老師＝同一場卜卦的兩種話術分身（手冊 §六）。同一顆卦，不同口吻與切入層次。 */
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
 * 兩位老師（手冊 §六 話術分身原則）：
 * 易經老師＝沉穩導師，由外而內把卦義與命盤方向講清楚；
 * 鬼魅老師＝門外低語，走磁場／詭異／因果三段，神秘口氣是外衣、心理機制是骨架。
 * 兩位讀的是同一顆卦、同一份證據，差別只在切入順序與語氣。
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
  const { hexagram, patternName, empathic, affinity } = input;
  const ghost = buildGhostDecoding(hexagram);
  const timing = input.hasPeak ? input.monthsPhrase : `${input.year} 年沒有月份命中這組規則`;

  // 「他是誰」那四層在自己的折疊裡已經講過一次，這裡不再複述，
  // 只留一句收攏，其餘留給時間與卦示——否則客戶會覺得同一段話被灌了兩次水。
  const ichingSections = [
    ...(affinity.onionLayers.length > 0
      ? [{
        title: '先講對象',
        text: `會靠近你的，最主要是${affinity.onionLayers[0].headline}這一型${
          affinity.onionLayers[2] ? `，常出現在${affinity.onionLayers[2].headline}` : ''
        }。細節你可以自己翻「一層一層看他是誰」，我這邊先講時間。`,
      }]
      : []),
    { title: '什麼時候', text: input.hasPeak
      ? `時間落在${timing}。這個月的流月地支，正好踩在你命盤紅鸞、天喜、桃花或貴人的位置上——不是我說的，是規則算出來的，證據每一條都可以往下核對。`
      : `${timing}。今年這一路的力道在「養」不在「動」；與其等時間，不如把自己準備好。` },
    { title: '卦示・怎麼做', text: `你的卦是${hexagram.hexagramName}（第${hexagram.kingWen}卦），格局是「${patternName}」。${hexagram.essence}。${hexagram.advice}` },
  ];

  const ghostSections = [
    { title: '【磁場】干擾判讀', text: ghost.field },
    { title: '【詭異】異象顯跡', text: ghost.spirit },
    { title: '【因果】因果鏈拆解', text: ghost.karma },
    { title: '【門縫】會靠近的那個人', text: affinity.onionLayers.length > 0
      ? `我從門縫看出去……有一個影子的輪廓浮出來了：${affinity.onionLayers[0].headline}。再靠近一點看——${affinity.onionLayers.find((layer) => layer.step === 3)?.headline ?? '場域還看不清'}。方位在${affinity.onionLayers.find((layer) => layer.step === 4)?.headline ?? '未定'}。這不是預言，是你命盤裡紅鸞、天喜、桃花與貴人所在地支的氣性——影子是它們投出來的。`
      : '我從門縫看出去……這一年門外沒有停留的影子。不是空，是還沒到；這組規則沒有給出方向，我就不替你捏一個出來。' },
    { title: '【倒數】時間', text: input.hasPeak
      ? `時間我已經看到了——${timing}。過了這個月，磁場會再沉下去。要不要在那之前把自己準備好，是你的決定，不是卦的決定。`
      : `${timing}。門外安靜的年份不用硬敲；${hexagram.advice}` },
  ];

  return [
    {
      key: 'iching',
      name: '易經老師',
      tagline: '沉穩導師',
      preview: '把時間、對象、你該做什麼，一條一條講清楚',
      opening: empathic.greeting,
      sections: ichingSections,
      closing: `${empathic.soulFriendVow}\n${empathic.closing}`,
    },
    {
      key: 'ghost',
      name: '鬼魅老師',
      tagline: '門外低語',
      preview: '說出你身上那道還沒散掉的舊迴聲',
      opening: `……你先別出聲。我隔著門替你卜這一卦——${hexagram.hexagramName}，第${hexagram.kingWen}卦，${hexagram.glyph}。格局是「${patternName}」。門外的東西，我看見了。`,
      sections: ghostSections,
      closing: `聽清楚：${empathic.absolution.split('聽清楚')[0].trim()}那不是你的錯。門我替你留著，要不要走出來，你自己決定。`,
    },
  ];
}
