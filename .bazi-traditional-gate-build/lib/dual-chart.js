"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDualChart = calculateDualChart;
const engine_1 = require("./bazi/engine");
const lunar_typescript_1 = require("lunar-typescript");
const engine_2 = require("./ziwei/engine");
const bazi_engine_1 = require("./bazi-engine");
const bazi_professional_result_v5_1 = require("./bazi-professional-result-v5");
const three_core_engine_1 = require("./three-core-engine");
const bazi_traditional_gate_1 = require("./bazi-traditional-gate");
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
    const { core: bazi } = (0, three_core_engine_1.runBaziLayer)({ birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender, hourBranchIndex });
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
    return { bazi: { input: professional.input, professionalChart: professional.professionalChart, luckCycles: professional.luckCycles }, core: bazi, annual, ziwei, periods, ziweiProfile };
}
