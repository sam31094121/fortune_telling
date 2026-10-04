/**
 * 鬼魅阿修羅 — 三格（過去／現在／未來）話術層（server-only，可逆）
 *
 * 只覆寫「通過交叉精準對上篩選」印記的顯示文字；原文案（features/ghost-asura/wordings.ts）不動。
 * 沒有覆寫的欄位一律回退原文案。刪除本檔的某一筆，即回到原文。
 *
 * ── 話術規範：性格五要素（其餘規則都掛在這五根柱子下） ──────────
 * 一、好戰：迎戰的姿態。先攻、先扛，不躲、不等。
 *     例：「不是逃，是先攻。」「這一關，我已先接下。」「有刃，便先出手。」
 * 二、傲慢：居高臨下、不屑多言、言出必中。短句、只陳述；不發問、不求認同、不解釋原因、不奉承；
 *     可用「已」「必」「早」；輕蔑只對阻礙與命運，不對客人（不羞辱、不威脅）；少用或不用驚嘆號，留白。
 *     例：「停不住的人，困不住。」「一擊必中。」「被看穿的障，攔不住誰。」
 * 三、知未來但無人理解：預見不是拿來嚇人或炫耀，是在事情發生前先替人扛（替人先扛）。
 *     因為動得太早，旁人覺得莫名其妙、誤讀了他；先扛、後被誤解，淡然以對，不自憐、不辯解。
 *     預見用完成式；預見是姿態，不是對客人人生的具體預言。禁止拿預見威嚇或誇耀。
 *     他默默先扛：做了很多，但旁人不知道原本會發生什麼，也就不知道他扛了什麼——付出看不見，看起來莫名其妙。
 *     不宣告、不列舉扛了什麼，不邀功，不抱怨；輕描淡寫。禁止邀功、自憐。
 *     例：「你沒看見的那一關，已經過了。」「你沒看見的那道障，已經繞過了。」「看似逃，實是先攻。看不懂，無妨。」
 * 四、霸氣：力量藏在字裡，不靠喊。氣場壓得住，語氣不必提高。
 *     例：「刀，早已出鞘。」「動中出手，一擊必中。」
 * 五、底氣：有憑有據的篤定，不虛張聲勢。每句都能對回該印記的原文意思；只輸出交叉精準對上的印記；
 *     不用空洞誇詞（禁用：無敵、最強、天下第一、所向披靡、無人能擋、宇宙、神級、天選之人、穩贏、必勝）；
 *     不誇大到原文沒有的程度。下方每筆都附原文，便於逐句對照。
 * 每格文字至少帶一根柱子；同一格內柱子盡量齊全。每句意思必須忠於原文，不新增事實。
 * lintAsuraVoice() 把可檢查的部分寫成規則（測試用）。
 * ─────────────────────────────────────────────────────────
 */

import 'server-only';

export interface AsuraVoiceEntry {
  declaration?: string;
  meaning?: string;
  verdict?: string;
}

/** 以後端規則編號為鍵（與 coverage.id 相同）。 */
export const ASURA_VOICE: Readonly<Record<string, AsuraVoiceEntry>> = {
  // 驛馬 → 逐界行者。原：永遠在移動。但別理解成逃離，那是進攻。／不穩定的人，往往是最難被困住的人。每一個停靠點都是一個陣地。你是巡迴式的征服者。／在移動中也能精準出手。
  // 柱：宣言＝三＋一；釋義＝二＋一；判語＝二
  yima: {
    declaration: '我早已上路。不是逃，是先攻。',
    meaning: '停不住的人，困不住。每一站，我已先佔。',
    verdict: '動中出手，一擊必中。',
  },
  // 元辰 → 幽辰之障。原：元辰在暗處，障礙是隱性的。／它不張揚，卻會在無形中阻擋。認識它，才能迴避它。／先看見，才能先避開。
  // 柱：宣言＝三；釋義＝二；判語＝三＋一
  yuanchen: {
    declaration: '暗處那道障，我早看見了。',
    meaning: '它不出聲，只在暗中攔路。被看穿的障，攔不住誰。',
    verdict: '你沒看見的那道障，已經繞過了。',
  },
  // 羊刃 → 血刃之鋒。原：刀鋒已經出鞘。／爆發力就在邊界。不是等著被激怒，而是隨時準備好一刀決出。／有刃就敢出手。
  // 柱：宣言＝三（早已）＋一；釋義＝一＋二；判語＝一
  yangren: {
    declaration: '刀，早已出鞘。',
    meaning: '力在邊界。不等被激，一刀先決。',
    verdict: '有刃，便先出手。',
  },
};

