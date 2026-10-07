/**
 * 鬼魅阿修羅 Skill — 解析器、生成器、驗證。
 *
 * 流程（asuraId 為唯一索引，不再用顯示名稱查話術）：
 *   已驗證證據 → asuraId → Skill 條目
 *     → ① 既有手寫話術（wordings.ts／customerWordings.ts，沿用不改寫）
 *     → ② 沒有才由 Skill 模板生成（只用 Skill 條目＋已驗證證據，不從四個字自行聯想）
 *     → 驗證 → 前端（前端不重算）
 *
 * 個人化只用已驗證的證據：命中、柱位。強弱與時間後端目前沒有驗證輸出，所以不參與（allowedEvidence 為準）。
 */
import { ASURA_WORDINGS } from '../wordings';
import { PILLAR_UI } from '../uiText';
import type { GhostAsuraPillarKey } from '../types';
import { PILLAR_LINK } from '@/lib/iching-shensha-teacher-readings';
import { APPROVED_BY_RULE_ID } from '../registry';
import { ASURA_SKILL_ENTRIES, missingFieldsOf, type AsuraSkillEntry } from './entries';
import { ASURA_SKILL_VERSION } from './version';

export interface AsuraEvidence {
  /** 後端已驗證命中的柱位（可多柱）。 */
  pillars: readonly GhostAsuraPillarKey[];
}

export interface AsuraInterpretation {
  asuraId: string;
  displayName: string;
  coreMeaning: string;
  meaningStrong: string;
  meaning: string;
  advice: string;
  warning: string;
  battleLine: string;
  source: 'existing' | 'generated';
  skillVersion: string;
}

export interface AsuraDebugReport {
  sourceId: string;
  asuraId: string;
  displayName: string;
  skillEntryFound: boolean;
  dictionaryFound: boolean;
  existingInterpretationFound: boolean;
  generationAttempted: boolean;
  generationSuccess: boolean;
  missingFields: string[];
  reason: string;
}

export type AsuraErrorCode =
  | 'ASURA_SKILL_ENTRY_MISSING'
  | 'ASURA_INTERPRETATION_INCOMPLETE'
  | 'ASURA_COVERAGE_MISMATCH';

export class AsuraSkillError extends Error {
  readonly code: AsuraErrorCode;
  readonly asuraId: string;
  readonly report: AsuraDebugReport | null;
  constructor(code: AsuraErrorCode, asuraId: string, report: AsuraDebugReport | null = null) {
    super(`${code}:${asuraId}`);
    this.name = 'AsuraSkillError';
    this.code = code;
    this.asuraId = asuraId;
    this.report = report;
  }
}

const PILLAR_ORDER: GhostAsuraPillarKey[] = ['year', 'month', 'day', 'hour'];
const TRADITIONAL_LABEL: Record<GhostAsuraPillarKey, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };

/** 這些字串若出現在輸出，代表佔位字外洩；一律視為不完整。 */
const PLACEHOLDER_MARKERS = ['此域暫無可用判讀', '尚待確認', '待校核'];

const filled = (text: string | null | undefined): text is string =>
  typeof text === 'string' && text.trim().length > 0 && !PLACEHOLDER_MARKERS.some((m) => text.includes(m));

/** 既有手寫話術：以 asuraId 經 registry 的現行名稱對到 wordings 表（表本身不動、不複製）。 */
function existingWordingOf(asuraId: string) {
  const name = APPROVED_BY_RULE_ID[asuraId]?.displayName;
  const w = name ? ASURA_WORDINGS[name] : undefined;
  if (!w) return null;
  return filled(w.shortDeclaration) && filled(w.coreWarning) && filled(w.battleSignificance) && filled(w.verdict) ? w : null;
}

function orderedPillars(evidence: AsuraEvidence): GhostAsuraPillarKey[] {
  return PILLAR_ORDER.filter((key) => evidence.pillars.includes(key));
}

/** 柱位句：只講已驗證命中的柱位；沒有柱位證據就不寫（不編造）。 */
function pillarSentence(evidence: AsuraEvidence): string {
  const keys = orderedPillars(evidence);
  if (keys.length === 0) return '';
  const names = keys.map((k) => PILLAR_UI[k].asura).join('、');
  const link = PILLAR_LINK[TRADITIONAL_LABEL[keys[0]]];
  return link ? `落在${names}，這股氣${link}。` : `落在${names}。`;
}

/** 模板版本依「命中的第一個柱位」挑選；同一條目所有版本都以同一 coreMeaning 開頭。 */
function pick<T>(templates: readonly T[], evidence: AsuraEvidence): T {
  const first = orderedPillars(evidence)[0];
  const index = first ? PILLAR_ORDER.indexOf(first) : 0;
  return templates[index % templates.length];
}

