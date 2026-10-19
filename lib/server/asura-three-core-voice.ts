/**
 * 鬼魅阿修羅 — 三核心修羅口吻（八字 → 紫微 → 易經，一個聲音）
 * ============================================================================
 * 業主定案 2026-10-19：只針對阿修羅這張卡。後端把八字、紫微斗數、易經三層「事實」算完，
 * 全部翻成同一個修羅的口吻；前端只照印，不編句、不運算。
 *
 * 事實來源（只讀，不另算）：calculateDualChart 的同一條鏈
 *   八字日干      ← result.core.pillars.day.heavenlyStem
 *   紫微命宮主星  ← result.ziwei.palaces（key === 'MING'）
 *   易經卦與動位  ← result.specialStars.iching（四柱核對通過且起卦成功才有）
 *   覺醒印記分布  ← 阿修羅頁自己算好的欄位（computeGhostAsuraDisplay 的 columns），與頁面清單同一個集合
 * 四柱核對沒過或易經未起卦：整段回 null（停在核對關，不拿不完整的盤下結論）。
 *
 * 零命理術語：輸出不含干支、星名、卦名、宮位等任何原始資料（測試會擋）。
 * 本體恆定：傲慢、好戰、先扛、霸氣、有底氣；不說宿命、不恐嚇、凶象只講提醒與轉化。
 * 話術是本派自撰，不是古籍原文；來源登記 C-ICHING-SHENSHA，狀態由來源閘門算。
 */
import 'server-only';
import type { DualChartResult } from '@/lib/dual-chart';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';

export const ASURA_VOICE_CONTRACT = 'asura-three-core-voice/v1';

export interface AsuraVoiceLine { label: string; text: string }
export interface AsuraThreeCoreVoice {
  contract: typeof ASURA_VOICE_CONTRACT;
  heading: string;
  lines: AsuraVoiceLine[];
  note: string;
}

/** 測試與稽核用：這段話術依據了哪些事實。不經 API 送出。 */
export interface AsuraVoiceFacts { dayStem: string; lifeStars: string[]; lifeBrightness: string | null; kingWen: number; changingLine: number; awakenedKinds: number; focusHeads: string[] }

// ── 八字：日干 → 修羅本色 ──────────────────────────────────────────
export const ASURA_STEM_VOICE: Readonly<Record<string, string>> = {
  甲: '立在風口的大樹。寧折，不彎。',
  乙: '藤纏巨木，借勢而上。你柔，但從不退。',
  丙: '正午的烈日。你一出場，場子就亮了。',
  丁: '暗夜裡的一盞火。小，卻誰也吹不滅。',
  戊: '不動的山。你站在那裡，事情就有了邊界。',
  己: '田間的沃土。不聲張，萬物卻從你這裡長。',
  庚: '未出鞘的劍。快、直、不拖泥帶水。',
  辛: '磨亮的刃。細，而且一刀就準。',
  壬: '奔流的大江。擋你的，終會被你繞過去。',
  癸: '雨後的深泉。靜，卻藏著最深的力。',
};

// ── 紫微：命宮主星 → 修羅鋒芒 ──────────────────────────────────────
export const ASURA_LIFE_STAR_VOICE: Readonly<Record<string, string>> = {
  紫微: '你習慣站在最上面的位置，也扛最重的名。',
  天機: '腦子比刀快。你先算三步，才動手。',
  太陽: '光往外走。你給得多，也被看得見。',
  武曲: '財與決斷握在手裡。話少，結果硬。',
  天同: '不爭不是弱。你守住自己的節奏，誰也拖不動。',
  廉貞: '情與刃是一體。愛恨分明，不演，也不裝。',
  天府: '庫在你手上。守得住，才放得出。',
  太陰: '心事藏得深，感受卻最細。你靜靜看，什麼都沒漏。',
  貪狼: '慾望是你的燃料。敢要，也敢闖，只差一個方向。',
  巨門: '話是你的刃。說準了能破局，說重了也會傷人。',
  天相: '你替人定規矩，也替人收尾。印在你手上。',
  天梁: '你習慣先扛，替別人擋風。肩膀是你練出來的。',
  七殺: '先鋒。你天生往前衝，不等任何人點頭。',
  破軍: '破舊立新。該拆的，你比誰都先動手。',
};
const BRIGHT = new Set(['廟', '旺']);
const DULL = new Set(['陷', '不']);
const brightnessTail = (b: string | null): string => (b && BRIGHT.has(b) ? '鋒芒本來就亮。' : b && DULL.has(b) ? '鋒芒還鈍，靠磨才亮，別急。' : '鋒芒怎麼亮，看你怎麼磨。');
const NO_STAR_VOICE = '命位沒有一顆星坐鎮。你不靠單一的星，靠整盤借力。';