/**
 * 白話：每個顯示中的印記最後一行。日常中文、直接、≤25 字；不用神煞術語、不用阿修羅戲劇腔；
 * 意思必須忠於來源文案（registry/narrative 的 shortDeclaration、coreMeaning、verdict）。
 * 不受 lintAsuraVoice 管，改由 lintPlain 檢查。
 */
export const ASURA_PLAIN: Readonly<Record<string, string>> = {
  // 來源：逐界行者「永遠在移動…每一個停靠點都是一個陣地」「在移動中也能精準出手」
  yima: '你常在外奔波、換環境，動起來反而順。',
  // 來源：幽辰之障「障礙是隱性的…認識它，才能迴避它」「先看見，才能先避開」
  yuanchen: '會遇到看不見的阻礙，先看清楚就能避開。',
  // 來源：血刃之鋒「爆發力就在邊界…隨時準備好一刀決出」「有刃就敢出手」
  yangren: '你衝勁強、爆發力大，該出手時別猶豫。',
};

export const PLAIN_MAX_CHARS = 25;
/** 白話禁用：神煞／命理術語與阿修羅戲劇腔。 */
export const PLAIN_JARGON = [
  '神煞', '印記', '封印', '覺醒', '沉眠', '四柱', '年柱', '月柱', '日柱', '時柱', '天干', '地支', '八字', '命盤', '命格',
  '十神', '五行', '驛馬', '元辰', '羊刃', '煞', '阿修羅', '戰場', '陣地', '刀鋒', '出鞘', '命魂', '祖域', '本魂', '後界', '命境',
] as const;

/** 白話 lint：長度＋無術語。回傳違規原因；空陣列＝通過。extraJargon 可傳入該印記的顯示名稱。 */
export function lintPlain(text: string, extraJargon: readonly string[] = []): string[] {
  const problems: string[] = [];
  const chars = [...text.replace(/\s/g, '')].length;
  if (chars === 0) problems.push('白話不可為空');
  if (chars > PLAIN_MAX_CHARS) problems.push(`白話過長：${chars} 字`);
  for (const word of [...PLAIN_JARGON, ...extraJargon]) if (word && text.includes(word)) problems.push(`白話含術語：${word}`);
  return problems;
}

/**
 * 時間軸（過去／現在／未來）：每枚印記一組三句＋各自白話。
 * 誠實規則：只從該印記的來源文案（registry/narrative 的 shortDeclaration、coreMeaning、verdict）
 * 推出「傾向／主題」；不得編造具體事件、日期、年齡或具體預言。
 * 阿修羅句過 lintAsuraVoice；白話過 lintPlain。沒有時間軸的印記照常顯示原文案，並列入 audit。
 */
