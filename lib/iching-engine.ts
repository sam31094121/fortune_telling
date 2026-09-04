/**
 * 易經卦象引擎（2026-08-25）
 *
 * 全站「易經精算」的統一來源：以決定性雜湊從輸入（生日、姓名、問題句）起卦，
 * 同一組輸入永遠得到同一卦——可回查、可驗證，不是隨機擲筊。
 * 產出：上卦、下卦、本卦（64 卦王家序名）、動爻、卦義判語。
 * 供紫微解說、塔羅直答、三位老師後備引擎引用。
 */

export type Trigram = {
  name: string; // 乾、兌、離、震、巽、坎、艮、坤
  nature: string; // 天、澤、火、雷、風、水、山、地
  symbol: string; // ☰☱☲☳☴☵☶☷
  attribute: string; // 剛健創始…
  action: string; // 建議動作語
};

const TRIGRAMS: Trigram[] = [
  { name: '乾', nature: '天', symbol: '☰', attribute: '剛健創始', action: '主動開局、承擔決定' },
  { name: '兌', nature: '澤', symbol: '☱', attribute: '喜悅溝通', action: '開口對話、以和為進' },
  { name: '離', nature: '火', symbol: '☲', attribute: '光明顯現', action: '把事情攤在檯面上看清楚' },
  { name: '震', nature: '雷', symbol: '☳', attribute: '行動驚起', action: '立即行動、先動再修' },
  { name: '巽', nature: '風', symbol: '☴', attribute: '柔入滲透', action: '循序滲透、以柔化阻' },
  { name: '坎', nature: '水', symbol: '☵', attribute: '險中藏智', action: '審慎渡險、以智取不以力取' },
  { name: '艮', nature: '山', symbol: '☶', attribute: '知止有定', action: '先停、劃界線、守住不該動的' },
  { name: '坤', nature: '地', symbol: '☷', attribute: '厚德承載', action: '順勢承接、先養底盤' },
];

/** 64 卦王家序名：HEXAGRAM_NAMES[上卦][下卦]，卦序同 TRIGRAMS（乾兌離震巽坎艮坤）。 */
const HEXAGRAM_NAMES: string[][] = [
  ['乾為天', '天澤履', '天火同人', '天雷無妄', '天風姤', '天水訟', '天山遯', '天地否'],
  ['澤天夬', '兌為澤', '澤火革', '澤雷隨', '澤風大過', '澤水困', '澤山咸', '澤地萃'],
  ['火天大有', '火澤睽', '離為火', '火雷噬嗑', '火風鼎', '火水未濟', '火山旅', '火地晉'],
  ['雷天大壯', '雷澤歸妹', '雷火豐', '震為雷', '雷風恆', '雷水解', '雷山小過', '雷地豫'],
  ['風天小畜', '風澤中孚', '風火家人', '風雷益', '巽為風', '風水渙', '風山漸', '風地觀'],
  ['水天需', '水澤節', '水火既濟', '水雷屯', '水風井', '坎為水', '水山蹇', '水地比'],
  ['山天大畜', '山澤損', '山火賁', '山雷頤', '山風蠱', '山水蒙', '艮為山', '山地剝'],
  ['地天泰', '地澤臨', '地火明夷', '地雷復', '地風升', '地水師', '地山謙', '坤為地'],
];

/** 王家序卦號：KING_WEN[上卦][下卦]，用來查 64 卦知識庫與卦象字元（䷀ = U+4DC0 + 卦號 - 1）。 */
const KING_WEN: number[][] = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
];

// 易經知識庫（data/iching-hexagrams.json）：64 卦的卦義精要與行動語，
// 起卦後由這裡取回真正的易經論述，不是憑空生成。
import HEXAGRAM_KNOWLEDGE from '../data/iching-hexagrams.json';

type HexagramKnowledgeEntry = { name: string; essence: string; advice: string };

