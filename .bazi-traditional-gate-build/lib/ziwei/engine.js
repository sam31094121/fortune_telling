"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PALACE_MAP = exports.MAJOR_STARS = void 0;
exports.normalizeZiweiGender = normalizeZiweiGender;
exports.hourToTimeIndex = hourToTimeIndex;
exports.assertValidZiweiTimeIndex = assertValidZiweiTimeIndex;
exports.normalizePalaceName = normalizePalaceName;
exports.resolvePalaceKey = resolvePalaceKey;
exports.createZiweiAstrolabe = createZiweiAstrolabe;
exports.extractMajorStars = extractMajorStars;
exports.validateZiweiCore = validateZiweiCore;
exports.createZiweiCore = createZiweiCore;
exports.resolveSanFangSiZhengFor = resolveSanFangSiZhengFor;
exports.debugZiweiCore = debugZiweiCore;
const iztro_1 = require("iztro");
exports.MAJOR_STARS = [
    '紫微',
    '天機',
    '太陽',
    '武曲',
    '天同',
    '廉貞',
    '天府',
    '太陰',
    '貪狼',
    '巨門',
    '天相',
    '天梁',
    '七殺',
    '破軍',
];
exports.PALACE_MAP = {
    命: '命宮',
    命宮: '命宮',
    兄弟: '兄弟宮',
    兄弟宮: '兄弟宮',
    夫妻: '夫妻宮',
    夫妻宮: '夫妻宮',
    子女: '子女宮',
    子女宮: '子女宮',
    財帛: '財帛宮',
    財帛宮: '財帛宮',
    疾厄: '疾厄宮',
    疾厄宮: '疾厄宮',
    遷移: '遷移宮',
    遷移宮: '遷移宮',
    僕役: '交友宮',
    僕役宮: '交友宮',
    交友: '交友宮',
    交友宮: '交友宮',
    官祿: '官祿宮',
    官祿宮: '官祿宮',
    事業: '官祿宮',
    事業宮: '官祿宮',
    田宅: '田宅宮',
    田宅宮: '田宅宮',
    福德: '福德宮',
    福德宮: '福德宮',
    父母: '父母宮',
    父母宮: '父母宮',
};
const PALACE_KEY_BY_NAME = {
    命宮: 'MING',
    兄弟宮: 'XIONG_DI',
    夫妻宮: 'FU_QI',
    子女宮: 'ZI_NV',
    財帛宮: 'CAI_BO',
    疾厄宮: 'JI_E',
    遷移宮: 'QIAN_YI',
    交友宮: 'JIAO_YOU',
    官祿宮: 'GUAN_LU',
    田宅宮: 'TIAN_ZHAI',
    福德宮: 'FU_DE',
    父母宮: 'FU_MU',
};
const REQUIRED_PALACE_NAMES = Object.keys(PALACE_KEY_BY_NAME);
function normalizeTraditional(value) {
    return value
        .trim()
        .replace(/宫/g, '宮')
        .replace(/禄/g, '祿')
        .replace(/钺/g, '鉞');
}
function normalizeZiweiGender(gender) {
    return gender === 'female' || gender === '女' ? '女' : '男';
}
function hourToTimeIndex(hour) {
    const normalized = ((Math.trunc(hour) % 24) + 24) % 24;
    if (normalized === 23)
        return 12;
    if (normalized === 0)
        return 0;
    if (normalized >= 1 && normalized < 3)
        return 1;
    if (normalized >= 3 && normalized < 5)
        return 2;
    if (normalized >= 5 && normalized < 7)
        return 3;
    if (normalized >= 7 && normalized < 9)
        return 4;
    if (normalized >= 9 && normalized < 11)
        return 5;
    if (normalized >= 11 && normalized < 13)
        return 6;
    if (normalized >= 13 && normalized < 15)
        return 7;
    if (normalized >= 15 && normalized < 17)
        return 8;
    if (normalized >= 17 && normalized < 19)
        return 9;
    if (normalized >= 19 && normalized < 21)
        return 10;
    return 11;
}
function assertValidZiweiTimeIndex(timeIndex) {
    if (!Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) {
        throw new Error('INVALID_ZIWEI_TIME_INDEX');
    }
}
function normalizePalaceName(name) {
    const normalized = normalizeTraditional(name);
    return exports.PALACE_MAP[normalized] ?? normalized;
}
function resolvePalaceKey(name) {
    const key = PALACE_KEY_BY_NAME[normalizePalaceName(name)];
    if (!key)
        throw new Error(`ZIWEI_PALACE_NAME_UNSUPPORTED:${name}`);
    return key;
}
function normalizeMutagen(value) {
    if (typeof value !== 'string' || !value)
        return undefined;
    const normalized = normalizeTraditional(value);
    return ['祿', '權', '科', '忌'].includes(normalized) ? normalized : undefined;
}
function normalizeStarName(name) {
    return typeof name === 'string' ? normalizeTraditional(name) : '';
}
function isMajorStarName(name) {
    return exports.MAJOR_STARS.includes(name);
}
function normalizePalace(rawPalace) {
    const name = normalizePalaceName(String(rawPalace.name ?? ''));
    const key = resolvePalaceKey(name);
    const majorStarDetails = [];
    for (const rawStar of rawPalace.majorStars ?? []) {
        const starName = normalizeStarName(rawStar.name);
        if (!isMajorStarName(starName))
            continue;
        const brightness = rawStar.brightness;
        majorStarDetails.push({
            name: starName,
            brightness: typeof brightness === 'string' && brightness ? brightness : undefined,
            mutagen: normalizeMutagen(rawStar.mutagen),
        });
    }
    const minorStars = [...(rawPalace.minorStars ?? []), ...(rawPalace.adjectiveStars ?? [])]
        .map((star) => ({
        name: normalizeStarName(star.name),
        brightness: typeof star.brightness === 'string' && star.brightness ? star.brightness : undefined,
        mutagen: normalizeMutagen(star.mutagen),
    }))
        .filter((star) => Boolean(star.name) && !isMajorStarName(star.name));
    return {
        key,
        name,
        heavenlyStem: String(rawPalace.heavenlyStem ?? ''),
        earthlyBranch: String(rawPalace.earthlyBranch ?? ''),
        majorStars: majorStarDetails.map((star) => star.name),
        majorStarDetails,
        minorStars,
        isBodyPalace: Boolean(rawPalace.isBodyPalace),
    };
}
function getFunctionalPalace(astrolabe, palaceName) {
    const normalized = normalizePalaceName(palaceName);
    const direct = astrolabe.palace(normalized);
    if (direct)
        return direct;
    return astrolabe.palaces.find((palace) => normalizePalaceName(String(palace.name ?? '')) === normalized);
}
function normalizeSurrounded(surrounded) {
    return {
        target: normalizePalace(surrounded.target),
        wealth: normalizePalace(surrounded.wealth),
        career: normalizePalace(surrounded.career),
        opposite: normalizePalace(surrounded.opposite),
    };
}
function createZiweiAstrolabe(input) {
    assertValidZiweiTimeIndex(input.timeIndex);
    if (input.calendarType === 'solar') {
        return iztro_1.astro.bySolar(input.date, input.timeIndex, input.gender, input.fixLeap ?? true, 'zh-TW');
    }
    return iztro_1.astro.byLunar(input.date, input.timeIndex, input.gender, input.isLeapMonth ?? false, input.fixLeap ?? true, 'zh-TW');
}
function extractMajorStars(palaces) {
    return palaces.flatMap((palace) => palace.majorStarDetails.map((star) => ({
        star: star.name,
        palace: palace.name,
        palaceKey: palace.key,
        earthlyBranch: palace.earthlyBranch,
        brightness: star.brightness,
    })));
}
function validateZiweiCore(result) {
    const starNames = result.majorStarPositions.map((item) => item.star);
    const uniqueStars = new Set(starNames);
    const palaceNames = new Set(result.palaces.map((palace) => palace.name));
    const missingMajorStars = exports.MAJOR_STARS.filter((star) => !uniqueStars.has(star));
    const duplicateMajorStars = exports.MAJOR_STARS.filter((star) => starNames.filter((name) => name === star).length > 1);
    const missingPalaces = REQUIRED_PALACE_NAMES.filter((name) => !palaceNames.has(name));
    const palaceCount = result.palaces.length === 12;
    const lifePalaceFound = Boolean(result.lifePalace);
    const majorStarsComplete = missingMajorStars.length === 0;
    const noMajorStarDuplicate = starNames.length === uniqueStars.size && duplicateMajorStars.length === 0;
    return {
        palaceCount,
        lifePalaceFound,
        majorStarsComplete,
        noMajorStarDuplicate,
        passed: palaceCount && lifePalaceFound && majorStarsComplete && noMajorStarDuplicate && missingPalaces.length === 0,
        missingMajorStars,
        duplicateMajorStars,
        missingPalaces,
    };
}
function createZiweiCore(input) {
    const astrolabe = createZiweiAstrolabe(input);
    const lifeRaw = getFunctionalPalace(astrolabe, '命宮');
    if (!lifeRaw)
        throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');
    const bodyRaw = getFunctionalPalace(astrolabe, '身宮') ?? astrolabe.palaces.find((palace) => palace.isBodyPalace);
    const palaces = astrolabe.palaces.map(normalizePalace);
    const lifePalace = normalizePalace(lifeRaw);
    const bodyPalace = bodyRaw ? normalizePalace(bodyRaw) : undefined;
    const sanFangSiZheng = normalizeSurrounded(astrolabe.surroundedPalaces(lifeRaw.name));
    const majorStarPositions = extractMajorStars(palaces);
    const coreWithoutValidation = {
        engine: 'iztro',
        engineVersion: 'iztro@2.5.8',
        birthInput: input,
        raw: {
            solarDate: String(astrolabe.solarDate ?? ''),
            lunarDate: String(astrolabe.lunarDate ?? ''),
            chineseDate: String(astrolabe.chineseDate ?? ''),
            time: String(astrolabe.time ?? ''),
            timeRange: String(astrolabe.timeRange ?? ''),
            soulMaster: typeof astrolabe.soul === 'string' ? astrolabe.soul : undefined,
            bodyMaster: typeof astrolabe.body === 'string' ? astrolabe.body : undefined,
            fiveElementsClass: typeof astrolabe.fiveElementsClass === 'string' ? astrolabe.fiveElementsClass : undefined,
        },
        lifePalace,
        bodyPalace,
        palaces,
        majorStarPositions,
        sanFangSiZheng,
    };
    const validation = validateZiweiCore(coreWithoutValidation);
    if (!validation.passed) {
        console.error('ZIWEI_CORE_VALIDATION_FAILED', {
            birthInput: input,
            lifePalace: lifePalace ? `${lifePalace.name}/${lifePalace.heavenlyStem}${lifePalace.earthlyBranch}` : null,
            missingPalaces: validation.missingPalaces,
            missingMajorStars: validation.missingMajorStars,
            duplicateMajorStars: validation.duplicateMajorStars,
            positions: majorStarPositions,
        });
        throw new Error('ZIWEI_CORE_VALIDATION_FAILED');
    }
    return { ...coreWithoutValidation, validation };
}
/**
 * 任一宮位的三方四正（2026-08-22 依業主指示：紫微三老師系統要支援 12 宮切換，
 * 不能只有命宮）。iztro 的 `astrolabe.surroundedPalaces(indexOrName)` 本來就通用，
 * 不是綁死命宮——這裡只是重新用同一份 birthInput 建一次 astrolabe（跟 createZiweiCore
 * 用的是同一個決定性函式，同樣輸入永遠得到同一顆命盤），再對指定宮位取三方四正。
 * 不改 createZiweiCore 既有的命宮專用邏輯，純新增。
 */
function resolveSanFangSiZhengFor(input, palaceName) {
    const astrolabe = createZiweiAstrolabe(input);
    const raw = getFunctionalPalace(astrolabe, palaceName);
    if (!raw)
        throw new Error(`ZIWEI_PALACE_NOT_FOUND:${palaceName}`);
    return normalizeSurrounded(astrolabe.surroundedPalaces(raw.name));
}
function debugZiweiCore(result) {
    console.table(result.palaces.map((palace) => ({
        palace: palace.name,
        branch: palace.earthlyBranch,
        majorStars: palace.majorStars.join(', '),
    })));
    console.log('命宮', result.lifePalace);
    console.log('紫微核心測試盤', result);
}
