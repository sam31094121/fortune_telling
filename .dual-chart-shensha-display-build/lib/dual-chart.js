"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDualChart = calculateDualChart;
const engine_1 = require("./bazi/engine");
const lunar_typescript_1 = require("lunar-typescript");
const engine_2 = require("./ziwei/engine");
const bazi_engine_1 = require("./bazi-engine");
const bazi_professional_result_v5_1 = require("./bazi-professional-result-v5");
const three_core_engine_1 = require("./three-core-engine");
const shensha_iching_1 = require("./shensha-iching");
const three_in_one_1 = require("./three-in-one");
const bazi_traditional_gate_1 = require("./bazi-traditional-gate");
const dual_chart_shensha_1 = require("./dual-chart-shensha");
function calculateDualChart(body) {
    if (!body || typeof body !== 'object')
        throw new Error('請填寫出生資料。');
    const input = body;
    if (input.calendarType !== 'solar' || input.timezone !== 'Asia/Taipei')
        throw new Error('基礎版僅支援國曆及台灣標準時間（UTC+8）。');
    if (input.gender !== 'male' && input.gender !== 'female')
        throw new Error('請選擇排盤性別。');
    if (typeof input.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate))
        throw new Error('請填寫完整國曆出生日期。');
    const [y, m, d] = input.birthDate.split('-').map(Number);
    const check = new Date(Date.UTC(y, m - 1, d));
    const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
    if (y < 1901 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d || input.birthDate > today)
        throw new Error('請輸入 1901 年起至今天的有效出生日期。');
    if (input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthHourBranch === 'pending' || typeof input.birthTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime))
        throw new Error('請補齊出生時辰，才能排出完整八字與紫微命盤。');
    const hourChoices = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];
    const hourBranchIndex = input.birthHourBranch === undefined ? undefined : hourChoices.indexOf(String(input.birthHourBranch));
    if (hourBranchIndex === -1)
        throw new Error('出生時辰無法辨識，請重新選擇。');
    const { core: bazi, bazi: baziLayer } = (0, three_core_engine_1.runBaziLayer)({ birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender, hourBranchIndex });
    if (!bazi.verification.readyForInterpretation || bazi.pillars.hour === 'UNKNOWN')
        throw new Error('八字資料核對未通過，暫不繼續排盤。');
    if (!(0, bazi_traditional_gate_1.getBaziTraditionalOutputGate)(bazi.verification.readyForInterpretation).coreReady)
        throw new Error('八字來源核對未通過，暫不繼續排盤。');
    const ziwei = (0, engine_2.createZiweiCore)({ date: input.birthDate, calendarType: 'solar', gender: input.gender === 'male' ? '男' : '女', timeIndex: (0, engine_2.hourToTimeIndex)(Number(input.birthTime.slice(0, 2))) });
    if (!ziwei.validation.passed || !bazi.verification.pillarsVerified || !bazi.verification.calendarVerified)
        throw new Error('命盤結構驗證未通過，請重新核對出生資料。');
    const runtimeInput = { name: typeof input.name === 'string' ? input.name.slice(0, 60) : '', gender: input.gender, birthDate: input.birthDate, birthTime: input.birthTime, country: '台灣', city: '台北', calendarType: 'solar' };
    const professional = (0, bazi_professional_result_v5_1.attachBaziProfessionalCoreV5)((0, bazi_engine_1.analyzeBazi)(runtimeInput, bazi), runtimeInput, bazi);
    const samePillars = ['year', 'month', 'day', 'hour'].every(key => {
        const pillar = bazi.pillars[key];
        return pillar !== 'UNKNOWN' && professional.professionalChart.pillarDetails[key]?.ganzhi === pillar.ganZhi;
    });
    if (!samePillars || professional.professionalChart.traditionalInterpretationGate?.coreReady !== true)
        throw new Error('命盤資料核對未通過，暫不提供結果，請重新排盤。');
    // 特星神煞衍生鏈：客戶資料 → 八字 → 紫微 → 四柱逐字核對（沿用三合一的 runZiweiLayer＋verifyFourPillars）→ 神煞。
    // 對不上就停在核對關，原樣列出哪一柱不同；不自動改任何一套。
    const baziInput = { birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender, hourBranchIndex };
    const ziweiLayer = (0, three_core_engine_1.runZiweiLayer)(baziInput, bazi);
    const pillarLabels = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    const ganZhiOf = (key) => { const p = bazi.pillars[key]; return p === 'UNKNOWN' ? '' : p.ganZhi; };
    const baziPillars = { year: ganZhiOf('year'), month: ganZhiOf('month'), day: ganZhiOf('day'), hour: ganZhiOf('hour') };
    const pillarCheck = ziweiLayer.status === 'READY'
        ? (0, three_in_one_1.verifyFourPillars)(baziPillars, { year: ziweiLayer.analysis.bazi.year, month: ziweiLayer.analysis.bazi.month, day: ziweiLayer.analysis.bazi.day, hour: ziweiLayer.analysis.bazi.hour })
        : { passed: false, differences: [] };
    const mismatches = ziweiLayer.status === 'READY'
        ? pillarCheck.differences.map(d => `${pillarLabels[d.pillar]}：八字${d.bazi}、紫微${d.ziwei || '缺'}`)
        : ['紫微命盤未完成，無法核對四柱'];
    const shenSha = (0, dual_chart_shensha_1.buildDualChartShenSha)(bazi, professional.professionalChart.traditionalInterpretationGate, input.gender, { passed: mismatches.length === 0, mismatches });
    // 《神煞易經》第④層：同一張已核對的命盤，沿用三合一帶憑證起卦，把特星神煞串進易經解盤。
    const iching = (0, three_core_engine_1.runIChingLayer)({ input: baziInput, core: bazi, bazi: baziLayer, ziwei: ziweiLayer });
    const specialStars = { ...shenSha, iching: (0, shensha_iching_1.buildShenShaIChing)({ pillars: baziPillars, pillarCheckPassed: mismatches.length === 0, card: shenSha.card, iching }) };
    // Reuse the existing backend extension over the verified pillars; the UI only renders its results.
    // 參考取法項目沒有原典頁碼（source 省略）；所有讀取 source 的畫面都先判斷是否存在。
    const dualShenSha = specialStars.raw;
    const dualCore = { ...bazi, shenSha: dualShenSha };
    const dualProfessionalChart = { ...professional.professionalChart, shenSha: dualShenSha,
        traditionalCore: dualCore,
        traditionalInterpretationGate: { ...professional.professionalChart.traditionalInterpretationGate, shenShaRules: specialStars.rules } };
    const raw = (0, engine_2.createZiweiAstrolabe)(ziwei.birthInput);
    const periods = raw.palaces.map(palace => ({ branch: String(palace.earthlyBranch), range: palace.decadal?.range ?? [], stage: String(palace.changsheng12 ?? ''), ages: [...palace.ages], boshi: String(palace.boshi12), suiqian: String(palace.suiqian12), jiangqian: String(palace.jiangqian12) }));
    // Read the existing calendar library at mid-year, after Li Chun. No new annual algorithm.
    const startYear = Number(today.slice(0, 4));
    const annual = Array.from({ length: 15 }, (_, index) => {
        const year = startYear + index;
        const lunar = lunar_typescript_1.Solar.fromYmd(year, 7, 1).getLunar();
        const stem = lunar.getYearGanByLiChun();
        const branch = lunar.getYearZhiByLiChun();
        return { year, age: year - y + 1, ganzhi: lunar.getYearInGanZhiByLiChun(), stemGod: (0, engine_1.calculateTenGod)(bazi.dayMaster.stem, stem), branchGod: (0, engine_1.calculateTenGod)(bazi.dayMaster.stem, engine_1.HIDDEN_STEM_DICTIONARY[branch].primary) };
    });
    const ziweiProfile = { polarity: engine_1.STEM_YINYANG[raw.chineseDate[0]] ?? '', zodiac: raw.zodiac };
    return { bazi: { input: professional.input, professionalChart: dualProfessionalChart, luckCycles: professional.luckCycles }, core: dualCore, specialStars, annual, ziwei, periods, ziweiProfile };
}
