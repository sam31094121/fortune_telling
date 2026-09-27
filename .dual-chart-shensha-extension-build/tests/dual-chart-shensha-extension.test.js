"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const engine_1 = require("../lib/bazi/engine");
const dual_chart_shensha_1 = require("../lib/dual-chart-shensha");
const bazi_traditional_gate_1 = require("../lib/bazi-traditional-gate");
const dual_chart_1 = require("../lib/dual-chart");
// Independent transcription: 1937 printed p72, PDF103; 1938 PDF80–81.
const expected = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
const expectedJiangxing = { 子: '子', 丑: '酉', 寅: '午', 卯: '卯', 辰: '子', 巳: '酉', 午: '午', 未: '卯', 申: '子', 酉: '酉', 戌: '午', 亥: '卯' };
const base = (0, engine_1.createBaziCore)({ birthDate: '1974-06-28', birthTime: '18:00', birthTimeKnown: true, gender: 'male' });
const gate = (0, bazi_traditional_gate_1.getBaziTraditionalOutputGate)(true);
let cases = 0;
for (const [stem, target] of Object.entries(expected))
    for (const branch of engine_1.BRANCHES)
        for (const key of ['year', 'month', 'day', 'hour']) {
            const fixture = structuredClone(base);
            fixture.shenSha = [];
            fixture.dayMaster.stem = stem;
            // Synthetic rule-only fixtures: isolate exactly one target pillar.
            for (const p of ['year', 'month', 'day', 'hour']) {
                const model = fixture.pillars[p];
                if (model !== 'UNKNOWN')
                    model.earthlyBranch = engine_1.BRANCHES.find(b => b !== target);
            }
            const model = fixture.pillars[key];
            if (model !== 'UNKNOWN')
                model.earthlyBranch = branch;
            const result = (0, dual_chart_shensha_1.buildDualChartShenSha)(fixture, gate);
            const matches = result.raw.filter(s => s.id === 'yangren');
            strict_1.default.equal(matches.length, key !== 'day' && branch === target ? 1 : 0, `${stem}/${key}/${branch}`);
            if (matches.length)
                strict_1.default.equal(matches[0].evidence, `${key.toUpperCase()} 支${branch}`);
            cases++;
        }
const snapshot = JSON.stringify(base);
const scoped = (0, dual_chart_shensha_1.buildDualChartShenSha)(base, gate);
strict_1.default.equal(JSON.stringify(base), snapshot, 'shared input is never mutated');
strict_1.default.equal(scoped.rules.yangren.outputStatus, 'READY');
strict_1.default.equal(scoped.rules.tianyi.outputStatus, 'READY');
strict_1.default.equal(scoped.rules.wenchang.outputStatus, 'READY');
strict_1.default.deepEqual(scoped.byPillar.hour.map(s => s.name), ['羊刃']);
strict_1.default.deepEqual(scoped.byPillar.year.map(s => s.name), ['驛馬']);
strict_1.default.equal(scoped.coverage.find(s => s.id === 'taohua')?.status, 'NOT_MATCHED');
strict_1.default.equal(scoped.coverage.some(s => !['MATCHED', 'NOT_MATCHED', 'BLOCKED_DATA'].includes(s.status)), false, 'adopted scope contains no reference-only gaps');
strict_1.default.equal(scoped.coverage.find(s => s.id === 'yuanchen')?.status, 'BLOCKED_DATA', 'missing gender is not a miss');
// Independent Tai Jin v6 transcription: year branch + gender determines one hour branch.
let yuanchenCases = 0;
for (const [yearIndex, yearBranch] of engine_1.BRANCHES.entries())
    for (const gender of ['male', 'female'])
        for (const hourBranch of engine_1.BRANCHES) {
            const fixture = structuredClone(base);
            fixture.shenSha = [];
            if (typeof fixture.pillars.hour === 'string')
                throw new Error('fixture requires known hour');
            fixture.pillars.year.earthlyBranch = yearBranch;
            fixture.pillars.hour.earthlyBranch = hourBranch;
            const yangYear = yearIndex % 2 === 0;
            const advance = (yangYear && gender === 'male') || (!yangYear && gender === 'female') ? 7 : 5;
            const target = engine_1.BRANCHES[(yearIndex + advance) % 12];
            const result = (0, dual_chart_shensha_1.buildDualChartShenSha)(fixture, gate, gender);
            const hits = result.raw.filter(s => s.id === 'yuanchen');
            strict_1.default.equal(hits.length, hourBranch === target ? 1 : 0, `${yearBranch}/${gender}/${hourBranch}`);
            strict_1.default.equal(result.byPillar.year.some(s => s.id === 'yuanchen'), false, 'year is anchor, not target');
            strict_1.default.equal(result.byPillar.month.some(s => s.id === 'yuanchen'), false, 'month is outside selected scope');
            strict_1.default.equal(result.byPillar.day.some(s => s.id === 'yuanchen'), false, 'day is outside selected scope');
            if (hits.length)
                strict_1.default.equal(hits[0].evidence, `HOUR 支${hourBranch}`);
            yuanchenCases++;
        }