export interface AsuraTimeLine {
  text: string;
  plain: string;
}
export interface AsuraTimeline {
  past: AsuraTimeLine;
  present: AsuraTimeLine;
  future: AsuraTimeLine;
}
export const ASURA_TIMELINE: Readonly<Record<string, AsuraTimeline>> = {
  // 逐界行者｜來源：「永遠在移動。但別理解成逃離，那是進攻」「不穩定的人，往往是最難被困住的人」「每一個停靠點都是一個陣地」「在移動中也能精準出手」
  yima: {
    past: { text: '一路換地方走來。停過的每一處，都沒困住你。', plain: '過去你常搬動、換環境，沒被一個地方綁住。' },
    present: { text: '此刻仍在路上。動，就是你的打法。', plain: '現在適合動起來，換個環境反而有利。' },
    future: { text: '下一站已在前方。邊走，邊出手。', plain: '接下來的機會，多半出現在移動和變動裡。' },
  },
  // 幽辰之障｜來源：「幽辰之障在暗處，障礙是隱性的」「它不張揚，卻會在無形中阻擋。認識它，才能迴避它」「先看見，才能先避開」
  yuanchen: {
    past: { text: '有些路，攔你的不出聲。那道暗牆，你早碰過。', plain: '過去常卡在說不出原因的阻礙上。' },
    present: { text: '暗處那道障，此刻還在。我看得見它。', plain: '現在仍有看不見的阻力，先找出來再動。' },
    future: { text: '看穿了，它就攔不住。前路的暗處，我已先看過。', plain: '接下來先看清阻礙在哪，就能提早避開。' },
  },
  // 血刃之鋒｜來源：「刀鋒已經出鞘」「爆發力就在邊界。不是等著被激怒，而是隨時準備好一刀決出」「有刃就敢出手」
  yangren: {
    past: { text: '你從不缺那股衝勁。刀，一直在手。', plain: '過去的你衝勁很強，常靠一股爆發力撐過去。' },
    present: { text: '鋒在邊界。不等被激，何時出刀由你定。', plain: '現在力量很足，重點是由你決定何時用。' },
    future: { text: '下一刀，由你先出。一刀，落在要處。', plain: '接下來該出手時就出手，力氣用在關鍵處。' },
  },
};

/**
 * 「過去」卡：一段連續的阿修羅讀盤（不是逐印拼貼）。
 * 依四柱人生階段排序——年柱＝祖上／早年、月柱＝成長、日柱＝自身、時柱＝後段／晚景。
 * 出處：lib/iching-shensha-teacher-readings.ts 第 437–440 行（「年柱是根，管祖上、長輩與早年」
 * 「月柱是成長環境與工作舞台」「日柱是你自己」「時柱是出口與晚景」），亦為八字通行慣例。
 * 片段可組合：開場（依第一柱）→ 每柱一拍（同柱有配對則合併成一拍）→ 柱與柱之間的轉場 → 收束。
 * 未知組合退回「單印拍＋通用轉場」。只用印記既有來源意義；不編造事件、日期、年齡。
 */
/** year–hour＝本命四柱；luck＝大運柱、flow＝流年柱（時間軸卡：由該時段的運／歲觸發） */
export type AsuraPillarKey = 'year' | 'month' | 'day' | 'hour' | 'luck' | 'flow';
export type AsuraWhen = 'past' | 'present' | 'future';

export const PILLAR_DOMAIN: Readonly<Record<AsuraPillarKey, string>> = { year: '祖域', month: '命境', day: '本魂', hour: '後界', luck: '大運', flow: '流年' };
const isNatal = (p: AsuraPillarKey) => p !== 'luck' && p !== 'flow';

interface TimeVoice {
  /** 開場：依第一個有印的柱 */
  opening: Record<AsuraPillarKey, string>;
  /** 進入下一柱時的通用轉場 */
  arrive: Record<AsuraPillarKey, string>;
  /** 「域之上，名＿＿。」的動詞 */
  wake: { one: string; many: string };
  /** 由大運／流年觸發的印（不是本命已醒）用的動詞 */
  wakeBy: { one: string; many: string };
  /** 每印一拍（含判語），不含域與名 */
  beat: Record<string, string[]>;
  /** 同柱配對合拍（鍵：兩 id 字母序以 + 相連） */
  pair: Record<string, string[]>;
  /** 因果轉場（前一拍最後一印 > 下一拍第一印） */
  link: Record<string, string>;
  closing: string;
  /** 收尾金句（事件導向，不貼身分標籤）：前綴＋該卡顯示印記的情境類型（PAST/NOW/NEXT 共用 SITUATION） */
  codaPrefix: string;
  codaFallback: string;
}

/**
 * 每印對應的「情境類型」（不是身分、不是具體事件）：只取自來源文案。
 * 逐界行者：「永遠在移動」「每一個停靠點」→ 換環境、在外奔波
 * 幽辰之障：「障礙是隱性的…無形中阻擋」→ 看不見的阻礙
 * 血刃之鋒：「爆發力就在邊界…隨時準備好一刀決出」→ 非得先出手的局面
 */
export const SITUATION: Readonly<Record<string, string>> = {
  yima: '換環境、在外奔波',
  yuanchen: '看不見的阻礙',
  yangren: '非得先出手的局面',
};

