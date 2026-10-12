"use strict";
/**
 * 《易經》論數字引擎（2026-08-28）｜技能與功能檔案
 *
 * 「易經論數字」升級版：每一組數字輸入都經過與易經卜卦同等的精準交叉才輸出——
 *   1. 逐碼配卦：每一碼依先天卦數（乾一兌二離三震四巽五坎六艮七坤八；九用九、
 *      零歸藏）取得卦、五行、象意與心理學對應（素材：data/iching-number-map.json）。
 *   2. 相鄰交叉：相鄰兩碼做五行生剋判定（相生＝氣順、相剋＝關卡、比和＝穩），
 *      形成整組數字的能量鏈。
 *   3. 整組起卦：梅花易數報數起卦（前半和取上卦、總和取下卦與動爻），
 *      得本卦＋動爻＋專屬格局名稱。
 * 全部決定性運算，同一組數字永遠同一份判定，可回查可驗證。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readNumberByIChing = readNumberByIChing;
exports.formatNumberReading = formatNumberReading;
const iching_number_map_json_1 = __importDefault(require("@/data/iching-number-map.json"));
const iching_engine_1 = require("./iching-engine");
const iching_psychology_1 = require("./iching-psychology");
const DIGITS = iching_number_map_json_1.default.digits;
/** 五行生剋（decidedly deterministic）：回傳「生／剋／比和」與方向說明。 */
function elementRelation(a, b) {
    if (a === b)
        return { kind: '比和', note: `${a}${b}比和，氣場同頻而穩` };
    const sheng = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
    if (sheng[a] === b)
        return { kind: '相生', note: `${a}生${b}，氣順向前推` };
    if (sheng[b] === a)
        return { kind: '相生', note: `${b}承${a}之源，回頭滋養` };
    const ke = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
    if (ke[a] === b)
        return { kind: '相剋', note: `${a}剋${b}，中段有關卡要化` };
    return { kind: '相剋', note: `${b}剋${a}，前段能量被牽制` };
}
/** 《易經》論數字主入口：一組 2-10 碼數字 → 完整交叉判定。 */
function readNumberByIChing(rawDigits) {
    const digits = rawDigits.replace(/\D/g, '');
    const hexagram = (0, iching_engine_1.castHexagramFromNumber)(digits);
    const patternName = (0, iching_psychology_1.patternNameOf)(hexagram);
    const digitReadings = Array.from(digits).map((digit) => ({ digit, ...(DIGITS[digit] ?? DIGITS['0']) }));
    const crossChain = [];
    for (let i = 0; i < digitReadings.length - 1; i += 1) {
        const a = digitReadings[i];
        const b = digitReadings[i + 1];
        const rel = elementRelation(a.element, b.element);
        crossChain.push({ pair: `${a.digit}${a.trigram}→${b.digit}${b.trigram}`, kind: rel.kind, note: rel.note });
    }
    const base = 60;
    const delta = crossChain.reduce((sum, link) => sum + (link.kind === '相生' ? 8 : link.kind === '相剋' ? -7 : 2), 0);
    const chainScore = Math.min(96, Math.max(8, base + delta));
    const flow = crossChain.length > 0
        ? `${crossChain.filter((l) => l.kind === '相生').length}生${crossChain.filter((l) => l.kind === '相剋').length}剋${crossChain.filter((l) => l.kind === '比和').length}和`
        : '單碼獨立';
    const verdictLine = `易經論數字：${digits} 起卦得「${hexagram.hexagramName}」（${patternName}），逐碼交叉${flow}、能量鏈 ${chainScore}/100——${hexagram.essence}。`;
    return { digits, hexagram, patternName, digitReadings, crossChain, chainScore, verdictLine, ghost: (0, iching_psychology_1.buildGhostDecoding)(hexagram) };
}
/** 給 AI 提示詞／後台的完整交叉素材（每一碼與每一段交叉都可回查）。 */
function formatNumberReading(reading) {
    return [
        `整組起卦：${(0, iching_engine_1.formatHexagramLine)(reading.hexagram)}｜格局：「${reading.patternName}」｜卦義：${reading.hexagram.essence}｜卦示行動：${reading.hexagram.advice}`,
        `逐碼配卦：${reading.digitReadings.map((d) => `${d.digit}=${d.trigram}${d.nature}(${d.element}) ${d.tone}`).join('；')}`,
        `相鄰交叉：${reading.crossChain.map((l) => `${l.pair}【${l.kind}】${l.note}`).join('；') || '單碼無交叉'}`,
        `能量鏈評分：${reading.chainScore}/100`,
        `逐碼心理層：${reading.digitReadings.map((d) => `${d.digit}：${d.psych}`).join('；')}`,
        reading.ghost.field,
        reading.ghost.spirit,
        reading.ghost.karma,
    ].join('\n');
}
