import { calculateTenGod, HIDDEN_STEM_DICTIONARY, STEM_YINYANG, type Stem, type Branch, type BaziShenShaItem } from './bazi/engine';
import { Solar } from 'lunar-typescript';
import { createZiweiCore, createZiweiAstrolabe, hourToTimeIndex } from './ziwei/engine';
import { analyzeBazi } from './bazi-engine';
import { attachBaziProfessionalCoreV5, type BaziRuntimeInput } from './bazi-professional-result-v5';
import { runBaziLayer, runIChingLayer, runZiweiLayer } from './three-core-engine';
import { buildShenShaIChing } from './iching-shensha-iching';
import { buildShenShaGhost, GHOST_SEALED, sealShenShaGhost, type ShenShaGhostView, type ShenShaGhostSealed } from './iching-shensha-ghost';
import { buildShenShaAsura, type ShenShaAsuraView } from './iching-shensha-asura';

const sealedGhost = (view: ShenShaGhostView, reveal?: boolean): ShenShaGhostView | ShenShaGhostSealed => GHOST_SEALED && !reveal ? sealShenShaGhost(view) : view;
import { verifyFourPillars } from './four-pillar-verification';
import { getBaziTraditionalOutputGate } from './bazi-traditional-gate';
import { buildDualChartShenSha, buildFlowYearShenSha } from './dual-chart-iching-shensha';
import { buildShenShaFlow } from './iching-shensha-flow-year';
import { buildShenShaShare } from './iching-shensha-share';