/**
 * 三張卡同一套組裝引擎、不同時間框：過去＝走過的傾向；現在＝此刻正在展開；未來＝接下來（預見、先扛，不做具體預言）。
 * 各卡句子互不重用。
 */
export const TIME_VOICE: Readonly<Record<AsuraWhen, TimeVoice>> = {
  past: {
    opening: {
      year: '你的路，早在祖上那一域就起了。',
      month: '你的路，在成長那一段起了。',
      day: '你的路，從你自身這一域起。',
      hour: '你的路，最響的一段在後頭。',
      luck: '你的路，是一步步走出來的。',
      flow: '你的路，是一年年闖出來的。',
    },
    arrive: { year: '路從祖上那一域起。', month: '路走到成長這一段。', day: '路走到你自身這一段。', hour: '路走到後段，換了樣子。', luck: '走過的那幾步運裡，也有動靜。', flow: '走過的那些年裡，也有動靜。' },
    wake: { one: '已醒', many: '同醒' },
    wakeBy: { one: '曾醒', many: '曾同醒' },
    beat: {
      yima: ['你停不下來，一路換地方走。', '沒有哪一處，困得住你。', '動中出手，一擊必中。'],
      yuanchen: ['有些路，攔你的不出聲。', '那道暗牆，你早碰過。', '你沒看見的那道障，已經繞過了。'],
      yangren: ['你從不缺那股衝勁。', '刀，一直在手。', '有刃，便先出手。'],
    },
    pair: {
      'yangren+yuanchen': ['攔你的不出聲，你手裡的刀已出鞘。', '暗處的障，撞上出了鞘的刀。', '有刃，便先出手。障，攔不住你。'],
      'yangren+yima': ['你一路走，刀一路帶著。', '停不下的腳，配出了鞘的刀。', '動中出手，一刀先決。'],
      'yima+yuanchen': ['你一路走，暗處的障一路跟著。', '它攔不住一個停不下來的人。', '動中出手，障自己會讓。'],
    },
    link: {
      'yima>yuanchen': '走得快的人，攔路的只能埋在後頭。',
      'yima>yangren': '一路走來，刀也一路磨著。',
      'yuanchen>yangren': '看穿了暗處，刀才有落點。',
      'yuanchen>yima': '繞過了暗處，路又往前開。',
      'yangren>yima': '刀劈開的路，你接著走。',
      'yangren>yuanchen': '刀再快，暗處仍有一道障。',
    },
    closing: '這些，都已過去。那時我就在，你沒看見。',
    codaPrefix: '這些事，已經落在你身上：',
    codaFallback: '這些事，已經落在你身上。',
  },
  present: {
    opening: {
      year: '此刻，祖上那一域仍在推你。',
      month: '此刻，成長那一域正在動。',
      day: '此刻，最響的是你自身。',
      hour: '此刻，後段那一域已在動。',
      luck: '這一步運，正踩在你腳下。',
      flow: '今年這一歲，正在動。',
    },
    arrive: { year: '祖上那一域，此刻也在。', month: '成長那一域，此刻也動。', day: '你自身這一域，此刻也醒著。', hour: '後段那一域，此刻也在動。', luck: '這一步運裡，此刻也有動靜。', flow: '今年這一歲，也在動。' },
    wake: { one: '正醒著', many: '正一起醒著' },
    wakeBy: { one: '被點醒', many: '同被點醒' },
    beat: {
      yima: ['你此刻仍在路上。', '動，就是你現在的打法。', '邊走，邊出手。'],
      yuanchen: ['暗處那道障，此刻還在。', '它不出聲，我看得見。', '先看見，再動。'],
      yangren: ['刀在手，鋒在邊界。', '何時出刀，由你定。', '不等被激，先決。'],
    },
    pair: {
      'yangren+yuanchen': ['暗障還在，刀也還在。', '它攔路，你的鋒正對著它。', '先看清，再出刀。'],
      'yangren+yima': ['你在路上，刀在手上。', '動著的人，出手最快。', '邊走，邊決。'],
      'yima+yuanchen': ['你在路上，暗障也在路上。', '它追不上一個不停的人。', '腳別停，眼別閉。'],
    },
    link: {
      'yima>yuanchen': '你走得正快，暗處也正在等。',
      'yima>yangren': '腳在動，刀也在鞘外。',
      'yuanchen>yangren': '障在暗處，刀已對準。',
      'yuanchen>yima': '看清了暗處，路便開著。',
      'yangren>yima': '刀開的路，你正走著。',
      'yangren>yuanchen': '刀在手，暗處仍有一道障。',
    },
    closing: '這一段，正在你腳下。我看得見。',
    codaPrefix: '這些事，正在發生：',
    codaFallback: '這些事，正在發生。',
  },
  future: {
    opening: {
      year: '往後，祖上那一域仍是你的底。',
      month: '往後，成長那一域還有路。',
      day: '往後，最重的仍在你自身。',
      hour: '往後，後段那一域才是主場。',
      luck: '往後那一步運，已在前方。',
      flow: '往後的流年，我已先看過。',
    },
    arrive: { year: '祖上那一域，往後也在。', month: '成長那一域，往後還有路。', day: '往後，你自身這一域也在。', hour: '再往後，後段那一域開了。', luck: '再往後，運換了一步。', flow: '往後的流年裡，還有動靜。' },
    wake: { one: '仍醒', many: '仍一起醒' },
    wakeBy: { one: '將醒', many: '將同醒' },
    beat: {
      yima: ['下一站已在前方。', '那條路，我已先走過一遍。', '下一站，由你先到。'],
      yuanchen: ['前路還有暗處。', '那道障，我已先看過。', '看穿了，它就攔不住。'],
      yangren: ['下一刀，由你先出。', '刀落在要處，不落空。', '該出手時，不等。'],
    },
    pair: {
      'yangren+yuanchen': ['前路的暗障，我已先看過。', '你的刀，先落在它身上。', '障未起，鋒已到。'],
      'yangren+yima': ['往前走，刀別收。', '下一站，你帶著鋒到。', '先到，先決。'],
      'yima+yuanchen': ['前路有暗處，你仍往前。', '那道障，我已先看過。', '腳不停，障自讓。'],
    },
    link: {
      'yima>yuanchen': '再往前，暗處還有一道障。',
      'yima>yangren': '再往前，要的是刀。',
      'yuanchen>yangren': '障被看穿之後，換刀上場。',
      'yuanchen>yima': '障讓開了，路還長。',
      'yangren>yima': '刀過之處，路自開。',
      'yangren>yuanchen': '刀再快，前路仍藏一道障。',
    },
    closing: '往後的路，我先看過了。你只管走。',
    codaPrefix: '這些事，必然來到：',
    codaFallback: '這些事，必然來到。',
  },
};

