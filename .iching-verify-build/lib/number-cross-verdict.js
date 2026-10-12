"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNumberCrossVerdict = buildNumberCrossVerdict;
const ELEMENT_GENERATES = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
const TRIGRAM_ELEMENTS = { 乾: '金', 兌: '金', 離: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
function clamp(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
}
function hexagramScore(reading) {
    const upper = TRIGRAM_ELEMENTS[reading.hexagram.upper.name] ?? '土';
    const lower = TRIGRAM_ELEMENTS[reading.hexagram.lower.name] ?? '土';
    if (upper === lower)
        return 60;
    if (ELEMENT_GENERATES[upper] === lower)
        return 70;
    if (ELEMENT_GENERATES[lower] === upper)
        return 64;
    return 40;
}
function digitScore(reading) {
    const distinctElements = new Set(reading.digitReadings.map((digit) => digit.element)).size;
    return [0, 35, 50, 65, 75, 85][distinctElements] ?? 85;
}
/** Deterministic, explainable final score; it never changes Number Core data. */
function buildNumberCrossVerdict(matrixScore, reading) {
    const matrix = clamp(matrixScore);
    const hexagram = hexagramScore(reading);
    const digits = digitScore(reading);
    const iching = clamp(reading.chainScore * 0.5 + hexagram * 0.3 + digits * 0.2);
    const score = clamp(matrix * 0.6 + iching * 0.4);
    const generated = reading.crossChain.filter((link) => link.kind === '相生').length;
    const controlled = reading.crossChain.filter((link) => link.kind === '相剋').length;
    return {
        version: 'number-cross-verdict-v1',
        score,
        matrix: { score: matrix, weight: 60, contribution: Number((matrix * 0.6).toFixed(1)) },
        iching: {
            score: iching,
            weight: 40,
            contribution: Number((iching * 0.4).toFixed(1)),
            chainScore: reading.chainScore,
            hexagramScore: hexagram,
            digitScore: digits,
            signalSummary: `梅花易數第${reading.hexagram.kingWen}卦；逐碼${generated}生${controlled}剋；能量鏈${reading.chainScore}分`,
        },
    };
}
