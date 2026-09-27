/** Dual-chart-only extension. Consumes the verified core; never recalculates pillars. */
import registryJson from '../docs/技能戰鬥檔案/八字/來源登記.json';
import { indexSources, type SourceRegistry } from './iching-source-gate';
import { evaluateBaziShenShaRule, type BaziShenShaRuleGate, type BaziTraditionalOutputGate } from './bazi-traditional-gate';
import { buildShenShaCardView } from './dual-chart-shensha-card';
import { BRANCHES, type BaziProfessionalResult, type BaziShenShaItem, type Branch, type Stem } from './bazi/engine';

export const DUAL_SHENSHA_VERSION = 'DUAL_SHENSHA_REFERENCE_CHART_V4';
const YANGREN: Record<Stem, Branch> = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };

// ── 太極紫微易經派取法（本站自家一派，業主定案 2026-09-27）──────────────
// 客戶資料 → 八字 → 紫微 → 四柱核對 → 有邏輯地衍生特星神煞。
// 以業主提供的紙本命盤（1974-06-28 18:00 男，甲寅／庚午／庚子／乙酉，17 項特星神煞）為標準答案。原典頁碼尚待逐項補齊：來源狀態維持 PENDING_POOL，
// 由業主決定先行顯示並標註，不得寫成「已通過交叉比對」。
export const REFERENCE_RULE_VERSION = 'REFERENCE_CHART_1974_V1';
type Trine = '申子辰' | '寅午戌' | '巳酉丑' | '亥卯未';
const TRINE_OF: Record<Branch, Trine> = { 申: '申子辰', 子: '申子辰', 辰: '申子辰', 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' };
/** 三合局查表：桃花（咸池）、將星、災煞、六厄。 */
const TRINE_TABLE: Record<'taohua' | 'jiangxing' | 'zaisha' | 'liue', Record<Trine, Branch>> = {
  taohua: { 申子辰: '酉', 寅午戌: '卯', 巳酉丑: '午', 亥卯未: '子' },
  jiangxing: { 申子辰: '子', 寅午戌: '午', 巳酉丑: '酉', 亥卯未: '卯' },
  zaisha: { 申子辰: '午', 寅午戌: '子', 巳酉丑: '卯', 亥卯未: '酉' },
  liue: { 申子辰: '卯', 寅午戌: '酉', 巳酉丑: '子', 亥卯未: '午' },
};
/** 月支取天德／天德合／月德（天干或地支皆可為目標）。 */
const TIANDE: Record<Branch, Stem | Branch> = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const TIANDEHE: Record<Branch, Stem | Branch> = { 寅: '壬', 卯: '巳', 辰: '丁', 巳: '丙', 午: '寅', 未: '己', 申: '戊', 酉: '亥', 戌: '辛', 亥: '庚', 子: '申', 丑: '乙' };
const YUEDE: Record<Branch, Stem> = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
/** 2026-09-27 擴充（業主指定先做五個）：常見查表，列為本派取法，原典頁碼待補。 */
const KUIGANG_DAYS = ['庚辰', '庚戌', '壬辰', '戊戌'];
const JINYU: Record<Stem, Branch> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };
/** 學堂＝日干長生位。 */
const XUETANG: Record<Stem, Branch> = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
const HONGYAN: Record<Stem, Branch> = { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' };
const STEMS_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
/** 2026-09-27 第二批：孤辰寡宿依年支方局、劫煞依年支三合、祿神依日干、天醫依月支前一位。 */
const GUCHEN_GUASU: Record<Branch, [Branch, Branch]> = {
  亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'], 寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'],
  巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'], 申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未'],
};
const JIESHA: Record<Trine, Branch> = { 申子辰: '巳', 寅午戌: '亥', 巳酉丑: '寅', 亥卯未: '申' };
const LUSHEN: Record<Stem, Branch> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };

/** 日柱所在旬的兩個空亡地支。 */
export function xunKong(stem: Stem, branch: Branch): [Branch, Branch] {
  const start = (BRANCHES.indexOf(branch) - STEMS_ORDER.indexOf(stem) + 12) % 12; // 旬首（甲）所在地支
  return [BRANCHES[(start + 10) % 12], BRANCHES[(start + 11) % 12]];
}

/** 年支順數的歲神位：五鬼＋4、龍德＋7、天狗＋10。 */
const YEAR_OFFSET = { wugui: 4, longde: 7, tiangou: 10 } as const;