function generate(entry: AsuraSkillEntry, evidence: AsuraEvidence): AsuraInterpretation {
  return {
    asuraId: entry.asuraId,
    displayName: entry.displayName,
    coreMeaning: entry.coreMeaning,
    meaningStrong: entry.declarationTemplates[0],
    meaning: pick(entry.interpretationTemplates, evidence).replace('{pillar}', pillarSentence(evidence)),
    advice: pick(entry.adviceTemplates, evidence),
    warning: pick(entry.warningTemplates, evidence),
    battleLine: pick(entry.battleTemplates, evidence),
    source: 'generated',
    skillVersion: ASURA_SKILL_VERSION,
  };
}

/** 卡片內容驗證：缺欄位即 INVALID，不得送前端。 */
export function validateAsuraCardContent(
  content: Partial<Pick<AsuraInterpretation, 'asuraId' | 'displayName' | 'coreMeaning' | 'meaningStrong' | 'meaning' | 'battleLine'>>,
): { valid: boolean; missing: string[] } {
  const required = ['asuraId', 'displayName', 'coreMeaning', 'meaningStrong', 'meaning', 'battleLine'] as const;
  const missing = required.filter((key) => !filled(content[key]));
  return { valid: missing.length === 0, missing: [...missing] };
}

/** 逐項診斷（不丟錯），供稽核與除錯報告使用。 */
export function diagnoseAsura(asuraId: string, evidence: AsuraEvidence): AsuraDebugReport {
  const entry = ASURA_SKILL_ENTRIES[asuraId];
  const missingFields = missingFieldsOf(entry);
  const existing = existingWordingOf(asuraId);
  const report: AsuraDebugReport = {
    sourceId: asuraId,
    asuraId,
    displayName: entry?.displayName ?? APPROVED_BY_RULE_ID[asuraId]?.displayName ?? '',
    skillEntryFound: Boolean(entry),
    dictionaryFound: Boolean(entry) && !missingFields.some((field) => field.startsWith('characterMeaning')),
    existingInterpretationFound: Boolean(existing),
    generationAttempted: false,
    generationSuccess: false,
    missingFields,
    reason: '',
  };
  if (!entry) { report.reason = 'Skill 沒有這個編號的條目'; return report; }
  if (existing) return report;
  report.generationAttempted = true;
  if (missingFields.length > 0) { report.reason = `Skill 條目欄位不完整：${missingFields.join(',')}`; return report; }
  const check = validateAsuraCardContent(generate(entry, evidence));
  report.generationSuccess = check.valid;
  if (!check.valid) report.reason = `生成後驗證失敗：${check.missing.join(',')}`;
  return report;
}

/**
 * 單一入口：asuraId ＋ 已驗證證據 → 完整話術。
 * 找不到條目丟 ASURA_SKILL_ENTRY_MISSING；條目或結果不完整丟 ASURA_INTERPRETATION_INCOMPLETE。
 * 不回傳佔位字、不吞錯。
 */
export function resolveAsuraInterpretation(asuraId: string, evidence: AsuraEvidence): AsuraInterpretation {
  const entry = ASURA_SKILL_ENTRIES[asuraId];
  if (!entry) throw new AsuraSkillError('ASURA_SKILL_ENTRY_MISSING', asuraId, diagnoseAsura(asuraId, evidence));
  if (missingFieldsOf(entry).length > 0) {
    throw new AsuraSkillError('ASURA_INTERPRETATION_INCOMPLETE', asuraId, diagnoseAsura(asuraId, evidence));
  }

  const existing = existingWordingOf(asuraId);
  const result: AsuraInterpretation = existing
    ? {
        asuraId,
        displayName: entry.displayName,
        coreMeaning: entry.coreMeaning,
        meaningStrong: existing.shortDeclaration,
        meaning: existing.coreWarning,
        advice: existing.verdict,
        warning: pick(entry.warningTemplates, evidence),
        battleLine: existing.battleSignificance,
        source: 'existing',
        skillVersion: ASURA_SKILL_VERSION,
      }
    : generate(entry, evidence);

  if (!validateAsuraCardContent(result).valid || !filled(result.advice) || !filled(result.warning)) {
    throw new AsuraSkillError('ASURA_INTERPRETATION_INCOMPLETE', asuraId, diagnoseAsura(asuraId, evidence));
  }
  return result;
}

/**
 * 白話一行（給「白話區」用）：取 Skill 的固定核心意義；條目缺失或不完整回 null，不編造。
 * 優先序在呼叫端：既有手寫白話（ASURA_PLAIN／ASURA_TIMELINE）先，沒有才用這個。
 */
export function asuraPlainLineOf(asuraId: string): string | null {
  const entry = ASURA_SKILL_ENTRIES[asuraId];
  return entry && missingFieldsOf(entry).length === 0 ? entry.coreMeaning : null;
}