// ── 易經：卦 → 修羅斷語（王家序 1–64，名稱只用於測試對照，不輸出）──────────
export const HEXAGRAM_NAMES: readonly string[] = ['乾為天', '坤為地', '水雷屯', '山水蒙', '水天需', '天水訟', '地水師', '水地比', '風天小畜', '天澤履', '地天泰', '天地否', '天火同人', '火天大有', '地山謙', '雷地豫', '澤雷隨', '山風蠱', '地澤臨', '風地觀', '火雷噬嗑', '山火賁', '山地剝', '地雷復', '天雷無妄', '山天大畜', '山雷頤', '澤風大過', '坎為水', '離為火', '澤山咸', '雷風恆', '天山遯', '雷天大壯', '火地晉', '地火明夷', '風火家人', '火澤睽', '水山蹇', '雷水解', '山澤損', '風雷益', '澤天夬', '天風姤', '澤地萃', '地風升', '澤水困', '水風井', '澤火革', '火風鼎', '震為雷', '艮為山', '風山漸', '雷澤歸妹', '雷火豐', '火山旅', '巽為風', '兌為澤', '風水渙', '水澤節', '風澤中孚', '雷山小過', '水火既濟', '火水未濟'];
export const ASURA_HEXAGRAM_VOICE: readonly string[] = [
  /* 1 */ '天在上，你就別低頭。要做，就做頭一個。',
  /* 2 */ '地不爭，卻托起一切。你的底盤，就是你的刀。',
  /* 3 */ '開局最亂，最見骨頭。亂中不退，就是你的陣。',
  /* 4 */ '不懂不丟人，裝懂才丟人。先問，再出刀。',
  /* 5 */ '等不是閒著，是在磨刀。時辰未到，先把刃養利。',
  /* 6 */ '爭到贏，也會傷到自己。拔刀之前，先算代價。',
  /* 7 */ '兵貴有紀律。你帶的不是人，是方向。',
  /* 8 */ '並肩的人要挑。同路的人，比人多更有用。',
  /* 9 */ '力還沒滿，先蓄。小忍不是退，是把箭搭穩。',
  /* 10 */ '走在險處，靠的是不慌。步步為營，不是膽小。',
  /* 11 */ '天地通了，順風。別睡，順風正是推進的時候。',
  /* 12 */ '路暫時堵住。別硬撞，換一條沒有牆的路。',
  /* 13 */ '志同的人聚在一起，比單打獨鬥猛得多。去找對的陣營。',
  /* 14 */ '手上有貨，更要有度。豐盛不是拿來炫，是拿來扛事。',
  /* 15 */ '真正的狠角色不吵。位置放低，本事放滿。',
  /* 16 */ '士氣一起，事就好辦。先把人心點著，再出陣。',
  /* 17 */ '看清風向，順勢而動。不是跟風，是借力。',
  /* 18 */ '舊的爛攤子，總要有人動手清。這一刀，輪到你下。',
  /* 19 */ '機會正在逼近。靠上去，用力，別等它走。',
  /* 20 */ '先看，再動。看得透的人，出手才準。',
  /* 21 */ '卡在中間的硬骨頭，咬斷它。話說清楚，事就通了。',
  /* 22 */ '門面可以漂亮，骨子要更硬。別讓裝飾蓋過實力。',
  /* 23 */ '外殼在掉。這時候別撐面子，守住根，等下一輪。',
  /* 24 */ '回頭不是輸。重新站起來的人，才懂怎麼贏。',
  /* 25 */ '不玩心機，反而最難擋。老實做，結果自己會落地。',
  /* 26 */ '蓄的是底氣，不是囤積。養足了，一次放出去。',
  /* 27 */ '吃進什麼，長成什麼。管好嘴，也管好進來的資訊。',
  /* 28 */ '擔子壓過了頭。別硬扛到彎，該分就分，該卸就卸。',
  /* 29 */ '險一關接著一關。不躲，就一關一關過。',
  /* 30 */ '火要有柴才亮。找到你依附的東西，別讓自己燒空。',
  /* 31 */ '感應比語言先到。心動了，就別假裝沒事。',
  /* 32 */ '久，是最狠的招。一件事守得夠長，沒人拆得掉。',
  /* 33 */ '退不是敗。守住力氣，退一步，是為了下一步更準。',
  /* 34 */ '力氣正盛，更要有規矩。壯而不亂，才叫真強。',
  /* 35 */ '升的時候會被看見。把實績亮出來，位置自然往上。',
  /* 36 */ '光被遮住時，別熄。藏起鋒芒，不是交出刀。',
  /* 37 */ '先把身邊的人顧好，再談遠方。根穩，枝才硬。',
  /* 38 */ '看法不同，不必同路。把分歧擺上桌，比悶著強。',
  /* 39 */ '前面卡住，別蠻衝。繞開、找幫手，山不只有一條路。',
  /* 40 */ '結鬆了。趁此刻動手，把拖著的事一口氣了斷。',
  /* 41 */ '該削的削。削掉雜的，剩下的才有力。',
  /* 42 */ '有利的風來了，借著做大。給出去的，會回來。',
  /* 43 */ '該斷就斷，話要說清楚。決絕之前，先確定證據在手。',
  /* 44 */ '意外的相遇。先看清對方是誰，再決定放不放進來。',
  /* 45 */ '人和資源聚攏了。聚得住，要有個主心骨，那就是你。',
  /* 46 */ '一階一階往上。不跳級，每一步都踩實。',
  /* 47 */ '被圍住的時候，話少做多。力氣留給能破的那一點。',
  /* 48 */ '井不動，水自深。守好自己的源頭，別人自會來取。',
  /* 49 */ '該換就換。舊皮脫下，新鱗才長得出來。',
  /* 50 */ '立新局。鼎要穩，三足齊：人才、資源、時機，缺一不可。',
  /* 51 */ '雷來了，驚過就算。穩住腳，雷後才是你的天。',
  /* 52 */ '該停就停。止住的那一刻，才看得清下一步。',
  /* 53 */ '慢進，不亂。一步一步，才走得遠。',
  /* 54 */ '關係還沒定位時，先看清位置，再決定投入多少。',
  /* 55 */ '盛的時候，最容易鬆懈。把握此刻，也預備日中之後。',
  /* 56 */ '在外作客，收斂鋒芒。借來的地盤，守人家的規矩。',
  /* 57 */ '風無孔不入。柔，不是弱，是滲透。',
  /* 58 */ '話說得讓人願意聽，勝過喊破嗓子。',
  /* 59 */ '散開的，要重新聚。先化掉僵住的，再收攏人心。',
  /* 60 */ '有節制才有後勁。先給自己立界線，再往前。',
  /* 61 */ '信，是最硬的盾。說到做到，就是你的底氣。',
  /* 62 */ '小處可以越線，大事不能。低飛，才穩。',
  /* 63 */ '剛成。最怕以為結束。守住成果，防最後一道裂。',
  /* 64 */ '還差最後一步。別在終點前鬆手。',
];
/** 動位（第幾爻動）→ 修羅斷語；輸出只說「位」，不出現術語。 */
export const ASURA_CHANGING_LINE_VOICE: readonly string[] = [
  '變數落在起手。第一步要穩，後面才不用補。',
  '變數落在站位。站穩，比衝快重要。',
  '變數落在關口。進或退，都要先算過。',
  '變數落在近前。抉擇就在眼前，別拖。',
  '變數落在當位。出手見分曉。',
  '變數落在收尾。見好就收，別拖長。',
];

