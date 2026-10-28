/**
 * 阿修羅九宮融會（鬼魅阿修羅技能檔案：九宮融會.md）
 * ============================================================================
 * 把四套既有運算接成一條有前後順序的阿修羅話術：
 *   根（西方生命密碼的生命主數）→ 盤（九宮格靈動數字）→ 合（主數落在盤上）
 *   → 位（洛書九宮）→ 名（姓名學五格，有填姓名才有）→ 斷（阿修羅收束）
 *
 * 鐵律：
 * - 不新增任何命理運算：數字、次數、宮位、連線全部取自既有後端結果（study／nameOverlay／生命密碼引擎）。
 * - 既有核可文字照引並保留原本的來源標示（sources）；阿修羅只寫「連接與收束」的短句（asura），
 *   這些短句只依事實的真假（有／缺、亮／不亮）選用，不自行加入新的個性或命運判斷。
 * - 大師數（11／22／33）沒有核可解說：只陳述數字，不借單位數的解說；不入九格就略過「合」。
 * - 本站交叉對照，非古法；狀態維持待驗證，僅作自我反思參考。
 * - 純函式、無 server-only：話術規範由 lintAsuraVoice 在測試中檢查。
 */
import type { NineGridStudy } from './nine-grid-numbers';
import type { NineGridNameOverlay } from './nine-grid-name-overlay';
import lifeCodeMeanings from '../docs/技能戰鬥檔案/西方生命密碼/主數解說.json';

export const ASURA_FUSION_VERSION = 'ASURA_NINE_GRID_FUSION_V1';
export const ASURA_FUSION_LABEL = '本站交叉對照，非古法・仍在查證中，僅作自我反思參考';

export type FusionStepKey = 'root' | 'grid' | 'join' | 'luoshu' | 'name' | 'verdict';
export type FusionStepStatus = 'READY' | 'SKIPPED' | 'NOT_PROVIDED' | 'UNAVAILABLE';

export interface FusionSource { text: string; provenanceLabel: string }

export interface FusionStep {
  key: FusionStepKey;
  /** 一個字的步驟名（根、盤、合、位、名、斷） */
  mark: string;
  title: string;
  status: FusionStepStatus;
  /** 阿修羅口吻（連接與收束短句；受 lintAsuraVoice 檢查） */
  asura: string[];
  /** 算出來的事實（直接來自既有後端結果） */
  facts: string[];
  /** 既有核可文字，照引並附原來源標示 */
  sources: FusionSource[];
}

export interface AsuraFusion {
  version: typeof ASURA_FUSION_VERSION;
  label: string;
  /** 固定順序：根、盤、合、位、名、斷 */
  steps: FusionStep[];
  /** 供稽核：結論所依據的事實旗標 */
  basis: {
    lifePath: number | null;
    mainInGrid: 'present' | 'absent' | 'not-applicable';
    missingCount: number;
    nameFill: 'filled' | 'unfilled' | 'not-provided';
  };
}

/** 生命密碼引擎回傳中，融會只用到的最小形狀。 */
export interface FusionLifeCode {
  cards: Array<{
    id: string;
    status?: string;
    final_value?: unknown;
    steps?: string[];
    interpretation?: { text?: string; review_status?: string };
  }>;
}

interface MeaningEntry { number: number; declaration?: string; reviewStatus?: string }
const MEANINGS = (lifeCodeMeanings as { entries: MeaningEntry[] }).entries;

const DIGIT_LABEL = (digits: readonly number[]) => (digits.length ? digits.join('、') : '無');

function lifePathOf(lifeCode: FusionLifeCode | null | undefined) {
  const card = lifeCode?.cards?.find((c) => c.id === 'lifePath');
  if (!card || card.status !== 'PASSED' || typeof card.final_value !== 'number') return null;
  return { value: card.final_value, steps: card.steps ?? [], reviewed: card.interpretation?.review_status === 'SOURCE_CHECKED' };
}