function knowledgeOf(kingWen: number): HexagramKnowledgeEntry | null {
  const table = (HEXAGRAM_KNOWLEDGE as { hexagrams: Record<string, HexagramKnowledgeEntry> }).hexagrams;
  return table[String(kingWen)] ?? null;
}

export type IChingReading = {
  hexagramName: string; // 本卦（如「水火既濟」）
  kingWen: number; // 王家序卦號 1-64
  glyph: string; // 卦象字元 ䷀-䷿
  upper: Trigram;
  lower: Trigram;
  changingLine: number; // 動爻 1-6
  essence: string; // 知識庫的卦義精要（真正的易經論述）
  judgment: string; // 卦義判語（卦義精要＋上下卦結構）
  advice: string; // 行動建議（知識庫行動語＋動爻位置）
  seedText: string; // 起卦依據的原始輸入摘要（可回查）
};

/** 決定性字串雜湊（FNV-1a 32-bit），同輸入永遠同輸出。 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function buildReading(upperIdx: number, lowerIdx: number, changingLine: number, seedText: string): IChingReading {
  const upper = TRIGRAMS[upperIdx];
  const lower = TRIGRAMS[lowerIdx];
  const hexagramName = HEXAGRAM_NAMES[upperIdx][lowerIdx];
  const kingWen = KING_WEN[upperIdx][lowerIdx];
  const glyph = String.fromCodePoint(0x4dc0 + kingWen - 1);
  const knowledge = knowledgeOf(kingWen);
  // 動爻在下卦（1-3 爻）取下卦動作，在上卦（4-6 爻）取上卦動作
  const activeTrigram = changingLine <= 3 ? lower : upper;

  const essence = knowledge?.essence ?? `${upper.attribute}與${lower.attribute}交會`;
  const structure = upperIdx === lowerIdx
    ? `純${upper.name}之象，${upper.attribute}之力加倍`
    : `上${upper.nature}（${upper.attribute}）、下${lower.nature}（${lower.attribute}）`;
  const judgment = `第${kingWen}卦${hexagramName}：${essence}。${structure}——外在局勢與內在根基對齊則通，錯位則滯。`;

  const advice = `${knowledge?.advice ?? activeTrigram.action}（動爻第${changingLine}爻，落在${changingLine <= 3 ? `下卦${lower.name}` : `上卦${upper.name}`}，關鍵在${activeTrigram.action}）。`;

  return { hexagramName, kingWen, glyph, upper, lower, changingLine, essence, judgment, advice, seedText };
}

/** 以任意輸入決定性起卦。inputs 依序串接，順序不同即為不同卦。 */
export function castHexagram(...inputs: Array<string | number | null | undefined>): IChingReading {
  const seedText = inputs.filter((v) => v !== null && v !== undefined && String(v).length > 0).map(String).join('|');
  const h = fnv1a(seedText);
  return buildReading(h % 8, Math.floor(h / 8) % 8, (Math.floor(h / 64) % 6) + 1, seedText);
}

/**
 * 梅花易數・生辰起卦（正統時間起卦法）：
 * 上卦＝（年＋月＋日）除以 8 取餘，下卦＝（年＋月＋日＋時辰數）除以 8 取餘，
 * 動爻＝（年＋月＋日＋時辰數）除以 6 取餘（餘 0 作 8／6）。
 * 八字輸入正確，卦就固定——同一生辰永遠同一卦，可回查可驗證。
 */
/**
 * 起卦前的正統定盤憑證。
 *
 * 【禁止造假】八字命盤與紫微命盤都必須先通過各自的正統驗證閘、走完卜卦儀式，
 * 才准生成卦象。沒有憑證就起卦＝造假，這裡直接擋下，不是警告而已。
 *
 * 憑證由 lib/three-core-engine.ts 的 computeThreeCore() 產出——那是唯一的簽發者。
 * 任何呼叫端都不得自己捏一份憑證出來。
 */
