"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateZiweiCore = exports.normalizeZiweiGender = exports.hourToTimeIndex = exports.extractMajorStars = exports.debugZiweiCore = exports.createZiweiCore = exports.createZiweiAstrolabe = exports.MAJOR_STARS = void 0;
exports.getLifePalace = getLifePalace;
exports.validateTwelvePalaces = validateTwelvePalaces;
exports.validateMajorStars = validateMajorStars;
exports.generateZiweiChart = generateZiweiChart;
exports.assertChartCertifiedForAi = assertChartCertifiedForAi;
exports.isChartCertified = isChartCertified;
const engine_1 = require("./engine");
var engine_2 = require("./engine");
Object.defineProperty(exports, "MAJOR_STARS", { enumerable: true, get: function () { return engine_2.MAJOR_STARS; } });
Object.defineProperty(exports, "createZiweiAstrolabe", { enumerable: true, get: function () { return engine_2.createZiweiAstrolabe; } });
Object.defineProperty(exports, "createZiweiCore", { enumerable: true, get: function () { return engine_2.createZiweiCore; } });
Object.defineProperty(exports, "debugZiweiCore", { enumerable: true, get: function () { return engine_2.debugZiweiCore; } });
Object.defineProperty(exports, "extractMajorStars", { enumerable: true, get: function () { return engine_2.extractMajorStars; } });
Object.defineProperty(exports, "hourToTimeIndex", { enumerable: true, get: function () { return engine_2.hourToTimeIndex; } });
Object.defineProperty(exports, "normalizeZiweiGender", { enumerable: true, get: function () { return engine_2.normalizeZiweiGender; } });
Object.defineProperty(exports, "validateZiweiCore", { enumerable: true, get: function () { return engine_2.validateZiweiCore; } });
function toLegacyPalace(palace) {
    return {
        key: palace.key,
        name: palace.name,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        isBodyPalace: palace.isBodyPalace,
        majorStars: palace.majorStarDetails,
        minorStars: palace.minorStars,
    };
}
function toLegacyChart(core) {
    const palaces = core.palaces.map(toLegacyPalace);
    const byKey = (key) => {
        const palace = palaces.find((item) => item.key === key);
        if (!palace)
            throw new Error(`ZIWEI_REQUIRED_PALACE_NOT_FOUND:${key}`);
        return palace;
    };
    return {
        engine: core.engine,
        engineVersion: core.engineVersion,
        chartCertified: core.validation.passed,
        birthInput: core.birthInput,
        soulPalaceBranch: core.lifePalace.earthlyBranch,
        bodyPalaceBranch: core.bodyPalace?.earthlyBranch ?? '',
        soulMaster: core.raw.soulMaster,
        bodyMaster: core.raw.bodyMaster,
        fiveElementsClass: core.raw.fiveElementsClass,
        palaces,
        lifePalace: byKey('MING'),
        bodyPalace: core.bodyPalace ? byKey(core.bodyPalace.key) : null,
        sanFangSiZheng: {
            target: byKey(core.sanFangSiZheng.target.key),
            wealth: byKey(core.sanFangSiZheng.wealth.key),
            career: byKey(core.sanFangSiZheng.career.key),
            opposite: byKey(core.sanFangSiZheng.opposite.key),
        },
        validation: {
            passed: core.validation.passed,
            lifePalacePassed: core.validation.lifePalaceFound,
            twelvePalaces: {
                passed: core.validation.palaceCount && core.validation.missingPalaces.length === 0,
                missing: core.validation.missingPalaces,
                present: core.palaces.map((palace) => palace.name),
            },
            majorStars: {
                passed: core.validation.majorStarsComplete && core.validation.noMajorStarDuplicate,
                missing: core.validation.missingMajorStars,
                duplicate: core.validation.duplicateMajorStars,
                positions: core.majorStarPositions.map((item) => ({
                    star: item.star,
                    palace: item.palace,
                    branch: item.earthlyBranch,
                    palaceKey: item.palaceKey,
                })),
            },
        },
    };
}
function getLifePalace(chart) {
    const palace = chart.palaces.find((item) => item.key === 'MING' || item.name === '命宮' || item.name === '命');
    if (!palace)
        throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');
    return palace;
}
function validateTwelvePalaces(chart) {
    const required = [
        'MING',
        'XIONG_DI',
        'FU_QI',
        'ZI_NV',
        'CAI_BO',
        'JI_E',
        'QIAN_YI',
        'JIAO_YOU',
        'GUAN_LU',
        'TIAN_ZHAI',
        'FU_DE',
        'FU_MU',
    ];
    const keys = new Set(chart.palaces.map((palace) => palace.key));
    const missing = required.filter((key) => !keys.has(key));
    return {
        passed: missing.length === 0 && chart.palaces.length === 12,
        missing,
        present: chart.palaces.map((palace) => palace.name),
    };
}
function validateMajorStars(chart) {
    const positions = chart.palaces.flatMap((palace) => palace.majorStars.map((star) => ({
        star: star.name,
        palace: palace.name,
        branch: palace.earthlyBranch,
        palaceKey: palace.key,
    })));
    const names = positions.map((item) => item.star);
    const missing = engine_1.MAJOR_STARS.filter((star) => !names.includes(star));
    const duplicate = engine_1.MAJOR_STARS.filter((star) => names.filter((name) => name === star).length > 1);
    return {
        passed: missing.length === 0 && duplicate.length === 0 && names.length === new Set(names).size,
        missing,
        duplicate,
        positions,
    };
}
function toBirthInput(input) {
    const date = input.date ?? input.birthDate;
    if (!date)
        throw new Error('INVALID_ZIWEI_BIRTH_DATE');
    const timeIndex = typeof input.timeIndex === 'number'
        ? input.timeIndex
        : typeof input.birthHour === 'number'
            ? (0, engine_1.hourToTimeIndex)(input.birthHour)
            : NaN;
    return {
        calendarType: input.calendarType ?? 'solar',
        date,
        gender: (0, engine_1.normalizeZiweiGender)(input.gender),
        timeIndex,
        isLeapMonth: input.isLeapMonth,
        fixLeap: input.fixLeap,
    };
}
function generateZiweiChart(input) {
    return toLegacyChart((0, engine_1.createZiweiCore)(toBirthInput(input)));
}
function assertChartCertifiedForAi(chart, options) {
    if (!options.isTimeKnown || !chart.validation.passed) {
        console.error('ZIWEI_CHART_VALIDATION_FAILED', {
            reason: !options.isTimeKnown ? 'BIRTH_TIME_NOT_CERTIFIED' : 'VALIDATION_NOT_PASSED',
            birthDate: options.birthDate,
            gender: options.gender,
            birthInput: chart.birthInput,
            lifePalace: `${chart.lifePalace.name}/${chart.lifePalace.earthlyBranch}`,
            missingPalaces: chart.validation.twelvePalaces.missing,
            missingMajorStars: chart.validation.majorStars.missing,
            duplicateMajorStars: chart.validation.majorStars.duplicate,
        });
        throw new Error('紫微斗數排盤驗證失敗，禁止進入 易經解盤');
    }
}
function isChartCertified(chart, isTimeKnown) {
    return Boolean(isTimeKnown) && chart.validation.passed;
}
