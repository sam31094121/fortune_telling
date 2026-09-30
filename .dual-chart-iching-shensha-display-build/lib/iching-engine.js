"use strict";
/**
 * 易經卦象引擎（2026-08-25）
 *
 * 全站「易經精算」的統一來源：以決定性雜湊從輸入（生日、姓名、問題句）起卦，
 * 同一組輸入永遠得到同一卦——可回查、可驗證，不是隨機擲筊。
 * 產出：上卦、下卦、本卦（64 卦王家序名）、動爻、卦義判語。
 * 供紫微解說、塔羅直答、三位老師後備引擎引用。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.castHexagram = castHexagram;
exports.calculateMeihuaTimeNumbers = calculateMeihuaTimeNumbers;
exports.assertCastCertificate = assertCastCertificate;
exports.castHexagramCertified = castHexagramCertified;
exports.castHexagramFromBirth = castHexagramFromBirth;
exports.castHexagramFromNumber = castHexagramFromNumber;
exports.formatHexagramLine = formatHexagramLine;
const TRIGRAMS = [
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
const HEXAGRAM_NAMES = [
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
const KING_WEN = [
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
const iching_hexagrams_json_1 = __importDefault(require("../data/iching-hexagrams.json"));
function knowledgeOf(kingWen) {
    const table = iching_hexagrams_json_1.default.hexagrams;
    return table[String(kingWen)] ?? null;
}
/** 決定性字串雜湊（FNV-1a 32-bit），同輸入永遠同輸出。 */
function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
function buildReading(upperIdx, lowerIdx, changingLine, seedText) {
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
function castHexagram(...inputs) {
    const seedText = inputs.filter((v) => v !== null && v !== undefined && String(v).length > 0).map(String).join('|');
    const h = fnv1a(seedText);
    return buildReading(h % 8, Math.floor(h / 8) % 8, (Math.floor(h / 64) % 6) + 1, seedText);
}
/**
 * 《梅花易數》卷一「年月日時起例」的取數層。
 * 僅接受已核對的年支序數及月日、時數；不自行決定年界、閏月或占問用途。
 * 原典獨立算例見 docs/技能戰鬥檔案/易經/梅花年月日時原典算例.json。
 * 返回卦象結構，不夾帶尚未核實的現代解讀文字。
 */
function calculateMeihuaTimeNumbers(input) {
    for (const [value, maximum] of [
        [input.yearNumber, 12], [input.monthNumber, 12], [input.dayNumber, 30], [input.hourNumber, 12],
    ]) {
        if (!Number.isInteger(value) || value < 1 || value > maximum) {
            throw new Error('MEIHUA_INVALID_TRADITIONAL_NUMBER');
        }
    }
    const upperSum = input.yearNumber + input.monthNumber + input.dayNumber;
    const totalSum = upperSum + input.hourNumber;
    const upperIndex = (upperSum - 1) % 8;
    const lowerIndex = (totalSum - 1) % 8;
    return {
        upperSum, totalSum,
        upper: TRIGRAMS[upperIndex].name,
        lower: TRIGRAMS[lowerIndex].name,
        hexagramName: HEXAGRAM_NAMES[upperIndex][lowerIndex],
        changingLine: (totalSum - 1) % 6 + 1,
    };
}
/**
 * 憑證檢核。三項缺一不可，缺了就丟例外——寧可不出卦，不出假卦。
 */
function assertCastCertificate(cert, where) {
    const missing = [];
    if (!cert) {
        throw new Error(`ICHING_CAST_WITHOUT_CERTIFICATE: ${where} 未提供正統定盤憑證，禁止起卦。`);
    }
    if (!cert.baziVerified)
        missing.push('八字四柱未通過正統驗證閘');
    if (!cert.ziweiCertified)
        missing.push('紫微十二宮未定盤');
    if (!cert.ritualCompleted)
        missing.push('正統卜卦儀式未走完');
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
function castHexagramCertified(cert, birthDate, shichenIndex) {
    assertCastCertificate(cert, 'castHexagramCertified');
    return castHexagramFromBirth(birthDate, shichenIndex);
}
function castHexagramFromBirth(birthDate, shichenIndex) {
    const [y, m, d] = birthDate.split('-').map((v) => Number(v) || 0);
    /*
      時辰未知不得代填。
  
      原本這一行是「未知時辰以午時（第 7 支）計」——時辰不知道就當午時。
      結果是：沒填時辰的客戶，拿到的是用假時辰起的卦，
      而且在星座卡與 AI 摘要裡被包裝成「易經卜卦判定」的斷言句。
      那就是造假，而且和 three-core-engine 自己寫的
      unknownTimePolicy「不代填時辰、不硬排命宮、不硬起卦」直接矛盾。
  
      現在改成擋下來。時辰未知時有兩條正當出路：
        · 請客戶補時辰（首選——補了才有正統的卦）
        · 改用 castHexagram() 明示為象徵起卦，並在畫面上講清楚不是生辰卦
      寧可不出卦，不出假卦。
    */
    if (typeof shichenIndex !== 'number'
        || !Number.isInteger(shichenIndex)
        || shichenIndex < 0
        || shichenIndex > 11) {
        throw new Error('ICHING_HOUR_FABRICATED: 生辰起卦必須有真實時辰（0–11 地支序），不得以午時代填。'
            + '時辰未知時請客戶補上時辰，或改用 castHexagram() 明示為象徵起卦。');
    }
    const hour = shichenIndex + 1;
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
function castHexagramFromNumber(digits) {
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
function formatHexagramLine(reading) {
    return `易經起卦：第${reading.kingWen}卦 ${reading.hexagramName} ${reading.glyph}（${reading.upper.symbol}${reading.lower.symbol}）・動爻第${reading.changingLine}爻`;
}