export interface IChingCastCertificate {
  /** 八字四道驗證閘全過（曆法／四柱／十神／大運）。 */
  baziVerified: boolean;
  /** 紫微十二宮定盤、時辰已確認。 */
  ziweiCertified: boolean;
  /** 正統卜卦儀式五步全部走完。 */
  ritualCompleted: boolean;
  /** 這張命盤的四柱指紋，供回查。 */
  chartFingerprint: string;
}

/**
 * 憑證檢核。三項缺一不可，缺了就丟例外——寧可不出卦，不出假卦。
 */
export function assertCastCertificate(cert: IChingCastCertificate | undefined, where: string): void {
  const missing: string[] = [];
  if (!cert) {
    throw new Error(`ICHING_CAST_WITHOUT_CERTIFICATE: ${where} 未提供正統定盤憑證，禁止起卦。`);
  }
  if (!cert.baziVerified) missing.push('八字四柱未通過正統驗證閘');
  if (!cert.ziweiCertified) missing.push('紫微十二宮未定盤');
  if (!cert.ritualCompleted) missing.push('正統卜卦儀式未走完');
  if (missing.length > 0) {
    throw new Error(`ICHING_CAST_BLOCKED: ${where} ${missing.join('；')}。禁止造假，命盤未鎖死不得起卦。`);
  }
}

/**
 * 正統起卦（八字＋紫微鎖死＋儀式走完之後才准呼叫）。
 *
 * 這是「經過儀式的卦」的唯一入口。castHexagramFromBirth 保留給尚未遷移的
 * 呼叫端，但新程式一律走這裡——憑證不合格就丟例外，不會靜靜地出一顆假卦。
 */
export function castHexagramCertified(
  cert: IChingCastCertificate,
  birthDate: string,
  shichenIndex: number,
): IChingReading {
  assertCastCertificate(cert, 'castHexagramCertified');
  return castHexagramFromBirth(birthDate, shichenIndex);
}
export function castHexagramFromBirth(birthDate: string, shichenIndex?: number | null): IChingReading {
  const [y, m, d] = birthDate.split('-').map((v) => Number(v) || 0);
  const hour = typeof shichenIndex === 'number' && Number.isFinite(shichenIndex) ? shichenIndex + 1 : 7; // 未知時辰以午時（第 7 支）計
  const base = y + m + d;
  const upperIdx = ((base % 8) + 7) % 8; // 餘 1 為乾…餘 0 為坤，對映 TRIGRAMS 索引
  const lowerIdx = (((base + hour) % 8) + 7) % 8;
  const changingLine = ((base + hour) % 6 + 5) % 6 + 1;
  return buildReading(upperIdx, lowerIdx, changingLine, `梅花易數|${birthDate}|時辰${hour}`);
}

/**
 * 梅花易數・報數起卦（易經論數字專用）：
 * 前半段數字和 → 上卦（除 8 取餘，餘 0 作坤）、全數字和 → 下卦（除 8 取餘）、
 * 全數字和 → 動爻（除 6 取餘，餘 0 作 6）。同一組數字永遠同一卦，可回查。
 */
export function castHexagramFromNumber(digits: string): IChingReading {
  const nums = Array.from(digits).map((c) => Number(c)).filter((n) => Number.isFinite(n));
  const half = Math.ceil(nums.length / 2);
  const upperSum = nums.slice(0, half).reduce((s, n) => s + n, 0);
  const totalSum = nums.reduce((s, n) => s + n, 0);
  const upperIdx = ((upperSum % 8) + 7) % 8; // 餘 1=乾 … 餘 0=坤（先天卦數）
  const lowerIdx = ((totalSum % 8) + 7) % 8;
  const changingLine = ((totalSum % 6) + 5) % 6 + 1;
  return buildReading(upperIdx, lowerIdx, changingLine, `梅花易數報數|${digits}`);
}

/** 給前端顯示的一行式卦象摘要。 */
export function formatHexagramLine(reading: IChingReading): string {
  return `易經起卦：第${reading.kingWen}卦 ${reading.hexagramName} ${reading.glyph}（${reading.upper.symbol}${reading.lower.symbol}）・動爻第${reading.changingLine}爻`;
}