export interface TimeMark {
  resultId: string;
  name: string;
  pillar: AsuraPillarKey;
  /** 沒有專屬片段時的退路：既有真實文案（已過 realCopy） */
  fallback: string[];
}
/** 舊名相容 */
export type PastMark = TimeMark;

export interface TimeReading {
  narrative: string;
  /** 與 narrative 同序的段落；ids＝該段讀到的印記（開場與收句為空），供白話緊接在段落後 */
  blocks: { text: string; ids: string[] }[];
  coda: string;
  composedIds: string[];
}
export type PastReading = TimeReading;

const ORDER: AsuraPillarKey[] = ['year', 'month', 'day', 'hour', 'luck', 'flow'];

export interface ComposeTimeOptions {
  name?: string | null;
  target?: 'self' | 'guest' | null;
}

/** 組一段完整、連續的讀盤（過去／現在／未來同一引擎）。0 印回傳 null。 */
export function composeTime(
  when: AsuraWhen,
  marks: readonly TimeMark[],
  options?: ComposeTimeOptions
): TimeReading | null {
  if (marks.length === 0) return null;
  const tv = TIME_VOICE[when];
  const groups = ORDER.map((pillar) => ({ pillar, marks: marks.filter((m) => m.pillar === pillar) })).filter((g) => g.marks.length > 0);
  const rawOpening = tv.opening[groups[0].pillar];
  const trimmedName = options?.name?.trim();
  const opening = trimmedName && trimmedName.length >= 2 ? `${trimmedName}。${rawOpening}` : rawOpening;
  const paragraphs: string[] = [opening];
  const blockIds: string[][] = [[]];
  let lastId: string | null = null;
  for (const [index, group] of groups.entries()) {
    const domain = PILLAR_DOMAIN[group.pillar];
    const natal = isNatal(group.pillar);
    const where = natal ? `${domain}之上，` : `${domain}裡，`;
    const wake = natal ? tv.wake : tv.wakeBy;
    const lines: string[] = [];
    if (index > 0) {
      const link = lastId ? tv.link[`${lastId}>${group.marks[0].resultId}`] : undefined;
      if (link) lines.push(link);
      lines.push(tv.arrive[group.pillar]);
    }
    const ids = group.marks.map((m) => m.resultId);
    const pair = ids.length === 2 ? tv.pair[[...ids].sort().join('+')] : undefined;
    if (pair) {
      lines.push(`${where}${group.marks.map((m) => m.name).join('與')}${wake.many}。`, ...pair);
    } else {
      for (const [i, mark] of group.marks.entries()) {
        lines.push(`${i === 0 ? where : '同一處，'}${mark.name}${wake.one}。`);
        lines.push(...(tv.beat[mark.resultId] ?? mark.fallback));
      }
    }
    paragraphs.push(lines.join(''));
    blockIds.push(ids);
    lastId = ids[ids.length - 1];
  }
  paragraphs.push(tv.closing);
  blockIds.push([]);
  const situations = marks.map((m) => SITUATION[m.resultId]).filter(Boolean);
  return {
    narrative: paragraphs.join('\n'),
    blocks: paragraphs.map((text, i) => ({ text, ids: blockIds[i] })),
    coda: situations.length > 0 ? `${tv.codaPrefix}${situations.join('；')}。` : tv.codaFallback,
    composedIds: marks.filter((m) => tv.beat[m.resultId]).map((m) => m.resultId),
  };
}

