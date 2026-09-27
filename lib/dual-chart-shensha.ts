/** Dual-chart-only extension. Consumes the verified core; never recalculates pillars. */
import registryJson from '../docs/技能戰鬥檔案/八字/來源登記.json';
import { indexSources, type SourceRegistry } from './iching-source-gate';
import { evaluateBaziShenShaRule, type BaziTraditionalOutputGate } from './bazi-traditional-gate';
import { BRANCHES, type BaziProfessionalResult, type BaziShenShaItem, type Branch, type Stem } from './bazi/engine';

export const DUAL_SHENSHA_VERSION = 'DUAL_SHENSHA_SELECTED_V2';
const YANGREN: Record<Stem, Branch> = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
const JIANGXING: Record<Branch, Branch> = { 子: '子', 丑: '酉', 寅: '午', 卯: '卯', 辰: '子', 巳: '酉', 午: '午', 未: '卯', 申: '子', 酉: '酉', 戌: '午', 亥: '卯' };
const pillars = ['hour', 'day', 'month', 'year'] as const;
type Pillar = typeof pillars[number];
type Status = 'MATCHED' | 'NOT_MATCHED' | 'BLOCKED_VARIANT' | 'BLOCKED_SOURCE' | 'BLOCKED_CORE' | 'BLOCKED_DATA' | 'UNSUPPORTED';
export interface DualShenShaCoverage { id: string; name: string; status: Status; reason: string; matchedPillars: Pillar[] }