function rootStep(lifeCode: FusionLifeCode | null | undefined): { step: FusionStep; lifePath: number | null } {
  const path = lifePathOf(lifeCode);
  const lead = '先看根。生辰所化的數，不會騙人。';
  if (!path) {
    return {
      lifePath: null,
      step: {
        key: 'root', mark: '根', title: '生命主數', status: 'UNAVAILABLE',
        asura: [lead, '此數未過核對，我不下判。'], facts: ['生命主數尚未完成核對'], sources: [],
      },
    };
  }
  const isMaster = path.value === 11 || path.value === 22 || path.value === 33;
  const entry = MEANINGS.find((e) => e.number === path.value);
  // 解說只在引擎已標為「來源核對」且該數有核可條目時才用，與生命密碼卡的放行條件一致。
  const sources: FusionSource[] = path.reviewed && entry?.declaration && !isMaster
    ? [{ text: entry.declaration, provenanceLabel: `生命密碼主數解說・${ASURA_FUSION_LABEL}` }]
    : [];
  return {
    lifePath: path.value,
    step: {
      key: 'root', mark: '根', title: '生命主數', status: 'READY',
      asura: sources.length ? [lead] : [lead, isMaster ? '大師數解說未核，我不借別數的話。' : '此數解說未核，我不替它編詞。'],
      facts: [`生命主數 ${path.value}`, ...path.steps],
      sources,
    },
  };
}

function gridStep(study: NineGridStudy): FusionStep {
  const { dominant, missing, litLines, maxCount } = study.summary;
  const byDigit = new Map(study.digits.map((d) => [d.digit, d]));
  const sources: FusionSource[] = [];
  for (const digit of dominant.slice(0, 3)) {
    const d = byDigit.get(digit);
    if (d) sources.push({ text: `${d.digit}（${d.title}）：${d.trait}`, provenanceLabel: d.provenanceLabel });
  }
  const asura = ['再看盤。九格之中，有的滿，有的空。'];
  // 生日只有 8 位數字，九格至少缺一格，所以這裡一定有缺。
  asura.push(`缺 ${DIGIT_LABEL(missing)}。空的格，我照見了。`);
  asura.push(litLines > 0 ? `亮起 ${litLines} 條線。` : '無一線全亮。');
  return {
    key: 'grid', mark: '盤', title: '九宮格靈動數字', status: 'READY', asura,
    facts: [study.summary.text, `出現最多：${DIGIT_LABEL(dominant)}（各 ${maxCount} 次）`],
    sources,
  };
}

type Join = { step: FusionStep; mainInGrid: AsuraFusion['basis']['mainInGrid'] };

function joinStep(study: NineGridStudy, lifePath: number | null): Join {
  const lead = '再合根與盤。';
  if (lifePath === null || lifePath < 1 || lifePath > 9) {
    const why = lifePath === null ? '主數未過核對，這一步略過。' : '大師數不入九格，這一步略過。';
    return {
      mainInGrid: 'not-applicable',
      step: { key: 'join', mark: '合', title: '主數落在盤上', status: 'SKIPPED', asura: [lead, why], facts: [], sources: [] },
    };
  }
  const cell = study.cells.find((c) => c.digit === lifePath);
  const count = cell?.count ?? 0;
  const present = count > 0;
  return {
    mainInGrid: present ? 'present' : 'absent',
    step: {
      key: 'join', mark: '合', title: '主數落在盤上', status: 'READY',
      asura: [lead, present ? `主數 ${lifePath} 在盤，現 ${count} 次。根與盤相認。` : `主數 ${lifePath} 不在盤。根在盤外。`],
      facts: [`生命主數 ${lifePath}，生日數字裡出現 ${count} 次`],
      sources: [],
    },
  };
}

function luoshuStep(study: NineGridStudy, lifePath: number | null): FusionStep {
  const overlay = study.luoshu.birthOverlay;
  const lead = '再看位。洛書定九宮，數各歸其位。';
  if (!overlay) {
    return { key: 'luoshu', mark: '位', title: '洛書九宮', status: 'UNAVAILABLE', asura: [lead, '生辰未入宮，我不下判。'], facts: [], sources: [] };
  }
  const sources: FusionSource[] = [];
  const facts = [overlay.summary];
  if (lifePath !== null && lifePath >= 1 && lifePath <= 9) {
    const palace = study.luoshu.palaces.find((p) => p.digit === lifePath);
    if (palace) {
      facts.push(`主數 ${lifePath} 在洛書：${palace.palace}${palace.trigram ? `（${palace.trigram}）` : ''}`);
      sources.push({ text: palace.speech.text, provenanceLabel: palace.speech.provenanceLabel });
    }
  }
  return { key: 'luoshu', mark: '位', title: '洛書九宮', status: 'READY', asura: [lead], facts, sources };
}