// ── 合看：頁面已算好的覺醒印記（事實）→ 戰局一句 ───────────────────
// 只讀阿修羅頁自己的欄位（computeGhostAsuraDisplay 的 columns），所以這句和頁面上的清單永遠同一個集合。

interface IChingViewLike {
  state?: string;
  hexagram?: { kingWen?: number; changingLine?: number };
}
interface ZiweiPalaceLike { key?: string; majorStars?: string[]; majorStarDetails?: Array<{ name: string; brightness?: string }> }

/** 取事實；任何一層不成立回 null。純讀取，不改任何命盤資料。 */
export function deriveAsuraVoiceFacts(result: DualChartResult, display: Pick<AsuraDisplay, 'columns'>): AsuraVoiceFacts | null {
  const r = result as unknown as {
    core?: { pillars?: { day?: { heavenlyStem?: string } | 'UNKNOWN' } };
    ziwei?: { palaces?: ZiweiPalaceLike[] };
    specialStars?: { iching?: IChingViewLike };
  };
  const iching = r.specialStars?.iching;
  if (!iching || iching.state !== 'READY') return null;
  const day = r.core?.pillars?.day;
  const dayStem = day && day !== 'UNKNOWN' ? day.heavenlyStem : undefined;
  if (!dayStem || !(dayStem in ASURA_STEM_VOICE)) return null;
  const ming = r.ziwei?.palaces?.find((p) => p.key === 'MING');
  if (!ming) return null;
  const lifeStars = (ming.majorStars ?? []).filter((s) => s in ASURA_LIFE_STAR_VOICE);
  const lifeBrightness = ming.majorStarDetails?.find((d) => d.name === lifeStars[0])?.brightness ?? null;
  const kingWen = iching.hexagram?.kingWen;
  const changingLine = iching.hexagram?.changingLine;
  if (!Number.isInteger(kingWen) || kingWen! < 1 || kingWen! > 64) return null;
  if (!Number.isInteger(changingLine) || changingLine! < 1 || changingLine! > 6) return null;
  // 與阿修羅頁同一個集合：直接取頁面欄位；醒著的種類數＝頁面「覺醒 N 種」，力道最重的柱＝印記最多的欄。
  const columns = display.columns ?? [];
  const kinds = new Set(columns.flatMap((col) => col.seals.map((seal) => seal.id)));
  const max = Math.max(0, ...columns.map((col) => col.seals.length));
  const focusHeads = max > 0 ? columns.filter((col) => col.seals.length === max).map((col) => col.heading) : [];
  return { dayStem, lifeStars, lifeBrightness, kingWen: kingWen!, changingLine: changingLine!, awakenedKinds: kinds.size, focusHeads };
}