let jiangxingCases = 0;
for (const dayBranch of engine_1.BRANCHES)
    for (const targetKey of ['year', 'month', 'day', 'hour'])
        for (const candidate of engine_1.BRANCHES) {
            const fixture = structuredClone(base);
            fixture.shenSha = [];
            const anchorBranch = targetKey === 'day' ? candidate : dayBranch;
            const target = expectedJiangxing[anchorBranch];
            fixture.pillars.day.earthlyBranch = anchorBranch;
            for (const key of ['year', 'month', 'hour']) {
                const pillar = fixture.pillars[key];
                if (pillar === 'UNKNOWN')
                    throw new Error(`fixture requires known ${key}`);
                pillar.earthlyBranch = engine_1.BRANCHES.find(branch => branch !== target);
            }
            const targetPillar = fixture.pillars[targetKey];
            if (targetPillar === 'UNKNOWN')
                throw new Error(`fixture requires known ${targetKey}`);
            if (targetKey !== 'day')
                targetPillar.earthlyBranch = candidate;
            const result = (0, dual_chart_shensha_1.buildDualChartShenSha)(fixture, gate, 'male');
            const hits = result.raw.filter(s => s.id === 'jiangxing');
            strict_1.default.equal(hits.length, targetKey !== 'day' && candidate === target ? 1 : 0, `${dayBranch}/${targetKey}/${candidate}`);
            strict_1.default.equal(result.byPillar.day.some(s => s.id === 'jiangxing'), false, 'day is anchor, never target');
            jiangxingCases++;
        }
const blocked = (0, dual_chart_shensha_1.buildDualChartShenSha)(base, { ...gate, coreReady: false });
strict_1.default.equal(blocked.raw.some(s => s.id === 'yangren'), false);
strict_1.default.ok(Object.values(blocked.byPillar).every(a => a.length === 0));
const invalidCore = structuredClone(base);
invalidCore.verification.readyForInterpretation = false;
const invalidOutput = (0, dual_chart_shensha_1.buildDualChartShenSha)(invalidCore, gate);
strict_1.default.ok(Object.values(invalidOutput.byPillar).every(a => a.length === 0), 'caller gate must not override unverified core');
strict_1.default.ok(invalidOutput.coverage.filter(s => s.status !== 'UNSUPPORTED').every(s => s.status === 'BLOCKED_CORE'), 'blocked core must not look like a miss');
const partial = structuredClone(base);
partial.pillars.hour = 'UNKNOWN';
strict_1.default.equal((0, dual_chart_shensha_1.buildDualChartShenSha)(partial, gate).raw.some(s => s.id === 'yangren' && s.evidence.startsWith('HOUR')), false);
const input = { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
const actual = (0, dual_chart_1.calculateDualChart)(input);
strict_1.default.deepEqual(actual.core.pillars, base.pillars, 'extension cannot change the four pillars');
strict_1.default.deepEqual(actual.core.shenSha, actual.bazi.professionalChart.shenSha);
strict_1.default.deepEqual(actual.specialStars.byPillar.hour.map(s => s.name), ['羊刃', '元辰']);
strict_1.default.equal(actual.specialStars.coverage.find(s => s.id === 'yuanchen')?.status, 'MATCHED');
strict_1.default.deepEqual((0, dual_chart_1.calculateDualChart)(input).specialStars, actual.specialStars, 'repeat result deterministic');
const changed = (0, dual_chart_1.calculateDualChart)({ ...input, birthTime: '15:30' });
strict_1.default.equal(changed.core.shenSha.some(s => s.id === 'yangren'), false, 'different hour does not inherit a hardcoded hit');
strict_1.default.equal(base.shenSha instanceof Array && base.shenSha.some(s => s.id === 'yangren'), false, 'other cards retain original shared core');
console.log(`PASS ${cases} 羊刃 combinations + ${yuanchenCases} 元辰 combinations + ${jiangxingCases} 將星 combinations + gates, missing data, scope, photo, alternate hour, determinism and shared-core isolation`);
