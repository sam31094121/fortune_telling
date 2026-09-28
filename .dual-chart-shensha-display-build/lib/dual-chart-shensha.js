"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_SUISHEN = exports.FLOW_TOUCH_IDS = exports.DUAL_SHENSHA_RULES = exports.REFERENCE_RULE_VERSION = exports.DUAL_SHENSHA_VERSION = void 0;
exports.xunKong = xunKong;
exports.buildDualChartShenSha = buildDualChartShenSha;
exports.buildFlowYearShenSha = buildFlowYearShenSha;
/** Dual-chart-only extension. Consumes the verified core; never recalculates pillars. */
const _____json_1 = __importDefault(require("../docs/\u6280\u80FD\u6230\u9B25\u6A94\u6848/\u516B\u5B57/\u4F86\u6E90\u767B\u8A18.json"));
const iching_source_gate_1 = require("./iching-source-gate");
const bazi_traditional_gate_1 = require("./bazi-traditional-gate");
const dual_chart_shensha_card_1 = require("./dual-chart-shensha-card");
const shensha_teacher_readings_1 = require("./shensha-teacher-readings");
const engine_1 = require("./bazi/engine");
exports.DUAL_SHENSHA_VERSION = 'DUAL_SHENSHA_REFERENCE_CHART_V4';
const YANGREN = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
// ── 太極紫微易經派取法（本站自家一派，業主定案 2026-09-27）──────────────
// 客戶資料 → 八字 → 紫微 → 四柱核對 → 有邏輯地衍生特星神煞。
// 以業主提供的紙本命盤（1974-06-28 18:00 男，甲寅／庚午／庚子／乙酉，17 項特星神煞）為標準答案。原典頁碼尚待逐項補齊：來源狀態維持 PENDING_POOL，
// 由業主決定先行顯示並標註，不得寫成「已通過交叉比對」。
exports.REFERENCE_RULE_VERSION = 'REFERENCE_CHART_1974_V1';
const TRINE_OF = { 申: '申子辰', 子: '申子辰', 辰: '申子辰', 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' };
/** 三合局查表：桃花（咸池）、將星、災煞、六厄。 */
const TRINE_TABLE = {
    taohua: { 申子辰: '酉', 寅午戌: '卯', 巳酉丑: '午', 亥卯未: '子' },
    jiangxing: { 申子辰: '子', 寅午戌: '午', 巳酉丑: '酉', 亥卯未: '卯' },
    zaisha: { 申子辰: '午', 寅午戌: '子', 巳酉丑: '卯', 亥卯未: '酉' },
    liue: { 申子辰: '卯', 寅午戌: '酉', 巳酉丑: '子', 亥卯未: '午' },
};
/** 月支取天德／天德合／月德（天干或地支皆可為目標）。 */
const TIANDE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const TIANDEHE = { 寅: '壬', 卯: '巳', 辰: '丁', 巳: '丙', 午: '寅', 未: '己', 申: '戊', 酉: '亥', 戌: '辛', 亥: '庚', 子: '申', 丑: '乙' };
const YUEDE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
/** 2026-09-27 擴充（業主指定先做五個）：常見查表，列為本派取法，原典頁碼待補。 */
const KUIGANG_DAYS = ['庚辰', '庚戌', '壬辰', '戊戌'];
const JINYU = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };
/** 學堂＝日干長生位。 */
const XUETANG = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
const HONGYAN = { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' };
const STEMS_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 2026-09-27 第二批：孤辰寡宿依年支方局、劫煞依年支三合、祿神依日干、天醫依月支前一位。 */
const GUCHEN_GUASU = {
    亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'], 寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'],
    巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'], 申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未'],
};
const JIESHA = { 申子辰: '巳', 寅午戌: '亥', 巳酉丑: '寅', 亥卯未: '申' };
const LUSHEN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
/** 2026-09-27 第三批：常見查表，列為本派取法。 */
const GUOYIN = { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' };
const TIANCHU = { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LIUXIA = { 甲: '酉', 乙: '戌', 丙: '未', 丁: '申', 戊: '巳', 己: '午', 庚: '辰', 辛: '卯', 壬: '亥', 癸: '寅' };
const WANGSHEN = { 申子辰: '亥', 寅午戌: '巳', 巳酉丑: '申', 亥卯未: '寅' };
const SEASON_OF = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
const TIANSHE_DAY = { 春: '戊寅', 夏: '甲午', 秋: '戊申', 冬: '甲子' };
const SIFEI_DAYS = { 春: ['庚申', '辛酉'], 夏: ['壬子', '癸亥'], 秋: ['甲寅', '乙卯'], 冬: ['丙午', '丁巳'] };
const YINYANG_CHACUO_DAYS = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
const GULUAN_DAYS = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '壬子', '丙午', '戊午'];
const SHIE_DABAI_DAYS = ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'];
/** 三奇：天上甲戊庚、地下乙丙丁、人中壬癸辛，須在相連三柱依序出現。 */
const SANQI = { 甲戊庚: '天上三奇', 乙丙丁: '地下三奇', 壬癸辛: '人中三奇' };
/** 2026-09-28 第四批（總覽以外的常用神煞）：常見查表，列為本派取法。 */
const YUEDEHE = { 寅午戌: '辛', 申子辰: '丁', 亥卯未: '己', 巳酉丑: '乙' };
const JINSHEN_PILLARS = ['乙丑', '己巳', '癸酉'];
const BAZHUAN_DAYS = ['甲寅', '乙卯', '丁未', '戊戌', '己未', '庚申', '辛酉', '癸丑'];
const JIUCHOU_DAYS = ['戊子', '戊午', '壬子', '壬午', '乙卯', '乙酉', '己卯', '己酉', '辛卯', '辛酉'];
const LIUXIU_DAYS = ['丙午', '丁未', '戊子', '戊午', '己丑', '己未'];
/** 2026-09-28 第六批：公認查表，列為本派取法。 */
const YUEKONG = { 寅午戌: '壬', 申子辰: '丙', 亥卯未: '庚', 巳酉丑: '甲' };
const JIELU = { 甲: ['申', '酉'], 己: ['申', '酉'], 乙: ['午', '未'], 庚: ['午', '未'], 丙: ['辰', '巳'], 辛: ['辰', '巳'], 丁: ['寅', '卯'], 壬: ['寅', '卯'], 戊: ['子', '丑'], 癸: ['子', '丑'] };
const TIANZHUAN_DAY = { 春: '乙卯', 夏: '丙午', 秋: '辛酉', 冬: '壬子' };
const DIZHUAN_DAY = { 春: '辛卯', 夏: '戊午', 秋: '癸酉', 冬: '丙子' };
const SHILING_DAYS = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];
const RIDE_DAYS = ['甲寅', '丙辰', '戊辰', '庚辰', '壬戌'];
const RIGUI_DAYS = ['丁酉', '丁亥', '癸巳', '癸卯'];
const PANAN = { 申子辰: '丑', 寅午戌: '未', 巳酉丑: '戌', 亥卯未: '辰' };
const ANLU = { 甲: '亥', 乙: '戌', 丙: '申', 丁: '未', 戊: '申', 己: '未', 庚: '巳', 辛: '辰', 壬: '寅', 癸: '丑' };
const JINSHEN_DAYS = ['甲子', '甲午', '己卯', '己酉'];
const TUISHEN_DAYS = ['丁丑', '丁未', '壬辰', '壬戌'];
/** 拱祿（三命通會五組）：日時同干，兩支夾拱出祿位。 */
const GONGLU = { 癸亥癸丑: '子', 癸丑癸亥: '子', 丁巳丁未: '午', 己未己巳: '午', 戊辰戊午: '巳' };
/** 日柱所在旬的兩個空亡地支。 */
function xunKong(stem, branch) {
    const start = (engine_1.BRANCHES.indexOf(branch) - STEMS_ORDER.indexOf(stem) + 12) % 12; // 旬首（甲）所在地支
    return [engine_1.BRANCHES[(start + 10) % 12], engine_1.BRANCHES[(start + 11) % 12]];
}
/** 年支順數的歲神位：五鬼＋4、龍德＋7、天狗＋10；2026-09-28 第五批：喪門＋2、白虎＋8、披麻＋9、病符＋11。 */
const YEAR_OFFSET = { wugui: 4, longde: 7, tiangou: 10, sangmen: 2, baihu: 8, pima: 9, bingfu: 11 };
const pillars = ['hour', 'day', 'month', 'year'];
/** 顯示順序與名稱（同柱依此排列，與紙本排法相近）。 */
exports.DUAL_SHENSHA_RULES = [
    ['tiandehe', '天德合'], ['tiande', '天德'], ['yuede', '月德'], ['longde', '龍德'], ['tiangou', '天狗'], ['jinkui', '金匱'],
    ['wugui', '五鬼'], ['zaisha', '災煞'], ['liue', '六厄'], ['muyu', '沐浴'], ['yuepo', '月破'], ['ripo', '日破'],
    ['jiangxing', '將星'], ['yima', '驛馬'], ['gejiao', '隔角'], ['yuanchen', '元辰'], ['yangren', '羊刃'],
    ['taohua', '桃花'], ['waiTaohua', '外桃花'], ['tianyi', '天乙'], ['wenchang', '文昌'], ['huagai', '華蓋'],
    ['kuigang', '魁罡'], ['kongwang', '空亡'], ['jinyu', '金輿'], ['xuetang', '學堂'], ['hongyan', '紅艷'],
    ['lushen', '祿神'], ['tianyiDoctor', '天醫'], ['jiesha', '劫煞'], ['guchen', '孤辰'], ['guasu', '寡宿'],
    ['guoyin', '國印'], ['tianchu', '天廚'], ['tianshe', '天赦'], ['sanqi', '三奇'], ['wangshen', '亡神'],
    ['yinyangChacuo', '陰陽差錯'], ['guluan', '孤鸞'], ['shieDabai', '十惡大敗'], ['liuxia', '流霞'], ['sifei', '四廢'],
    ['yuedehe', '月德合'], ['feiren', '飛刃'], ['jinshen', '金神'], ['bazhuan', '八專'], ['jiuchou', '九醜'], ['liuxiu', '六秀'],
    ['sangmen', '喪門'], ['baihu', '白虎'], ['bingfu', '病符'], ['pima', '披麻'],
    ['suipo', '歲破'], ['yuekong', '月空'], ['jielu', '截路空亡'], ['tianzhuan', '天轉'], ['dizhuan', '地轉'], ['shiling', '十靈'], ['ride', '日德'], ['rigui', '日貴'],
    ['panan', '攀鞍'], ['anlu', '暗祿'], ['jinshenDay', '進神'], ['tuishen', '退神'],
    ['gonglu', '拱祿'],
];
function buildDualChartShenSha(core, gate, gender, pillarCheck) {
    // Never trust a caller's ready gate over the actual core verification.
    // 呼叫端有提供八字紫微核對時，四柱必須逐字一致才衍生神煞；對不上就停在核對關，不自動改任何一套。
    const coreReady = gate.coreReady && core.verification.readyForInterpretation && pillarCheck?.passed !== false;
    const registry = _____json_1.default;
    const claim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YANGREN');
    const yangrenGate = (0, bazi_traditional_gate_1.evaluateBaziShenShaRule)(claim, (0, iching_source_gate_1.indexSources)(registry), gate.coreReady && core.verification.readyForInterpretation);
    const yuanchenClaim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YUANCHEN');
    const yuanchenGate = (0, bazi_traditional_gate_1.evaluateBaziShenShaRule)(yuanchenClaim, (0, iching_source_gate_1.indexSources)(registry), gate.coreReady && core.verification.readyForInterpretation);
    // 已登記的舊取法（袁本將星、神峰隔角、袁本天德月德、袁本桃花）保留作版本對照，不再作正式輸出。
    const legacy = (claimId) => (0, bazi_traditional_gate_1.evaluateBaziShenShaRule)(registry.claims.find(c => c.claim_id === claimId), (0, iching_source_gate_1.indexSources)(registry), coreReady).comparisons;
    const reference = (summary, comparisons = []) => ({
        status: 'PENDING_POOL', ready: coreReady, outputStatus: coreReady ? 'READY' : 'BLOCKED_CORE',
        reasons: ['依太極紫微易經派取法（本站自家一派，業主定案 2026-09-27）；原典來源待補，不代表已通過交叉比對'],
        verificationScope: 'SELECTED_EDITION', comparisons, referenceMethod: true,
        method: { title: '太極紫微易經派取法', edition: '本站自家一派，以業主提供參考命盤核對', ruleVersion: exports.REFERENCE_RULE_VERSION, summary, sourceUrl: '', printedPage: '原典待補' },
    });
    const rules = {
        ...gate.shenShaRules, yangren: yangrenGate, yuanchen: yuanchenGate,
        taohua: reference('日支三合取咸池，查年月時；不加納音條件。', gate.shenShaRules.taohua?.comparisons),
        waiTaohua: reference('桃花落在時柱，另稱外桃花（牆外桃花）。'),
        jiangxing: reference('日支三合取將星，四柱皆查（含日柱）。', legacy('C-DUAL-SHENSHA-JIANGXING')),
        gejiao: reference('日支順數兩位，查年月時。', legacy('C-DUAL-SHENSHA-GEJIAO')),
        tiande: reference('月支取天德，四柱天干地支皆查。'),
        yuede: reference('月支三合取月德，四柱天干皆查。'),
        tiandehe: reference('月支取天德之合，四柱天干地支皆查。'),
        longde: reference('年支順數七位（歲神龍德），查月日時。'),
        tiangou: reference('年支順數十位（歲神天狗），查月日時。'),
        wugui: reference('年支順數四位，查月日時。'),
        jinkui: reference('年支三合取中神（金匱），查月日時。'),
        zaisha: reference('年支三合取災煞（將星之沖），查月日時。'),
        liue: reference('年支三合取六厄，查月日時。'),
        yuepo: reference('與月支相沖者，查年日時。'),
        ripo: reference('與日支相沖者，查年月時。'),
        muyu: reference('日干十二運落在沐浴之柱，四柱皆查。'),
        kuigang: reference('日柱為庚辰、庚戌、壬辰、戊戌者；只看日柱（另有流派加壬戌，本派不採）。'),
        kongwang: reference('依日柱所在旬取旬空兩支，查年月時。'),
        jinyu: reference('日干取金輿（甲辰乙巳丙戊未丁己申庚戌辛亥壬丑癸寅），四柱皆查。'),
        xuetang: reference('日干長生位為學堂，四柱皆查（另有以年納音長生取者，本派不採）。'),
        guchen: reference('年支所屬方局取孤辰（亥子丑寅、寅卯辰巳、巳午未申、申酉戌亥），查月日時；不分男女。'),
        guasu: reference('年支所屬方局取寡宿（亥子丑戌、寅卯辰丑、巳午未辰、申酉戌未），查月日時；不分男女。'),
        jiesha: reference('年支三合取劫煞（申子辰巳、寅午戌亥、巳酉丑寅、亥卯未申），查月日時。'),
        lushen: reference('日干祿位（甲寅乙卯丙戊巳丁己午庚申辛酉壬亥癸子），四柱皆查。'),
        tianyiDoctor: reference('月支前一位為天醫，查年日時。'),
        guoyin: reference('日干取國印（甲戌乙亥丙戊丑丁己寅庚辰辛巳壬未癸申），四柱皆查。'),
        tianchu: reference('日干取天廚（甲丙巳乙丁午戊申己酉庚亥辛子壬寅癸卯），四柱皆查。'),
        tianshe: reference('春戊寅、夏甲午、秋戊申、冬甲子日；季節依月支。只看日柱。'),
        sanqi: reference('天上甲戊庚、地下乙丙丁、人中壬癸辛，於年月日或月日時三柱天干依序相連。'),
        wangshen: reference('年支三合取亡神（申子辰亥、寅午戌巳、巳酉丑申、亥卯未寅），查月日時。'),
        yinyangChacuo: reference('日柱為丙子、丁丑、戊寅、辛卯、壬辰、癸巳、丙午、丁未、戊申、辛酉、壬戌、癸亥者。只看日柱。'),
        guluan: reference('日柱為乙巳、丁巳、辛亥、戊申、甲寅、壬子、丙午、戊午者。只看日柱；不分男女。'),
        shieDabai: reference('日柱為甲辰、乙巳、丙申、丁亥、戊戌、己丑、庚辰、辛巳、壬申、癸亥者。只看日柱。'),
        liuxia: reference('日干取流霞（甲酉乙戌丙未丁申戊巳己午庚辰辛卯壬亥癸寅），四柱皆查。'),
        sifei: reference('春庚申辛酉、夏壬子癸亥、秋甲寅乙卯、冬丙午丁巳日；季節依月支。只看日柱。'),
        yuedehe: reference('月支三合取月德，再取其天干之合（寅午戌辛、申子辰丁、亥卯未己、巳酉丑乙），四柱天干皆查。'),
        feiren: reference('日干羊刃之沖位為飛刃，查年月時。'),
        jinshen: reference('日柱或時柱為乙丑、己巳、癸酉者。'),
        bazhuan: reference('日柱為甲寅、乙卯、丁未、戊戌、己未、庚申、辛酉、癸丑者。只看日柱。'),
        jiuchou: reference('日柱為戊子、戊午、壬子、壬午、乙卯、乙酉、己卯、己酉、辛卯、辛酉者。只看日柱。'),
        liuxiu: reference('日柱為丙午、丁未、戊子、戊午、己丑、己未者。只看日柱。'),
        sangmen: reference('年支順數兩位（歲神喪門），查月日時；讀法採本派提醒與轉化。'),
        baihu: reference('年支順數八位（歲神白虎），查月日時；讀法採本派提醒與轉化。'),
        bingfu: reference('年支順數十一位（歲神病符），查月日時；不作健康或醫療斷語。'),
        pima: reference('年支順數九位（披麻），查月日時；讀法採本派提醒與轉化。'),
        suipo: reference('與年支相沖者，查月日時。'),
        yuekong: reference('月支三合取月空（寅午戌壬、申子辰丙、亥卯未庚、巳酉丑甲），四柱天干皆查。'),
        jielu: reference('日干取截路空亡（甲己申酉、乙庚午未、丙辛辰巳、丁壬寅卯、戊癸子丑），只查時柱。'),
        tianzhuan: reference('春乙卯、夏丙午、秋辛酉、冬壬子日；季節依月支。只看日柱。'),
        dizhuan: reference('春辛卯、夏戊午、秋癸酉、冬丙子日；季節依月支。只看日柱。'),
        shiling: reference('日柱為甲辰、乙亥、丙辰、丁酉、戊午、庚戌、庚寅、辛亥、壬寅、癸未者。只看日柱。'),
        ride: reference('日柱為甲寅、丙辰、戊辰、庚辰、壬戌者。只看日柱。'),
        rigui: reference('日柱為丁酉、丁亥、癸巳、癸卯者。只看日柱。'),
        panan: reference('日支三合取攀鞍（申子辰丑、寅午戌未、巳酉丑戌、亥卯未辰），查年月時。'),
        anlu: reference('日干祿位之六合為暗祿（甲亥乙戌丙戊申丁己未庚巳辛辰壬寅癸丑），四柱皆查。'),
        jinshenDay: reference('日柱為甲子、甲午、己卯、己酉者。只看日柱（另有兼看時柱者，本派不採）。'),
        gonglu: reference('日時同干夾拱祿位：癸亥日癸丑時、癸丑日癸亥時拱子，丁巳日丁未時、己未日己巳時拱午，戊辰日戊午時拱巳；日柱與時柱同標（另有加「四柱不見所拱之祿」條件者，本派不採）。'),
        tuishen: reference('日柱為丁丑、丁未、壬辰、壬戌者。只看日柱（另有兼看時柱者，本派不採）；讀法採本派提醒與轉化。'),
        hongyan: reference('日干取紅艷（甲乙午、丙寅、丁未、戊己辰、庚戌、辛酉、壬子、癸申），四柱皆查。'),
    };
    // 核心引擎的袁本桃花（含納音條件）只供其他卡片使用；本卡改依參考命盤取法重查。
    const raw = Array.isArray(core.shenSha) ? core.shenSha.filter(item => item.id !== 'taohua') : [];
    // Selected 1937 text, printed p72: day stem is anchor; inspect year/month/hour, not self.
    if (gate.coreReady && core.verification.readyForInterpretation && yangrenGate.status === 'VERIFIED') {
        for (const key of ['year', 'month', 'hour']) {
            const pillar = core.pillars[key];
            if (pillar !== 'UNKNOWN' && pillar.earthlyBranch === YANGREN[core.dayMaster.stem])
                raw.push({
                    id: 'yangren', name: '羊刃', rule: `日干${core.dayMaster.stem}羊刃位${pillar.earthlyBranch}；查年月時（袁本十干法）`,
                    evidence: `${key.toUpperCase()} 支${pillar.earthlyBranch}`, ruleVersion: 'MINGLI_TANYUAN_YANGREN_V1',
                    source: { sourceId: 'S-MINGLI-TANYUAN-1937-SCAN', title: '增訂命理探原（1937訂正本；1938再版本對讀）', printedPage: '72', url: 'https://commons.wikimedia.org/wiki/File:NLC416-07jh011647-5318_命理探源.pdf?page=103#file' },
                });
        }
    }
    // Selected Tai Jin v6 method: birth-year branch is the anchor and only the hour branch is inspected.
    // Yang male / yin female advances 7 branches; yin male / yang female advances 5.
    if (coreReady && yuanchenGate.status === 'VERIFIED' && gender && typeof core.pillars.year !== 'string' && typeof core.pillars.hour !== 'string') {
        const yearIndex = engine_1.BRANCHES.indexOf(core.pillars.year.earthlyBranch);
        const yangYear = yearIndex % 2 === 0;
        const advance = (yangYear && gender === 'male') || (!yangYear && gender === 'female') ? 7 : 5;
        const target = engine_1.BRANCHES[(yearIndex + advance) % engine_1.BRANCHES.length];
        if (core.pillars.hour.earthlyBranch === target)
            raw.push({
                id: 'yuanchen', name: '元辰',
                rule: `年支${core.pillars.year.earthlyBranch}、${gender === 'male' ? '男' : '女'}命取元辰${target}；只查時柱`,
                evidence: `HOUR 支${target}`, ruleVersion: 'TAIJIN_V6_YUANCHEN_YEAR_HOUR_V1',
                source: { sourceId: 'S-TAIJIN-V6-ZJLIB-SCAN', title: '太黅卷六（浙江圖書館藏明末刻本）', printedPage: '葉十二正反（PDF25–26）', url: 'https://commons.wikimedia.org/wiki/File:ZJLib-62836c27d8147868cc532705-4_太黅六卷_第4冊.pdf' },
            });
    }
    // ── 太極紫微易經派取法：全部只讀已核對四柱，不重排 ──
    if (coreReady) {
        const at = (key) => { const p = core.pillars[key]; return p === 'UNKNOWN' ? null : p; };
        const push = (id, name, key, rule, evidence) => {
            if (!raw.some(s => s.id === id && s.evidence.startsWith(`${key.toUpperCase()} `))) {
                raw.push({ id, name, rule, evidence: `${key.toUpperCase()} ${evidence}`, ruleVersion: exports.REFERENCE_RULE_VERSION });
            }
        };
        /** 在指定柱位找地支等於 target 者。 */
        const branchHit = (id, name, target, keys, rule) => {
            for (const key of keys)
                if (at(key)?.earthlyBranch === target)
                    push(id, name, key, rule, `支${target}`);
        };
        /** 目標可能是天干或地支（天德、天德合、月德）。 */
        const stemOrBranchHit = (id, name, target, rule) => {
            for (const key of pillars) {
                const p = at(key);
                if (!p)
                    continue;
                if (p.heavenlyStem === target)
                    push(id, name, key, rule, `干${target}`);
                else if (p.earthlyBranch === target)
                    push(id, name, key, rule, `支${target}`);
            }
        };
        const clash = (b) => engine_1.BRANCHES[(engine_1.BRANCHES.indexOf(b) + 6) % 12];
        const year = at('year');
        const month = at('month');
        const day = at('day');
        if (day) {
            const dayTrine = TRINE_OF[day.earthlyBranch];
            const taohua = TRINE_TABLE.taohua[dayTrine];
            branchHit('taohua', '桃花', taohua, ['year', 'month', 'hour'], `日支${day.earthlyBranch}（${dayTrine}）咸池在${taohua}；查年月時`);
            if (at('hour')?.earthlyBranch === taohua)
                push('waiTaohua', '外桃花', 'hour', `桃花${taohua}落在時柱`, `支${taohua}`);
            const jiangxing = TRINE_TABLE.jiangxing[dayTrine];
            branchHit('jiangxing', '將星', jiangxing, pillars, `日支${day.earthlyBranch}（${dayTrine}）將星在${jiangxing}；四柱皆查`);
            const gejiao = engine_1.BRANCHES[(engine_1.BRANCHES.indexOf(day.earthlyBranch) + 2) % 12];
            branchHit('gejiao', '隔角', gejiao, ['year', 'month', 'hour'], `日支${day.earthlyBranch}順數兩位為${gejiao}；查年月時`);
            const ripo = clash(day.earthlyBranch);
            branchHit('ripo', '日破', ripo, ['year', 'month', 'hour'], `日支${day.earthlyBranch}沖${ripo}；查年月時`);
        }
        if (month) {
            const m = month.earthlyBranch;
            stemOrBranchHit('tiandehe', '天德合', TIANDEHE[m], `月支${m}天德合在${TIANDEHE[m]}；四柱皆查`);
            stemOrBranchHit('tiande', '天德', TIANDE[m], `月支${m}天德在${TIANDE[m]}；四柱皆查`);
            stemOrBranchHit('yuede', '月德', YUEDE[m], `月支${m}月德在${YUEDE[m]}；四柱皆查`);
            const yuepo = clash(m);
            branchHit('yuepo', '月破', yuepo, ['year', 'day', 'hour'], `月支${m}沖${yuepo}；查年日時`);
        }
        if (year) {
            const y = year.earthlyBranch;
            const yi = engine_1.BRANCHES.indexOf(y);
            const yearTrine = TRINE_OF[y];
            const rest = ['month', 'day', 'hour'];
            branchHit('longde', '龍德', engine_1.BRANCHES[(yi + YEAR_OFFSET.longde) % 12], rest, `年支${y}順數七位龍德在${engine_1.BRANCHES[(yi + 7) % 12]}；查月日時`);
            branchHit('tiangou', '天狗', engine_1.BRANCHES[(yi + YEAR_OFFSET.tiangou) % 12], rest, `年支${y}順數十位天狗在${engine_1.BRANCHES[(yi + 10) % 12]}；查月日時`);
            for (const [id, name, label] of [['sangmen', '喪門', '兩'], ['baihu', '白虎', '八'], ['pima', '披麻', '九'], ['bingfu', '病符', '十一']]) {
                const target = engine_1.BRANCHES[(yi + YEAR_OFFSET[id]) % 12];
                branchHit(id, name, target, rest, `年支${y}順數${label}位${name}在${target}；查月日時`);
            }
            branchHit('wugui', '五鬼', engine_1.BRANCHES[(yi + YEAR_OFFSET.wugui) % 12], rest, `年支${y}順數四位五鬼在${engine_1.BRANCHES[(yi + 4) % 12]}；查月日時`);
            branchHit('jinkui', '金匱', TRINE_TABLE.jiangxing[yearTrine], rest, `年支${y}（${yearTrine}）金匱在${TRINE_TABLE.jiangxing[yearTrine]}；查月日時`);
            branchHit('zaisha', '災煞', TRINE_TABLE.zaisha[yearTrine], rest, `年支${y}（${yearTrine}）災煞在${TRINE_TABLE.zaisha[yearTrine]}；查月日時`);
            branchHit('liue', '六厄', TRINE_TABLE.liue[yearTrine], rest, `年支${y}（${yearTrine}）六厄在${TRINE_TABLE.liue[yearTrine]}；查月日時`);
        }
        if (day) {
            const ds = day.heavenlyStem;
            if (KUIGANG_DAYS.includes(day.ganZhi))
                push('kuigang', '魁罡', 'day', `日柱${day.ganZhi}為魁罡日`, `柱${day.ganZhi}`);
            const [k1, k2] = xunKong(ds, day.earthlyBranch);
            for (const target of [k1, k2])
                branchHit('kongwang', '空亡', target, ['year', 'month', 'hour'], `日柱${day.ganZhi}旬空${k1}${k2}；查年月時`);
            branchHit('jinyu', '金輿', JINYU[ds], pillars, `日干${ds}金輿在${JINYU[ds]}；四柱皆查`);
            branchHit('xuetang', '學堂', XUETANG[ds], pillars, `日干${ds}長生在${XUETANG[ds]}為學堂；四柱皆查`);
            branchHit('hongyan', '紅艷', HONGYAN[ds], pillars, `日干${ds}紅艷在${HONGYAN[ds]}；四柱皆查`);
            branchHit('lushen', '祿神', LUSHEN[ds], pillars, `日干${ds}祿在${LUSHEN[ds]}；四柱皆查`);
            branchHit('guoyin', '國印', GUOYIN[ds], pillars, `日干${ds}國印在${GUOYIN[ds]}；四柱皆查`);
            branchHit('tianchu', '天廚', TIANCHU[ds], pillars, `日干${ds}天廚在${TIANCHU[ds]}；四柱皆查`);
            branchHit('liuxia', '流霞', LIUXIA[ds], pillars, `日干${ds}流霞在${LIUXIA[ds]}；四柱皆查`);
            const dayGz = day.ganZhi;
            if (YINYANG_CHACUO_DAYS.includes(dayGz))
                push('yinyangChacuo', '陰陽差錯', 'day', `日柱${dayGz}為陰陽差錯日`, `柱${dayGz}`);
            if (GULUAN_DAYS.includes(dayGz))
                push('guluan', '孤鸞', 'day', `日柱${dayGz}為孤鸞日`, `柱${dayGz}`);
            if (SHIE_DABAI_DAYS.includes(dayGz))
                push('shieDabai', '十惡大敗', 'day', `日柱${dayGz}為十惡大敗日`, `柱${dayGz}`);
            if (month) {
                const season = SEASON_OF[month.earthlyBranch];
                if (TIANSHE_DAY[season] === dayGz)
                    push('tianshe', '天赦', 'day', `${season}季（月支${month.earthlyBranch}）逢${dayGz}日為天赦`, `柱${dayGz}`);
                if (SIFEI_DAYS[season].includes(dayGz))
                    push('sifei', '四廢', 'day', `${season}季（月支${month.earthlyBranch}）逢${dayGz}日為四廢`, `柱${dayGz}`);
            }
        }
        if (month) {
            const target = YUEDEHE[TRINE_OF[month.earthlyBranch]];
            for (const key of pillars)
                if (at(key)?.heavenlyStem === target)
                    push('yuedehe', '月德合', key, `月支${month.earthlyBranch}月德合在${target}；四柱天干皆查`, `干${target}`);
        }
        if (day) {
            const ds = day.heavenlyStem;
            const fei = engine_1.BRANCHES[(engine_1.BRANCHES.indexOf(YANGREN[ds]) + 6) % 12];
            branchHit('feiren', '飛刃', fei, ['year', 'month', 'hour'], `日干${ds}羊刃${YANGREN[ds]}沖${fei}為飛刃；查年月時`);
            for (const key of ['day', 'hour']) {
                const p = at(key);
                if (p && JINSHEN_PILLARS.includes(p.ganZhi))
                    push('jinshen', '金神', key, `${key === 'day' ? '日' : '時'}柱${p.ganZhi}為金神`, `柱${p.ganZhi}`);
            }
            if (BAZHUAN_DAYS.includes(day.ganZhi))
                push('bazhuan', '八專', 'day', `日柱${day.ganZhi}為八專日`, `柱${day.ganZhi}`);
            if (JIUCHOU_DAYS.includes(day.ganZhi))
                push('jiuchou', '九醜', 'day', `日柱${day.ganZhi}為九醜日`, `柱${day.ganZhi}`);
            if (LIUXIU_DAYS.includes(day.ganZhi))
                push('liuxiu', '六秀', 'day', `日柱${day.ganZhi}為六秀日`, `柱${day.ganZhi}`);
        }
        if (year) {
            const po = engine_1.BRANCHES[(engine_1.BRANCHES.indexOf(year.earthlyBranch) + 6) % 12];
            branchHit('suipo', '歲破', po, ['month', 'day', 'hour'], `年支${year.earthlyBranch}沖${po}；查月日時`);
        }
        if (month) {
            const kong = YUEKONG[TRINE_OF[month.earthlyBranch]];
            for (const key of pillars)
                if (at(key)?.heavenlyStem === kong)
                    push('yuekong', '月空', key, `月支${month.earthlyBranch}月空在${kong}；四柱天干皆查`, `干${kong}`);
        }
        if (day) {
            const ds = day.heavenlyStem;
            for (const target of JIELU[ds])
                branchHit('jielu', '截路空亡', target, ['hour'], `日干${ds}截路空亡在${JIELU[ds].join('')}；只查時柱`);
            if (month) {
                const season = SEASON_OF[month.earthlyBranch];
                if (TIANZHUAN_DAY[season] === day.ganZhi)
                    push('tianzhuan', '天轉', 'day', `${season}季逢${day.ganZhi}日為天轉`, `柱${day.ganZhi}`);
                if (DIZHUAN_DAY[season] === day.ganZhi)
                    push('dizhuan', '地轉', 'day', `${season}季逢${day.ganZhi}日為地轉`, `柱${day.ganZhi}`);
            }
            if (SHILING_DAYS.includes(day.ganZhi))
                push('shiling', '十靈', 'day', `日柱${day.ganZhi}為十靈日`, `柱${day.ganZhi}`);
            if (RIDE_DAYS.includes(day.ganZhi))
                push('ride', '日德', 'day', `日柱${day.ganZhi}為日德`, `柱${day.ganZhi}`);
            if (RIGUI_DAYS.includes(day.ganZhi))
                push('rigui', '日貴', 'day', `日柱${day.ganZhi}為日貴`, `柱${day.ganZhi}`);
        }
        // 第七批：攀鞍（日支三合，查年月時）、暗祿（日干祿之合，四柱）、進神／退神（日柱）。
        if (day) {
            const ds = day.heavenlyStem;
            const pa = PANAN[TRINE_OF[day.earthlyBranch]];
            branchHit('panan', '攀鞍', pa, ['year', 'month', 'hour'], `日支${day.earthlyBranch}三合攀鞍在${pa}；查年月時`);
            branchHit('anlu', '暗祿', ANLU[ds], pillars, `日干${ds}祿在${LUSHEN[ds]}，其合${ANLU[ds]}為暗祿；四柱皆查`);
            if (JINSHEN_DAYS.includes(day.ganZhi))
                push('jinshenDay', '進神', 'day', `日柱${day.ganZhi}為進神`, `柱${day.ganZhi}`);
            if (TUISHEN_DAYS.includes(day.ganZhi))
                push('tuishen', '退神', 'day', `日柱${day.ganZhi}為退神`, `柱${day.ganZhi}`);
            const hr = at('hour');
            const gong = hr ? GONGLU[day.ganZhi + hr.ganZhi] : undefined;
            if (hr && gong)
                for (const key of ['day', 'hour'])
                    push('gonglu', '拱祿', key, `日柱${day.ganZhi}、時柱${hr.ganZhi}夾拱祿位${gong}`, `柱${at(key).ganZhi}`);
        }
        // 三奇：相連三柱天干依序（年月日、月日時）。
        for (const run of [['year', 'month', 'day'], ['month', 'day', 'hour']]) {
            const stems = run.map(key => at(key)?.heavenlyStem);
            if (stems.some(stem => !stem))
                continue;
            const kind = SANQI[stems.join('')];
            if (kind)
                for (const key of run)
                    push('sanqi', '三奇', key, `${run.map(k => ({ year: '年', month: '月', day: '日', hour: '時' })[k]).join('')}干${stems.join('')}依序為${kind}`, `干${at(key).heavenlyStem}`);
        }
        if (year) {
            const ws = WANGSHEN[TRINE_OF[year.earthlyBranch]];
            branchHit('wangshen', '亡神', ws, ['month', 'day', 'hour'], `年支${year.earthlyBranch}（${TRINE_OF[year.earthlyBranch]}）亡神在${ws}；查月日時`);
        }
        if (year) {
            const [gu, gua] = GUCHEN_GUASU[year.earthlyBranch];
            branchHit('guchen', '孤辰', gu, ['month', 'day', 'hour'], `年支${year.earthlyBranch}孤辰在${gu}；查月日時`);
            branchHit('guasu', '寡宿', gua, ['month', 'day', 'hour'], `年支${year.earthlyBranch}寡宿在${gua}；查月日時`);
            const js = JIESHA[TRINE_OF[year.earthlyBranch]];
            branchHit('jiesha', '劫煞', js, ['month', 'day', 'hour'], `年支${year.earthlyBranch}（${TRINE_OF[year.earthlyBranch]}）劫煞在${js}；查月日時`);
        }
        if (month) {
            const doctor = engine_1.BRANCHES[(engine_1.BRANCHES.indexOf(month.earthlyBranch) + 11) % 12];
            branchHit('tianyiDoctor', '天醫', doctor, ['year', 'day', 'hour'], `月支${month.earthlyBranch}前一位${doctor}為天醫；查年日時`);
        }
        for (const key of pillars) {
            if (at(key) && core.twelveStages[key] === '沐浴')
                push('muyu', '沐浴', key, `日干${core.dayMaster.stem}十二運至${at(key).earthlyBranch}為沐浴`, `支${at(key).earthlyBranch}`);
        }
    }
    const byPillar = Object.fromEntries(pillars.map(key => [key, []]));
    const rank = new Map(exports.DUAL_SHENSHA_RULES.map(([id], index) => [id, index]));
    for (const hit of raw) {
        const rule = rules[hit.id];
        if (!coreReady || !rule?.ready || (rule.status !== 'VERIFIED' && !rule.referenceMethod) || rule.outputStatus !== 'READY')
            continue;
        const key = pillars.find(p => hit.evidence.startsWith(p.toUpperCase() + ' '));
        if (!key)
            throw new Error('特星神煞命中柱位資料不完整，暫不顯示，請重新排盤。');
        if (!byPillar[key].some(s => s.id === hit.id && s.name === hit.name))
            byPillar[key].push(hit);
    }
    for (const key of pillars)
        byPillar[key].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
    const hourKnown = typeof core.pillars.hour !== 'string';
    const yuanchenDataReady = Boolean(gender && typeof core.pillars.year !== 'string' && hourKnown);
    const coverage = exports.DUAL_SHENSHA_RULES.map(([id, name]) => {
        const rule = rules[id];
        const matchedPillars = pillars.filter(key => byPillar[key].some(s => s.id === id));
        const dataBlocked = (id === 'yuanchen' && !yuanchenDataReady) || (id === 'waiTaohua' && !hourKnown);
        return { id, name, status: !coreReady ? 'BLOCKED_CORE' : dataBlocked ? 'BLOCKED_DATA' : rule.outputStatus === 'READY' ? matchedPillars.length ? 'MATCHED' : 'NOT_MATCHED' : rule.outputStatus,
            reason: pillarCheck?.passed === false ? `八字與紫微四柱不一致（${pillarCheck.mismatches.join('；')}）；不判定是否命中。` : !coreReady ? '基礎四柱尚未通過驗證；不判定是否命中。' : dataBlocked ? id === 'waiTaohua' ? '外桃花需要已確認的時柱；資料不足不判定未命中。' : '元辰需要已確認的性別、年柱與時柱；資料不足不判定未命中。' : rule.outputStatus === 'READY' ? `依已採用取法${matchedPillars.length ? '命中' : '未命中'}；不是所有流派皆無。` : rule.reasons.join('；'), matchedPillars };
    });
    // 卡片要顯示的內容在後端一次決定；前端只照印。
    const card = (0, dual_chart_shensha_card_1.buildShenShaCardView)({ raw, byPillar, coverage }, coreReady, pillarCheck?.passed === false ? pillarCheck.mismatches : undefined, id => shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[id]?.tone ?? null);
    // 原核心規則（袁本）不動，只作來源對照說明用；本卡的正式輸出以 rules 為準。
    // 來源說明句由後端給，前端只照印（前端禁止生成）。
    const sourceNote = {
        zh: '特星神煞依本站太極紫微易經派取法；下方列袁樹珊取法作來源對照。',
        en: 'Special stars follow this site’s own Taiji–Ziwei–I Ching method; Yuan Shushan’s method is listed below for comparison. ',
    };
    return { version: exports.DUAL_SHENSHA_VERSION, raw, byPillar, coverage, rules, card, sourceComparisonRules: gate.shenShaRules, sourceNote };
}
// ── 流年神煞（業主定案 2026-09-28：兩種取法都做、分兩段顯示；看今年＋明年）──────────
// 甲、本命被觸動：把流年干支當第五柱，沿用本卡既有取法（取主仍是本命日干、日支、年支、月支），看哪些神煞落在流年。
//     不另創公式：流年柱放進時柱的位置重跑同一套規則，只收下列「以本命為取主、會查到該柱」的規則。
//     不收：沐浴（十二運是逐柱預算好的值）、只看日柱或時柱的組合、以年支排的歲神（交給乙段，避免同名兩義）。
// 乙、今年歲神：以流年地支為取主，照本卡歲神位數（喪門二、五鬼四、龍德七、白虎八、披麻九、天狗十、病符十一）
//     加太歲（同支，本命年／值太歲），看落在本命哪一柱。歲破已由甲段的「流年沖年支」表達，不重複。
exports.FLOW_TOUCH_IDS = [
    'tianyi', 'wenchang', 'yima', 'huagai', 'taohua', 'jiangxing', 'gejiao', 'yangren',
    'tiande', 'yuede', 'tiandehe', 'yuedehe', 'jinkui', 'zaisha', 'liue', 'jiesha', 'guchen', 'guasu', 'wangshen',
    'yuepo', 'ripo', 'suipo', 'kongwang', 'jinyu', 'xuetang', 'hongyan', 'lushen', 'anlu', 'tianyiDoctor',
    'guoyin', 'tianchu', 'liuxia', 'feiren', 'yuekong', 'panan',
];
exports.FLOW_SUISHEN = [
    ['taisui', '太歲', 0], ['sangmen', '喪門', 2], ['wugui', '五鬼', 4], ['longde', '龍德', 7],
    ['baihu', '白虎', 8], ['pima', '披麻', 9], ['tiangou', '天狗', 10], ['bingfu', '病符', 11],
];
function buildFlowYearShenSha(core, gate, gender, pillarCheck, flow) {
    const { year, month, day, hour } = core.pillars;
    const ready = gate.coreReady && core.verification.readyForInterpretation && pillarCheck?.passed !== false;
    const stem = flow.ganZhi[0];
    const branch = flow.ganZhi[1];
    if (!ready || hour === 'UNKNOWN' || !STEMS_ORDER.includes(stem) || !engine_1.BRANCHES.includes(branch))
        return null;
    const flowPillar = { ...hour, key: 'HOUR', heavenlyStem: stem, earthlyBranch: branch, ganZhi: flow.ganZhi };
    const pillarsWithFlow = [year, month, day, flowPillar];
    const synthetic = { ...core, pillars: { ...core.pillars, hour: flowPillar }, shenSha: (0, engine_1.computeShenSha)(core.dayMaster.stem, year.earthlyBranch, day.earthlyBranch, pillarsWithFlow) };
    const touchedRaw = buildDualChartShenSha(synthetic, gate, gender, pillarCheck).byPillar.hour.filter(hit => exports.FLOW_TOUCH_IDS.includes(hit.id));
    const touched = [];
    for (const hit of touchedRaw) {
        const rule = hit.rule.split('；')[0];
        const found = touched.find(t => t.id === hit.id);
        if (found) {
            if (!found.rule.includes(rule))
                found.rule += `、${rule}`;
        }
        else
            touched.push({ id: hit.id, name: hit.name, pillar: 'flow', rule });
    }
    const suiShen = [];
    const at = engine_1.BRANCHES.indexOf(branch);
    for (const [id, name, offset] of exports.FLOW_SUISHEN) {
        const target = engine_1.BRANCHES[(at + offset) % 12];
        for (const key of ['year', 'month', 'day', 'hour']) {
            if (core.pillars[key].earthlyBranch !== target)
                continue;
            suiShen.push({ id, name, pillar: key, rule: offset ? `流年${branch}順數${offset}位為${name}（${target}）` : `流年${branch}與本命同支（值太歲）` });
        }
    }
    return { year: flow.year, ganZhi: flow.ganZhi, touched, suiShen };
}
