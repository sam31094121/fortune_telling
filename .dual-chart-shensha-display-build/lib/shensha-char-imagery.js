"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHENSHA_IMAGERY_ATTRIBUTION = exports.SHENSHA_SENSE_PICKS = void 0;
exports.charSense = charSense;
exports.shenShaImagery = shenShaImagery;
/**
 * 《神煞易經》字的意境（老師解盤的字義參考）
 * ============================================================================
 * 業主定案 2026-09-27：「字有字的意境，可以拿姓名學的答案作為參考。」
 *
 * - 字義一律取自姓名學字庫（data/shensha-char-imagery.json，由 scripts/build-shensha-char-imagery.mjs 抽出）。
 * - 教育部《重編國語辭典修訂本》授權為 CC BY-ND 3.0 TW（禁止改作）：只「挑選」義項、以句為單位原文照引，
 *   不改字、不刪字、不拼接；並標明出處。
 * - 字庫只收前三個義項，找不到合適義項的字（例：將、蓋）不硬湊，只寫五行。
 * - 這是字面意境的參考，不是神煞的古籍定義，也不下吉凶斷語。
 */
const shensha_char_imagery_json_1 = __importDefault(require("../data/shensha-char-imagery.json"));
const ENTRIES = shensha_char_imagery_json_1.default.entries;
/** 本派選義：[義項序, 句序]。null＝字庫沒有合適義項，只寫五行。 */
exports.SHENSHA_SENSE_PICKS = {
    天: [0, 0], 德: [2, 0], 合: [2, 0], 月: [0, 0], 龍: [0, 0], 狗: [0, 1], 金: [1, 0], 匱: [0, 0],
    五: null, 鬼: [0, 0], 災: [1, 0], 煞: [2, 0], 六: null, 厄: [1, 0], 沐: [0, 0], 浴: [1, 0],
    破: [1, 0], 日: [1, 0], 將: null, 星: [2, 0], 驛: [1, 0], 馬: [0, 1], 隔: [1, 0], 角: [1, 0],
    元: [0, 0], 辰: [2, 0], 羊: [0, 0], 刃: [0, 0], 桃: null, 花: [2, 0], 外: [0, 0], 乙: [0, 0],
    貴: [1, 0], 人: [1, 0], 文: [1, 0], 昌: [0, 0], 華: [2, 0], 蓋: null,
    魁: [1, 0], 罡: null, 空: [2, 0], 亡: [2, 0], 輿: [0, 0], 學: [1, 0], 堂: [0, 0], 紅: null, 艷: null,
};
exports.SHENSHA_IMAGERY_ATTRIBUTION = '字義參考：本站姓名學字庫（教育部《重編國語辭典修訂本》CC BY-ND 3.0 TW 原文照引；「龍」等字為本站姓名學精修字義）。字面意境僅供參考，不是神煞古籍定義。';
const NO_SENSE_TEXT = '（字庫無合適字義，只取五行）';
/** 以「。」為界切句，保留句號；不改任何字。 */
const sentences = (text) => text.match(/[^。]+。?/g) ?? [text];
function charSense(char) {
    const entry = ENTRIES[char];
    if (!entry)
        return { char, element: '土', sense: null, source: null, senseText: NO_SENSE_TEXT };
    const pick = exports.SHENSHA_SENSE_PICKS[char];
    const meaning = pick ? entry.meanings[pick[0]] : undefined;
    const sense = meaning ? sentences(meaning)[pick[1]] ?? null : null;
    return { char, element: entry.element, sense, source: sense ? entry.curated ? 'CURATED' : 'MOE' : null, senseText: sense ?? NO_SENSE_TEXT };
}
/** 一個神煞名稱的字義意境：逐字取義，組成老師解盤的一句話。 */
function shenShaImagery(name) {
    const chars = [...name].map(charSense);
    // 字義原文自帶句號，逐字並列，不拼接改寫。
    const parts = chars.map(c => c.sense ? `${c.char}（${c.element}）：${c.sense}` : `${c.char}（${c.element}）`);
    return { name, chars, line: parts.join('　') };
}