const pillars = ['hour', 'day', 'month', 'year'] as const;
type Pillar = typeof pillars[number];
type Status = 'MATCHED' | 'NOT_MATCHED' | 'BLOCKED_VARIANT' | 'BLOCKED_SOURCE' | 'BLOCKED_CORE' | 'BLOCKED_DATA' | 'UNSUPPORTED';
export interface DualShenShaCoverage { id: string; name: string; status: Status; reason: string; matchedPillars: Pillar[] }
export type DualShenShaRule = BaziShenShaRuleGate & { referenceMethod?: true };
/** 本卡專用：參考取法項目尚無原典頁碼，source 可省略（不更動八字核心的型別）。 */
export type DualShenShaItem = Omit<BaziShenShaItem, 'source'> & { source?: BaziShenShaItem['source'] };

/** 顯示順序與名稱（同柱依此排列，與紙本排法相近）。 */
export const DUAL_SHENSHA_RULES: ReadonlyArray<readonly [string, string]> = [
  ['tiandehe', '天德合'], ['tiande', '天德'], ['yuede', '月德'], ['longde', '龍德'], ['tiangou', '天狗'], ['jinkui', '金匱'],
  ['wugui', '五鬼'], ['zaisha', '災煞'], ['liue', '六厄'], ['muyu', '沐浴'], ['yuepo', '月破'], ['ripo', '日破'],
  ['jiangxing', '將星'], ['yima', '驛馬'], ['gejiao', '隔角'], ['yuanchen', '元辰'], ['yangren', '羊刃'],
  ['taohua', '桃花'], ['waiTaohua', '外桃花'], ['tianyi', '天乙'], ['wenchang', '文昌'], ['huagai', '華蓋'],
  ['kuigang', '魁罡'], ['kongwang', '空亡'], ['jinyu', '金輿'], ['xuetang', '學堂'], ['hongyan', '紅艷'],
  ['lushen', '祿神'], ['tianyiDoctor', '天醫'], ['jiesha', '劫煞'], ['guchen', '孤辰'], ['guasu', '寡宿'],
];

/** 八字與紫微四柱逐字核對結果；神煞從這兩張已核對的命盤衍生，不另排四柱。 */
export interface BaziZiweiPillarCheck { passed: boolean; mismatches: string[] }