/** revealSealedGhost 只給測試核對後端話術用；對外 API 一律不帶，鬼魅老師封印中只送卡頭。 */
export function calculateDualChart(body: unknown, options: { revealSealedGhost?: boolean } = {}) {
  if (!body || typeof body !== 'object') throw new Error('請填寫出生資料。');
  const input = body as Record<string, unknown>;
  if (input.calendarType !== 'solar' || input.timezone !== 'Asia/Taipei') throw new Error('基礎版僅支援國曆及台灣標準時間（UTC+8）。');
  if (input.gender !== 'male' && input.gender !== 'female') throw new Error('請選擇排盤性別。');
  if (typeof input.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) throw new Error('請填寫完整國曆出生日期。');
  const [y, m, d] = input.birthDate.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (y < 1901 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d || input.birthDate > today) throw new Error('請輸入 1901 年起至今天的有效出生日期。');
  if (input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthHourBranch === 'pending' || typeof input.birthTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime)) throw new Error('請補齊出生時辰，才能排出完整八字與紫微命盤。');
  const hourChoices = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];
  const hourBranchIndex = input.birthHourBranch === undefined ? undefined : hourChoices.indexOf(String(input.birthHourBranch));
  if (hourBranchIndex === -1) throw new Error('出生時辰無法辨識，請重新選擇。');
  const { core: bazi, bazi: baziLayer } = runBaziLayer({ birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender, hourBranchIndex });
  if (!bazi.verification.readyForInterpretation || bazi.pillars.hour === 'UNKNOWN') throw new Error('八字資料核對未通過，暫不繼續排盤。');
  if (!getBaziTraditionalOutputGate(bazi.verification.readyForInterpretation).coreReady) throw new Error('八字來源核對未通過，暫不繼續排盤。');
  const ziwei = createZiweiCore({ date: input.birthDate, calendarType: 'solar', gender: input.gender === 'male' ? '男' : '女', timeIndex: hourToTimeIndex(Number(input.birthTime.slice(0, 2))) });
  if (!ziwei.validation.passed || !bazi.verification.pillarsVerified || !bazi.verification.calendarVerified) throw new Error('命盤結構驗證未通過，請重新核對出生資料。');
  const runtimeInput: BaziRuntimeInput = { name: typeof input.name === 'string' ? input.name.slice(0, 60) : '', gender: input.gender, birthDate: input.birthDate, birthTime: input.birthTime, country: '台灣', city: '台北', calendarType: 'solar' };
  const professional = attachBaziProfessionalCoreV5(analyzeBazi(runtimeInput, bazi), runtimeInput, bazi);
  const samePillars = (['year', 'month', 'day', 'hour'] as const).every(key => {
    const pillar = bazi.pillars[key];
    return pillar !== 'UNKNOWN' && professional.professionalChart.pillarDetails[key]?.ganzhi === pillar.ganZhi;
  });
  if (!samePillars || professional.professionalChart.traditionalInterpretationGate?.coreReady !== true) throw new Error('命盤資料核對未通過，暫不提供結果，請重新排盤。');
  // 特星神煞衍生鏈：客戶資料 → 八字 → 紫微 → 四柱逐字核對（沿用三合一的 runZiweiLayer＋verifyFourPillars）→ 神煞。
  // 對不上就停在核對關，原樣列出哪一柱不同；不自動改任何一套。
  const baziInput = { birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender as 'male' | 'female', hourBranchIndex };
  const ziweiLayer = runZiweiLayer(baziInput, bazi);
  const pillarLabels = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' } as const;
  const ganZhiOf = (key: 'year' | 'month' | 'day' | 'hour') => { const p = bazi.pillars[key]; return p === 'UNKNOWN' ? '' : p.ganZhi; };
  const baziPillars = { year: ganZhiOf('year'), month: ganZhiOf('month'), day: ganZhiOf('day'), hour: ganZhiOf('hour') };
  const pillarCheck = ziweiLayer.status === 'READY'
    ? verifyFourPillars(baziPillars, { year: ziweiLayer.analysis.bazi.year, month: ziweiLayer.analysis.bazi.month, day: ziweiLayer.analysis.bazi.day, hour: ziweiLayer.analysis.bazi.hour })
    : { passed: false, differences: [] };
  const mismatches = ziweiLayer.status === 'READY'
    ? pillarCheck.differences.map(d => `${pillarLabels[d.pillar]}：八字${d.bazi}、紫微${d.ziwei || '缺'}`)
    : ['紫微命盤未完成，無法核對四柱'];
  const shenSha = buildDualChartShenSha(bazi, professional.professionalChart.traditionalInterpretationGate, input.gender, { passed: mismatches.length === 0, mismatches });
  // 《神煞易經》第④層：同一張已核對的命盤，沿用三合一帶憑證起卦，把特星神煞串進易經解盤。
  const iching = runIChingLayer({ input: baziInput, core: bazi, bazi: baziLayer, ziwei: ziweiLayer });
  const ichingView = buildShenShaIChing({ pillars: baziPillars, pillarCheckPassed: mismatches.length === 0, card: shenSha.card, iching });
  // 鬼魅老師（茅山道士話術分身）：同一張盤、同一個卦，後端另組一套說法。
  // 阿修羅（戰神解盤）：同一張盤、同一個卦，後端用霸道話術另組第三套說法。
  const specialStars = { ...shenSha, iching: ichingView, ghost: sealedGhost(buildShenShaGhost(ichingView, iching.status === 'READY' ? iching.reading : null), options.revealSealedGhost), asura: buildShenShaAsura(ichingView, iching.status === 'READY' ? iching.reading : null) };
  // Reuse the existing backend extension over the verified pillars; the UI only renders its results.
  // 參考取法項目沒有原典頁碼（source 省略）；所有讀取 source 的畫面都先判斷是否存在。
  const dualShenSha = specialStars.raw as BaziShenShaItem[];
  const dualCore = { ...bazi, shenSha: dualShenSha };
  const dualProfessionalChart = { ...professional.professionalChart, shenSha: dualShenSha,
    traditionalCore: dualCore,
    traditionalInterpretationGate: { ...professional.professionalChart.traditionalInterpretationGate, shenShaRules: specialStars.rules } };
  const raw = createZiweiAstrolabe(ziwei.birthInput);
  const periods = raw.palaces.map(palace => ({ branch: String(palace.earthlyBranch), range: palace.decadal?.range ?? [], stage: String(palace.changsheng12 ?? ''), ages: [...palace.ages], boshi: String(palace.boshi12), suiqian: String(palace.suiqian12), jiangqian: String(palace.jiangqian12) }));
  // Read the existing calendar library at mid-year, after Li Chun. No new annual algorithm.
  const startYear = Number(today.slice(0, 4));
  const annual = Array.from({ length: 15 }, (_, index) => {
    const year = startYear + index;
    const lunar = Solar.fromYmd(year, 7, 1).getLunar();
    const stem = lunar.getYearGanByLiChun() as Stem;
    const branch = lunar.getYearZhiByLiChun() as Branch;
    return { year, age: year - y + 1, ganzhi: lunar.getYearInGanZhiByLiChun(), stemGod: calculateTenGod(bazi.dayMaster.stem, stem), branchGod: calculateTenGod(bazi.dayMaster.stem, HIDDEN_STEM_DICTIONARY[branch].primary) };
  });
  // 流年神煞：今年＋明年（annual 以立春後的年干支為準），沿用本卡取法，後端算好話術。
  const flowCheck = { passed: mismatches.length === 0, mismatches };
  const flow = buildShenShaFlow(annual.slice(0, 2).map(a => buildFlowYearShenSha(bazi, professional.professionalChart.traditionalInterpretationGate!, input.gender as 'male' | 'female', flowCheck, { year: a.year, ganZhi: a.ganzhi })));
  const ziweiProfile = { polarity: STEM_YINYANG[raw.chineseDate[0] as Stem] ?? '', zodiac: raw.zodiac };

  // 【米其林穩定層】後端預計算的顯示可見性（消除前端 shenShaAvailability 邏輯）
  const gate = professional.professionalChart.traditionalInterpretationGate;
  const shenShaRuleIds = gate?.shenShaRules ? Object.keys(gate.shenShaRules) : [];
  const allowedShenShaIds = new Set(
    shenShaRuleIds.filter(id => {
      const rule = gate?.shenShaRules![id as keyof typeof gate.shenShaRules];
      return gate?.coreReady && rule?.ready &&
             (rule?.status === 'VERIFIED' || (rule as { referenceMethod?: boolean }).referenceMethod === true) &&
             rule?.outputStatus === 'READY';
    })
  );
  const shenShaVisibility = {
    allowed: allowedShenShaIds,
    conflicts: shenShaRuleIds
      .filter(id => !allowedShenShaIds.has(id))
      .filter(id => gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.status === 'CONFLICT' ||
                    gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.outputStatus === 'BLOCKED_VARIANT')
      .map(id => (gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.name) || id),
    pending: shenShaRuleIds
      .filter(id => !allowedShenShaIds.has(id))
      .filter(id => gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.status !== 'CONFLICT' &&
                    gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.outputStatus !== 'BLOCKED_VARIANT')
      .map(id => (gate?.shenShaRules![id as keyof typeof gate.shenShaRules]?.name) || id)
  };

  // 【米其林穩定層】紫微宮位預關聯周期（消除前端查詢邏輯）
  const periodsByBranch = new Map(periods.map(p => [p.branch, p]));
  const ziweiWithPeriods = {
    ...ziwei,
    palaces: ziwei.palaces.map(palace => ({
      ...palace,
      period: periodsByBranch.get(String(palace.earthlyBranch)) ?? null
    }))
  };

  return {
    bazi: { input: professional.input, professionalChart: dualProfessionalChart, luckCycles: professional.luckCycles },
    core: dualCore,
    specialStars: { ...specialStars, flow, share: buildShenShaShare(specialStars.card, ichingView, flow) },
    annual,
    ziwei: ziweiWithPeriods,
    periods,
    ziweiProfile,
    shenShaVisibility  // 【新增】米其林層級穩定化
  };
}
export type DualChartResult = ReturnType<typeof calculateDualChart> & {
  guide?: {
    tenGodMapping?: Array<{ tenGod: string; baziMeaning: string; synthesis: string }>;
    comparisonHint?: string;
  };
};