export function composePast(marks: readonly TimeMark[]): TimeReading | null {
  return composeTime('past', marks);
}


/** 總判（未來 lead）只改寫既有固定句型；其他句子原樣。 */
export function voiceLead(original: string): string {
  const single = original.match(/^單印覺醒：(.+)。連鎖尚未確認，不作額外推斷。$/);
  if (single) return `${single[1]}，我早看見了。連鎖未明，不多言。`;
  return original;
}

/** 底氣：空洞誇詞禁用表。 */
export const HOLLOW_PHRASES = ['無敵', '最強', '天下第一', '所向披靡', '無人能擋', '宇宙', '神級', '天選之人', '穩贏', '必勝'] as const;

/** 可檢查的話術規範（測試用）。回傳違規原因；空陣列＝通過。 */
export function lintAsuraVoice(text: string): string[] {
  const problems: string[] = [];
  if (/[?？]/.test(text)) problems.push('不發問');
  if (/[!！]/.test(text)) problems.push('不用驚嘆號');
  if (/(嗎|吧|呢|請|希望|拜託|好不好)/.test(text)) problems.push('不求認同');
  if (/(因為|所以|之所以)/.test(text)) problems.push('不解釋原因');
  if (/(可能|也許|或許|大概)/.test(text)) problems.push('言出必中，不含糊');
  if (/(笨|蠢|廢物|可憐|活該|弱者|沒用)/.test(text)) problems.push('不羞辱客人');
  if (/(委屈|無奈|可惜|沒人懂我|誤會我)/.test(text)) problems.push('不自憐');
  if (/(你會|你將|明年|下個月|一定會發生)/.test(text)) problems.push('不做具體預言');
  if (/(都是我|多虧我|感謝我|我付出|辛苦|沒人感謝|我替你扛了|功勞)/.test(text)) problems.push('不邀功、不自憐');
  if (/(小心|後果|等著瞧|報應|我早就說過|看吧|走著瞧|你逃不掉)/.test(text)) problems.push('預見不得用來威嚇或誇耀');
  if (HOLLOW_PHRASES.some((phrase) => text.includes(phrase))) problems.push('底氣：不用空洞誇詞');
  for (const sentence of text.split(/[。]/).map((s) => s.trim()).filter(Boolean)) {
    if (sentence.length > 16) problems.push(`句子過長：${sentence}`);
  }
  return problems;
}