export function buildDualChartShenSha(core: BaziProfessionalResult, gate: BaziTraditionalOutputGate, gender?: 'male' | 'female', pillarCheck?: BaziZiweiPillarCheck) {
  // Never trust a caller's ready gate over the actual core verification.
  // 呼叫端有提供八字紫微核對時，四柱必須逐字一致才衍生神煞；對不上就停在核對關，不自動改任何一套。
  const coreReady = gate.coreReady && core.verification.readyForInterpretation && pillarCheck?.passed !== false;
  const registry = registryJson as unknown as SourceRegistry;
  const claim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YANGREN');
  const yangrenGate = evaluateBaziShenShaRule(claim, indexSources(registry), gate.coreReady && core.verification.readyForInterpretation);
  const yuanchenClaim = registry.claims.find(c => c.claim_id === 'C-DUAL-SHENSHA-YUANCHEN');
  const yuanchenGate = evaluateBaziShenShaRule(yuanchenClaim, indexSources(registry), gate.coreReady && core.verification.readyForInterpretation);
  // 已登記的舊取法（袁本將星、神峰隔角、袁本天德月德、袁本桃花）保留作版本對照，不再作正式輸出。
  const legacy = (claimId: string) => evaluateBaziShenShaRule(registry.claims.find(c => c.claim_id === claimId), indexSources(registry), coreReady).comparisons;
  const reference = (summary: string, comparisons: BaziShenShaRuleGate['comparisons'] = []): DualShenShaRule => ({
    status: 'PENDING_POOL', ready: coreReady, outputStatus: coreReady ? 'READY' : 'BLOCKED_CORE',
    reasons: ['依太極紫微易經派取法（本站自家一派，業主定案 2026-09-27）；原典來源待補，不代表已通過交叉比對'],
    verificationScope: 'SELECTED_EDITION', comparisons, referenceMethod: true,
    method: { title: '太極紫微易經派取法', edition: '本站自家一派，以業主提供參考命盤核對', ruleVersion: REFERENCE_RULE_VERSION, summary, sourceUrl: '', printedPage: '原典待補' },
  });
  const rules: Record<string, DualShenShaRule> = {
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
    hongyan: reference('日干取紅艷（甲乙午、丙寅、丁未、戊己辰、庚戌、辛酉、壬子、癸申），四柱皆查。'),
  };
  // 核心引擎的袁本桃花（含納音條件）只供其他卡片使用；本卡改依參考命盤取法重查。
  const raw: DualShenShaItem[] = Array.isArray(core.shenSha) ? core.shenSha.filter(item => item.id !== 'taohua') : [];
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

  // ── 太極紫微易經派取法：全部只讀已核對四柱，不重排 ──
  if (coreReady) {
    const at = (key: Pillar) => { const p = core.pillars[key]; return p === 'UNKNOWN' ? null : p; };
    const push = (id: string, name: string, key: Pillar, rule: string, evidence: string) => {
      if (!raw.some(s => s.id === id && s.evidence.startsWith(`${key.toUpperCase()} `))) {
        raw.push({ id, name, rule, evidence: `${key.toUpperCase()} ${evidence}`, ruleVersion: REFERENCE_RULE_VERSION });
      }
    };
    /** 在指定柱位找地支等於 target 者。 */
    const branchHit = (id: string, name: string, target: Branch, keys: readonly Pillar[], rule: string) => {
      for (const key of keys) if (at(key)?.earthlyBranch === target) push(id, name, key, rule, `支${target}`);
    };
    /** 目標可能是天干或地支（天德、天德合、月德）。 */
    const stemOrBranchHit = (id: string, name: string, target: Stem | Branch, rule: string) => {
      for (const key of pillars) {
        const p = at(key);
        if (!p) continue;
        if (p.heavenlyStem === target) push(id, name, key, rule, `干${target}`);
        else if (p.earthlyBranch === target) push(id, name, key, rule, `支${target}`);
      }
    };
    const clash = (b: Branch) => BRANCHES[(BRANCHES.indexOf(b) + 6) % 12];
    const year = at('year'); const month = at('month'); const day = at('day');
    if (day) {
      const dayTrine = TRINE_OF[day.earthlyBranch];
      const taohua = TRINE_TABLE.taohua[dayTrine];
      branchHit('taohua', '桃花', taohua, ['year', 'month', 'hour'], `日支${day.earthlyBranch}（${dayTrine}）咸池在${taohua}；查年月時`);
      if (at('hour')?.earthlyBranch === taohua) push('waiTaohua', '外桃花', 'hour', `桃花${taohua}落在時柱`, `支${taohua}`);
      const jiangxing = TRINE_TABLE.jiangxing[dayTrine];
      branchHit('jiangxing', '將星', jiangxing, pillars, `日支${day.earthlyBranch}（${dayTrine}）將星在${jiangxing}；四柱皆查`);
      const gejiao = BRANCHES[(BRANCHES.indexOf(day.earthlyBranch) + 2) % 12];
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
      const yi = BRANCHES.indexOf(y);
      const yearTrine = TRINE_OF[y];
      const rest = ['month', 'day', 'hour'] as const;
      branchHit('longde', '龍德', BRANCHES[(yi + YEAR_OFFSET.longde) % 12], rest, `年支${y}順數七位龍德在${BRANCHES[(yi + 7) % 12]}；查月日時`);
      branchHit('tiangou', '天狗', BRANCHES[(yi + YEAR_OFFSET.tiangou) % 12], rest, `年支${y}順數十位天狗在${BRANCHES[(yi + 10) % 12]}；查月日時`);
      branchHit('wugui', '五鬼', BRANCHES[(yi + YEAR_OFFSET.wugui) % 12], rest, `年支${y}順數四位五鬼在${BRANCHES[(yi + 4) % 12]}；查月日時`);
      branchHit('jinkui', '金匱', TRINE_TABLE.jiangxing[yearTrine], rest, `年支${y}（${yearTrine}）金匱在${TRINE_TABLE.jiangxing[yearTrine]}；查月日時`);
      branchHit('zaisha', '災煞', TRINE_TABLE.zaisha[yearTrine], rest, `年支${y}（${yearTrine}）災煞在${TRINE_TABLE.zaisha[yearTrine]}；查月日時`);
      branchHit('liue', '六厄', TRINE_TABLE.liue[yearTrine], rest, `年支${y}（${yearTrine}）六厄在${TRINE_TABLE.liue[yearTrine]}；查月日時`);
    }
    if (day) {
      const ds = day.heavenlyStem as Stem;
      if (KUIGANG_DAYS.includes(day.ganZhi)) push('kuigang', '魁罡', 'day', `日柱${day.ganZhi}為魁罡日`, `柱${day.ganZhi}`);
      const [k1, k2] = xunKong(ds, day.earthlyBranch);
      for (const target of [k1, k2]) branchHit('kongwang', '空亡', target, ['year', 'month', 'hour'], `日柱${day.ganZhi}旬空${k1}${k2}；查年月時`);
      branchHit('jinyu', '金輿', JINYU[ds], pillars, `日干${ds}金輿在${JINYU[ds]}；四柱皆查`);
      branchHit('xuetang', '學堂', XUETANG[ds], pillars, `日干${ds}長生在${XUETANG[ds]}為學堂；四柱皆查`);
      branchHit('hongyan', '紅艷', HONGYAN[ds], pillars, `日干${ds}紅艷在${HONGYAN[ds]}；四柱皆查`);
      branchHit('lushen', '祿神', LUSHEN[ds], pillars, `日干${ds}祿在${LUSHEN[ds]}；四柱皆查`);
    }
    if (year) {
      const [gu, gua] = GUCHEN_GUASU[year.earthlyBranch];
      branchHit('guchen', '孤辰', gu, ['month', 'day', 'hour'], `年支${year.earthlyBranch}孤辰在${gu}；查月日時`);
      branchHit('guasu', '寡宿', gua, ['month', 'day', 'hour'], `年支${year.earthlyBranch}寡宿在${gua}；查月日時`);
      const js = JIESHA[TRINE_OF[year.earthlyBranch]];
      branchHit('jiesha', '劫煞', js, ['month', 'day', 'hour'], `年支${year.earthlyBranch}（${TRINE_OF[year.earthlyBranch]}）劫煞在${js}；查月日時`);
    }
    if (month) {
      const doctor = BRANCHES[(BRANCHES.indexOf(month.earthlyBranch) + 11) % 12];
      branchHit('tianyiDoctor', '天醫', doctor, ['year', 'day', 'hour'], `月支${month.earthlyBranch}前一位${doctor}為天醫；查年日時`);
    }
    for (const key of pillars) {
      if (at(key) && core.twelveStages[key] === '沐浴') push('muyu', '沐浴', key, `日干${core.dayMaster.stem}十二運至${at(key)!.earthlyBranch}為沐浴`, `支${at(key)!.earthlyBranch}`);
    }
  }

  const byPillar = Object.fromEntries(pillars.map(key => [key, [] as DualShenShaItem[]])) as Record<Pillar, DualShenShaItem[]>;
  const rank = new Map(DUAL_SHENSHA_RULES.map(([id], index) => [id, index]));
  for (const hit of raw) {
    const rule = rules[hit.id];
    if (!coreReady || !rule?.ready || (rule.status !== 'VERIFIED' && !rule.referenceMethod) || rule.outputStatus !== 'READY') continue;
    const key = pillars.find(p => hit.evidence.startsWith(p.toUpperCase() + ' '));
    if (!key) throw new Error('特星神煞命中柱位資料不完整，暫不顯示，請重新排盤。');
    if (!byPillar[key].some(s => s.id === hit.id && s.name === hit.name)) byPillar[key].push(hit);
  }
  for (const key of pillars) byPillar[key].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
  const hourKnown = typeof core.pillars.hour !== 'string';
  const yuanchenDataReady = Boolean(gender && typeof core.pillars.year !== 'string' && hourKnown);
  const coverage: DualShenShaCoverage[] = DUAL_SHENSHA_RULES.map(([id, name]) => {
    const rule = rules[id];
    const matchedPillars = pillars.filter(key => byPillar[key].some(s => s.id === id));
    const dataBlocked = (id === 'yuanchen' && !yuanchenDataReady) || (id === 'waiTaohua' && !hourKnown);
    return { id, name, status: !coreReady ? 'BLOCKED_CORE' : dataBlocked ? 'BLOCKED_DATA' : rule.outputStatus === 'READY' ? matchedPillars.length ? 'MATCHED' : 'NOT_MATCHED' : rule.outputStatus,
      reason: pillarCheck?.passed === false ? `八字與紫微四柱不一致（${pillarCheck.mismatches.join('；')}）；不判定是否命中。` : !coreReady ? '基礎四柱尚未通過驗證；不判定是否命中。' : dataBlocked ? id === 'waiTaohua' ? '外桃花需要已確認的時柱；資料不足不判定未命中。' : '元辰需要已確認的性別、年柱與時柱；資料不足不判定未命中。' : rule.outputStatus === 'READY' ? `依已採用取法${matchedPillars.length ? '命中' : '未命中'}；不是所有流派皆無。` : rule.reasons.join('；'), matchedPillars };
  });
  // 卡片要顯示的內容在後端一次決定；前端只照印。
  const card = buildShenShaCardView({ raw, byPillar, coverage }, coreReady, pillarCheck?.passed === false ? pillarCheck.mismatches : undefined);
  // 原核心規則（袁本）不動，只作來源對照說明用；本卡的正式輸出以 rules 為準。
  // 來源說明句由後端給，前端只照印（前端禁止生成）。
  const sourceNote = {
    zh: '特星神煞依本站太極紫微易經派取法；下方列袁樹珊取法作來源對照。',
    en: 'Special stars follow this site’s own Taiji–Ziwei–I Ching method; Yuan Shushan’s method is listed below for comparison. ',
  };
  return { version: DUAL_SHENSHA_VERSION, raw, byPillar, coverage, rules, card, sourceComparisonRules: gate.shenShaRules, sourceNote };
}
