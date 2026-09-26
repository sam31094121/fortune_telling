"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAZI_WITHHELD_INTERPRETATION_FIELDS = exports.BAZI_SHENSHA_CLAIMS = exports.BAZI_TRADITIONAL_GATE_VERSION = void 0;
exports.evaluateBaziShenShaRule = evaluateBaziShenShaRule;
exports.getBaziTraditionalOutputGate = getBaziTraditionalOutputGate;
/**
 * 傳統八字輸出守門
 * ============================================================================
 *
 * `createBaziCore()` 的 `readyForInterpretation` 只證明曆法、四柱、十神與
 * 大運等計算欄位通過工程驗證；它不等於格局、旺衰、五神或神煞已通過
 * 古籍來源治理。這裡把兩件事永久拆開，避免未核准的解釋被前端或 AI
 * 當成「正統定論」。
 *
 * 狀態必須由來源登記重新計算，不信任 JSON 內手填的 status。
 */
const _____json_1 = __importDefault(require("../docs/\u6280\u80FD\u6230\u9B25\u6A94\u6848/\u516B\u5B57/\u4F86\u6E90\u767B\u8A18.json"));
const iching_source_gate_1 = require("./iching-source-gate");
exports.BAZI_TRADITIONAL_GATE_VERSION = 'BAZI_TRADITIONAL_OUTPUT_V2';
/** Source verification applies to the explicitly selected method. Comparisons never
 * grant permission: unresolved conflicts in that method remain in claim.conflicts. */
function evaluateBaziShenShaRule(claim, sources, coreReady) {
    const evaluated = claim ? (0, iching_source_gate_1.evaluateClaim)(claim, sources) : { status: 'PENDING_POOL', reasons: ['缺少此項神煞來源登記'] };
    const method = claim?.selected_method;
    const scoped = claim?.verification_scope === 'SELECTED_EDITION' && method
        && ['title', 'edition', 'ruleVersion', 'summary', 'sourceUrl', 'printedPage'].every(key => Boolean(method[key]));
    const status = evaluated.status === 'CONFLICT' ? 'CONFLICT' : scoped ? evaluated.status : 'PENDING_POOL';
    // User policy: a documented alternative producing different answers for the
    // compared rule is withheld, even when the selected book itself is verified.
    // Detail records scope limits; a same-name variant is not proof of identical anchors.
    const hasVariant = claim?.comparisons?.some(item => item.status === 'DOCUMENTED_VARIANT') ?? false;
    const outputStatus = !coreReady ? 'BLOCKED_CORE' : status !== 'VERIFIED' ? 'BLOCKED_SOURCE'
        : hasVariant ? 'BLOCKED_VARIANT' : 'READY';
    return {
        status,
        ready: outputStatus === 'READY',
        outputStatus,
        reasons: [...evaluated.reasons, ...(!scoped ? ['缺少指定版本與取法範圍'] : []), ...(hasVariant ? ['跨書比較已有原頁取法或表值差異，適用範圍見比較紀錄，依顯示政策暫不提供'] : [])],
        verificationScope: 'SELECTED_EDITION',
        method,
        comparisons: claim?.comparisons ?? [],
    };
}
exports.BAZI_SHENSHA_CLAIMS = {
    tianyi: 'C-BAZI-SHENSHA-TIANYI',
    wenchang: 'C-BAZI-SHENSHA-WENCHANG',
    taohua: 'C-BAZI-SHENSHA-TAOHUA',
    yima: 'C-BAZI-SHENSHA-YIMA',
    huagai: 'C-BAZI-SHENSHA-HUAGAI',
};
exports.BAZI_WITHHELD_INTERPRETATION_FIELDS = [
    '旺衰定論',
    '格局定論',
    '用神',
    '喜神',
    '忌神',
    '補強排序',
    '老師解讀',
];
const registry = _____json_1.default;
const sourceIndex = (0, iching_source_gate_1.indexSources)(registry);
const evaluatedClaims = new Map(registry.claims.map((claim) => [claim.claim_id, (0, iching_source_gate_1.evaluateClaim)(claim, sourceIndex)]));
function statusOf(claimId) {
    return evaluatedClaims.get(claimId)?.status ?? 'PENDING_POOL';
}
function getBaziTraditionalOutputGate(coreVerified) {
    const coreStatus = statusOf('C-BAZI-CHART');
    const classicsStatus = statusOf('C-BAZI-CLASSICS');
    const fiveGodsStatus = statusOf('C-BAZI-FIVE-GODS');
    // 四柱神煞與紅鸞月份規則是不同主張，不可共用放行狀態。
    const evaluateRule = (claimId) => evaluateBaziShenShaRule(registry.claims.find(claim => claim.claim_id === claimId), sourceIndex, coreVerified && coreStatus === 'VERIFIED');
    const shenShaRules = {
        tianyi: evaluateRule(exports.BAZI_SHENSHA_CLAIMS.tianyi),
        wenchang: evaluateRule(exports.BAZI_SHENSHA_CLAIMS.wenchang),
        taohua: evaluateRule(exports.BAZI_SHENSHA_CLAIMS.taohua),
        yima: evaluateRule(exports.BAZI_SHENSHA_CLAIMS.yima),
        huagai: evaluateRule(exports.BAZI_SHENSHA_CLAIMS.huagai),
    };
    const shenShaStatus = Object.values(shenShaRules).some(rule => rule.status === 'CONFLICT')
        ? 'CONFLICT' : Object.values(shenShaRules).every(rule => rule.status === 'VERIFIED') ? 'VERIFIED' : 'PENDING_POOL';
    const redLuanStatus = statusOf('C-RED-LUAN-SHENSHA');
    const coreReady = coreVerified && coreStatus === 'VERIFIED';
    const interpretationReady = coreReady && classicsStatus === 'VERIFIED' && fiveGodsStatus === 'VERIFIED';
    const shenShaReady = coreReady && Object.values(shenShaRules).every(rule => rule.ready);
    const redLuanReady = coreReady && redLuanStatus === 'VERIFIED';
    const reasons = [];
    if (!coreVerified)
        reasons.push('基礎命盤工程驗證未通過');
    if (coreStatus !== 'VERIFIED')
        reasons.push('四柱排盤來源閘門未通過');
    if (classicsStatus !== 'VERIFIED')
        reasons.push('格局、旺衰與斷語的古籍來源仍有衝突');
    if (fiveGodsStatus !== 'VERIFIED')
        reasons.push('用神、喜神、忌神取法仍有流派衝突');
    if (shenShaStatus !== 'VERIFIED')
        reasons.push('神煞規則尚未通過完整來源驗證');
    if (Object.values(shenShaRules).some(rule => rule.outputStatus === 'BLOCKED_VARIANT'))
        reasons.push('部分神煞因已核實的跨書取法分歧暫不提供');
    return {
        version: exports.BAZI_TRADITIONAL_GATE_VERSION,
        coreStatus,
        classicsStatus,
        fiveGodsStatus,
        shenShaStatus,
        redLuanStatus,
        coreReady,
        interpretationReady,
        shenShaReady,
        shenShaRules,
        redLuanReady,
        withheldFields: interpretationReady ? [] : exports.BAZI_WITHHELD_INTERPRETATION_FIELDS,
        reasons,
        customerMessage: !coreReady
            ? '本次基礎命盤資料尚未完成核對，請重新排盤；暫不提供進階判讀。'
            : interpretationReady
                ? '傳統八字解釋已通過來源與規則校驗。'
                : '可查看已核對的四柱、藏干與十神資料；格局、旺衰、喜用與補強判讀暫未提供，不影響上述基礎資料。',
    };
}