export function buildDualChartShenSha(core: BaziProfessionalResult, gate: BaziTraditionalOutputGate, gender?: 'male' | 'female') {
  // Never trust a caller's ready gate over the actual core verification.
  const coreReady = gate.coreReady && core.verification.readyForInterpretation;
  const registry = registryJson as unknown as SourceRegistry;
  const claim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YANGREN');
  const yangrenGate = evaluateBaziShenShaRule(claim, indexSources(registry), gate.coreReady && core.verification.readyForInterpretation);
  const yuanchenClaim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YUANCHEN');
  const yuanchenGate = evaluateBaziShenShaRule(yuanchenClaim, indexSources(registry), gate.coreReady && core.verification.readyForInterpretation);
  const jiangxingClaim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-JIANGXING');
  const jiangxingGate = evaluateBaziShenShaRule(jiangxingClaim, indexSources(registry), gate.coreReady && core.verification.readyForInterpretation);
  const gejiaoClaim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-GEJIAO');
  const gejiaoGate = evaluateBaziShenShaRule(gejiaoClaim, indexSources(registry), coreReady);
  const rules = { ...gate.shenShaRules, yangren: yangrenGate, yuanchen: yuanchenGate, jiangxing: jiangxingGate, gejiao: gejiaoGate };
  const raw: BaziShenShaItem[] = Array.isArray(core.shenSha) ? [...core.shenSha] : [];
  // Selected 1937 text, printed p72: day stem is anchor; inspect year/month/hour, not self.
  if (gate.coreReady && core.verification.readyForInterpretation && yangrenGate.status === 'VERIFIED') {
    for (const key of ['year', 'month', 'hour'] as const) {
      const pillar = core.pillars[key];
      if (pillar !== 'UNKNOWN' && pillar.earthlyBranch === YANGREN[core.dayMaster.stem]) raw.push({
        id: 'yangren', name: '羊刃', rule: `日干${core.dayMaster.stem}羊刃位${pillar.earthlyBranch}；查年月時（袁本十干法）`,
        evidence: `${key.toUpperCase()} 支${pillar.earthlyBranch}`, ruleVersion: 'MINGLI_TANYUAN_YANGREN_V1',
        source: { sourceId: 'S-MINGLI-TANYUAN-1937-SCAN', title: '增訂命理探原（1937訂正本；1938再版本對讀）', printedPage: '72', url: 'https://commons.wikimedia.org/wiki/File:NLC416-07jh011647-5318_命理探源.pdf?page=103#file' },
      });
    }
  }
  // Selected Tai Jin v6 method: birth-year branch is the anchor and only the hour branch is inspected.
  // Yang male / yin female advances 7 branches; yin male / yang female advances 5.
  if (coreReady && yuanchenGate.status === 'VERIFIED' && gender && typeof core.pillars.year !== 'string' && typeof core.pillars.hour !== 'string') {
    const yearIndex = BRANCHES.indexOf(core.pillars.year.earthlyBranch);
    const yangYear = yearIndex % 2 === 0;
    const advance = (yangYear && gender === 'male') || (!yangYear && gender === 'female') ? 7 : 5;
    const target = BRANCHES[(yearIndex + advance) % BRANCHES.length];
    if (core.pillars.hour.earthlyBranch === target) raw.push({
      id: 'yuanchen', name: '元辰',
      rule: `年支${core.pillars.year.earthlyBranch}、${gender === 'male' ? '男' : '女'}命取元辰${target}；只查時柱`,
      evidence: `HOUR 支${target}`, ruleVersion: 'TAIJIN_V6_YUANCHEN_YEAR_HOUR_V1',
      source: { sourceId: 'S-TAIJIN-V6-ZJLIB-SCAN', title: '太黅卷六（浙江圖書館藏明末刻本）', printedPage: '葉十二正反（PDF25–26）', url: 'https://commons.wikimedia.org/wiki/File:ZJLib-62836c27d8147868cc532705-4_太黅六卷_第4冊.pdf' },
    });
  }
  // Yuan Shushan 1937, printed pp64–65: day branch is the anchor; inspect year/month/hour only.
  if (coreReady && jiangxingGate.status === 'VERIFIED' && typeof core.pillars.day !== 'string') {
    const target = JIANGXING[core.pillars.day.earthlyBranch];
    for (const key of ['year', 'month', 'hour'] as const) {
      const pillar = core.pillars[key];
      if (pillar !== 'UNKNOWN' && pillar.earthlyBranch === target) raw.push({
        id: 'jiangxing', name: '將星',
        rule: `日支${core.pillars.day.earthlyBranch}取將星${target}；只查年月時`,
        evidence: `${key.toUpperCase()} 支${target}`, ruleVersion: 'JIANGXING_YUAN_1937_DAY_TO_YEAR_MONTH_HOUR',
        source: { sourceId: 'S-MINGLI-TANYUAN-1937-SCAN', title: '增訂命理探原（1937訂正本）', printedPage: '64–65（PDF95–96）', url: 'https://commons.wikimedia.org/wiki/File:NLC416-07jh011647-5318_命理探源.pdf' },
      });
    }
  }
  // Shenfeng Tongkao, 1929, vol.4 printed p14 (second file PDF16):
  // 日與時隔一字; the four printed examples all advance two branches.
  // The day is the anchor; only the hour can receive this result.
  const gejiaoDataReady = typeof core.pillars.day !== 'string' && typeof core.pillars.hour !== 'string';
  if (coreReady && gejiaoGate.ready && gejiaoDataReady && typeof core.pillars.hour !== 'string') {
    const target = BRANCHES[(BRANCHES.indexOf(core.pillars.day.earthlyBranch) + 2) % BRANCHES.length];
    if (core.pillars.hour.earthlyBranch === target) raw.push({
      id: 'gejiao', name: '隔角', rule: `日支${core.pillars.day.earthlyBranch}順隔一支為${target}；只查時柱`,
      evidence: `HOUR 支${target}`, ruleVersion: 'SHENFENG_1929_GEJIAO_DAY_HOUR_V1',
      source: { sourceId: 'S-SHENFENG-1929-V2-SCAN', title: '神峰通考（1929年秦慎安校勘本）', printedPage: '卷四14（第二冊PDF16）', url: 'https://commons.wikimedia.org/wiki/File:NLC511-027032013020556-10361_神峰通考_第2卷.pdf?page=16#file' },
    });
  }
  const byPillar = Object.fromEntries(pillars.map(key => [key, [] as BaziShenShaItem[]])) as Record<Pillar, BaziShenShaItem[]>;
  for (const hit of raw) {
    const rule = rules[hit.id as keyof typeof rules];
    if (!coreReady || !rule?.ready || rule.status !== 'VERIFIED' || rule.outputStatus !== 'READY') continue;
    const key = pillars.find(p => hit.evidence.startsWith(p.toUpperCase() + ' '));
    if (!key) throw new Error('特星神煞命中柱位資料不完整，暫不顯示，請重新排盤。');
    if (!byPillar[key].some(s => s.id === hit.id && s.name === hit.name)) byPillar[key].push(hit);
  }
  const yuanchenDataReady = Boolean(gender && typeof core.pillars.year !== 'string' && typeof core.pillars.hour !== 'string');
  const coverage: DualShenShaCoverage[] = [['yangren', '羊刃'], ['yuanchen', '元辰'], ['jiangxing', '將星'], ['taohua', '桃花'], ['yima', '驛馬'], ['tianyi', '天乙'], ['wenchang', '文昌'], ['huagai', '華蓋'], ['gejiao', '隔角']].map(([id, name]) => {
    const rule = rules[id as keyof typeof rules];
    const matchedPillars = pillars.filter(key => byPillar[key].some(s => s.id === id));
    const dataBlocked = (id === 'yuanchen' && !yuanchenDataReady) || (id === 'gejiao' && !gejiaoDataReady);
    return { id, name, status: !coreReady ? 'BLOCKED_CORE' : dataBlocked ? 'BLOCKED_DATA' : rule.outputStatus === 'READY' ? matchedPillars.length ? 'MATCHED' : 'NOT_MATCHED' : rule.outputStatus,
      reason: !coreReady ? '基礎四柱尚未通過驗證；不判定是否命中。' : dataBlocked ? id === 'gejiao' ? '隔角需要已確認的日柱與時柱；資料不足不判定未命中。' : '元辰需要已確認的性別、年柱與時柱；資料不足不判定未命中。' : rule.outputStatus === 'READY' ? `依已採用取法${matchedPillars.length ? '命中' : '未命中'}；不是所有流派皆無。` : rule.reasons.join('；'), matchedPillars };
  });
  return { version: DUAL_SHENSHA_VERSION, raw, byPillar, coverage, rules };
}