function battleLine(f: AsuraVoiceFacts): string {
  if (f.awakenedKinds === 0 || f.focusHeads.length === 0) return '盤上沒有醒著的印記。路，你自己鋪。';
  return `醒著的印記有 ${f.awakenedKinds} 種，力道壓在${f.focusHeads.join('、')}。`;
}

export function composeAsuraThreeCoreVoice(f: AsuraVoiceFacts, options: { hourAssumed?: boolean } = {}): AsuraThreeCoreVoice {
  const star = f.lifeStars.length
    ? `${f.lifeStars.slice(0, 2).map((s) => ASURA_LIFE_STAR_VOICE[s]).join('')}${brightnessTail(f.lifeBrightness)}`
    : NO_STAR_VOICE;
  return {
    contract: ASURA_VOICE_CONTRACT,
    heading: '修羅斷語',
    lines: [
      { label: '本色', text: ASURA_STEM_VOICE[f.dayStem] },
      { label: '鋒芒', text: star },
      { label: '斷語', text: `${ASURA_HEXAGRAM_VOICE[f.kingWen - 1]}${ASURA_CHANGING_LINE_VOICE[f.changingLine - 1]}` },
      { label: '戰局', text: battleLine(f) },
    ],
    note: options.hourAssumed ? '出生時刻未說，以夜半起算；斷語只當自我反思，不當預言。' : '斷語是文化象徵與自我反思，不是預言，也不替你做決定。',
  };
}

/** 後端入口：同一條鏈算好的命盤 → 修羅口吻；任一層沒成立回 null。 */
export function buildAsuraThreeCoreVoice(result: DualChartResult, display: Pick<AsuraDisplay, 'columns'>, options: { hourAssumed?: boolean } = {}): AsuraThreeCoreVoice | null {
  const facts = deriveAsuraVoiceFacts(result, display);
  return facts ? composeAsuraThreeCoreVoice(facts, options) : null;
}