function nameStep(study: NineGridStudy, overlay: NineGridNameOverlay | null | undefined): { step: FusionStep; fill: AsuraFusion['basis']['nameFill'] } {
  const lead = '最後看名。名裡的數，也要入格。';
  if (!overlay) {
    return {
      fill: 'not-provided',
      step: { key: 'name', mark: '名', title: '姓名五格', status: 'NOT_PROVIDED', asura: [lead, '未填姓名，此步不下判。'], facts: [], sources: [] },
    };
  }
  const lineName = new Map(study.lines.map((l) => [l.id, l.name]));
  const newlyLit = overlay.lines.filter((l) => !l.litByBirth && l.litWithName).map((l) => lineName.get(l.id) ?? l.id);
  const filled = newlyLit.length > 0;
  const asura = [lead, filled ? `名補亮 ${newlyLit.length} 條線。缺的，名替盤填了。` : '名未補亮新線。盤上缺的，仍缺。'];
  if (overlay.doubleEmphasis.length) asura.push(`${DIGIT_LABEL(overlay.doubleEmphasis)} 格，生辰與名同落。`);
  return {
    fill: filled ? 'filled' : 'unfilled',
    step: {
      key: 'name', mark: '名', title: '姓名五格', status: 'READY', asura,
      facts: [
        `五格：${overlay.grids.map((g) => `${g.label}${g.value}`).join('、')}`,
        `名補亮的線：${newlyLit.length ? newlyLit.join('、') : '無'}`,
        `生辰與名同時落入的格：${DIGIT_LABEL(overlay.doubleEmphasis)}`,
      ],
      sources: [{ text: overlay.note, provenanceLabel: overlay.label }],
    },
  };
}

function verdictStep(basis: AsuraFusion['basis']): FusionStep {
  const asura: string[] = [];
  if (basis.mainInGrid === 'present') {
    asura.push('根在盤中，盤有缺口。');
    asura.push('補缺之前，先守住根。');
  } else if (basis.mainInGrid === 'absent') {
    asura.push('根不在盤。缺的那格，是這局的課題。');
  } else {
    asura.push('主數不入九格。盤與位各自成章，我只陳其實。');
  }
  if (basis.nameFill === 'filled') asura.push('名已補亮新線。');
  if (basis.nameFill === 'unfilled') asura.push('名未補亮新線。');
  return {
    key: 'verdict', mark: '斷', title: '阿修羅收束', status: 'READY', asura,
    facts: [
      `主數${basis.mainInGrid === 'present' ? '在盤' : basis.mainInGrid === 'absent' ? '不在盤' : '不適用'}`,
      `盤上缺 ${basis.missingCount} 格`,
    ],
    sources: [],
  };
}

export function buildAsuraFusion(input: {
  study: NineGridStudy;
  lifeCode?: FusionLifeCode | null;
  nameOverlay?: NineGridNameOverlay | null;
}): AsuraFusion {
  const { study } = input;
  const root = rootStep(input.lifeCode);
  const grid = gridStep(study);
  const join = joinStep(study, root.lifePath);
  const luoshu = luoshuStep(study, root.lifePath);
  const name = nameStep(study, input.nameOverlay);
  const basis: AsuraFusion['basis'] = {
    lifePath: root.lifePath,
    mainInGrid: join.mainInGrid,
    missingCount: study.summary.missing.length,
    nameFill: name.fill,
  };
  return {
    version: ASURA_FUSION_VERSION,
    label: ASURA_FUSION_LABEL,
    steps: [root.step, grid, join.step, luoshu, name.step, verdictStep(basis)],
    basis,
  };
}
