// 2026-10-23 ai-to-asura：紅鸞文化解讀不再呼叫 AI；只附技能檔（易經神煞／神煞異君）含「紅鸞」的原句與出處，查無則明確回「暫時無法取得」。
import { ASURA_UNAVAILABLE_MESSAGE, findSkillLines, type SourcedSkillLine } from './asura/sourced-lines';
import type { SingleRedLuanHeartbeatResult } from './red-luan-heartbeat-engine';

export type RedLuanCulturalReading = {
  status: 'READY' | 'UNAVAILABLE_AI_NOT_CONFIGURED' | 'TEMPORARILY_UNAVAILABLE' | 'BLOCKED_BY_VALIDATION';
  provider: 'google' | 'none';
  gate: {
    status: 'PASSED' | 'BLOCKED';
    evidenceCount: number;
    acceptedPrecision: 'ANNUAL_BRANCH';
    withheldFields: string[];
    reasons: string[];
  };
  summary?: string;
  yearlyGuidance?: Array<{ year: number; theme: string; reflection: string; action: string }>;
  limitations: string[];
  /** 2026-10-23 ai-to-asura：技能檔原句（逐字）與檔名行號 */
  sourcedLines?: SourcedSkillLine[];
  message?: string;
};

type AiPayload = {
  verifiedEvidence: Array<{
    year: number;
    annualBranch: string;
    signals: Array<{ label: string; ruleId: string; evidence: string; source: string }>;
  }>;
  validation: {
    primaryEngine: string;
    primaryRuleSet: string;
    qualityGateStatus: string;
    independentReference: string;
    goldenCases: string;
  };
  limitations: string[];
  /** 2026-10-23 ai-to-asura：技能檔原句（逐字）與檔名行號 */
  sourcedLines?: SourcedSkillLine[];
  message?: string;
};

const FORBIDDEN_CERTAINTY = /(一定|必然|保證|百分之百|會結婚|遇到真愛|命中注定|確定會|準確率|神諭|通靈|感應到|宇宙告訴你)/;

/**
 * The AI boundary accepts deterministic evidence only. Customer-reported
 * relationship status, family responsibility, and expectations are never
 * arguments to this function and therefore cannot enter the model payload.
 */
export function buildRedLuanAiEvidencePayload(result: SingleRedLuanHeartbeatResult): AiPayload {
  return {
    verifiedEvidence: result.annualRhythm
      .filter((item) => item.evidence.length > 0)
      .map((item) => ({
        year: item.year,
        annualBranch: item.annualBranch,
        signals: item.evidence.map((evidence) => ({
          label: evidence.label,
          ruleId: evidence.ruleId,
          evidence: evidence.evidence,
          source: evidence.source,
        })),
      })),
    validation: {
      primaryEngine: `${result.validation.primaryEngine}@${result.validation.primaryEngineVersion}`,
      primaryRuleSet: result.validation.primaryRuleSet,
      qualityGateStatus: result.validation.qualityGateStatus,
      independentReference: result.validation.independentReference,
      goldenCases: result.validation.goldenCases,
    },
    limitations: [
      result.monthlyRhythm.limitation,
      ...result.validation.unverifiedScope.map((item) => `尚未驗證：${item}`),
      '所有訊號都是命理文化參考，不是戀愛、婚姻或特定事件承諾。',
    ],
  };
}

export function inspectRedLuanAiGate(result: SingleRedLuanHeartbeatResult) {
  const evidence = result.annualRhythm.flatMap((item) => item.evidence);
  const evidenceComplete = evidence.length > 0
    && evidence.every((item) => Boolean(item.ruleId && item.ruleVersion && item.evidence && item.source));
  const reasons = [
    ...(result.validation.primaryStatus === 'PASSED' ? [] : ['主排盤引擎未通過驗證']),
    ...(result.validation.qualityGateStatus === 'PASSED' ? [] : ['跨來源品質門控尚未完成']),
    ...(result.validation.independentReference === 'PASSED' ? [] : ['缺少已通過的獨立第二來源']),
    ...(result.validation.goldenCases === 'PASSED' ? [] : ['缺少已通過的人工黃金案例']),
    ...(evidenceComplete ? [] : ['沒有完整且可追溯的年度規則證據']),
  ];
  const passed = reasons.length === 0;
  return {
    status: passed ? 'PASSED' as const : 'BLOCKED' as const,
    evidenceCount: evidence.length,
    acceptedPrecision: 'ANNUAL_BRANCH' as const,
    withheldFields: ['未驗證時柱', '月份推算', '紫微流年四化', '內／外桃花分類', '戀愛或婚姻事件預測'],
    reasons,
  };
}

function safeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  return FORBIDDEN_CERTAINTY.test(normalized) ? '' : normalized;
}

function parseAiReading(text: string, allowedYears: Set<number>) {
  const parsed = JSON.parse(text) as { summary?: unknown; yearlyGuidance?: unknown };
  const summary = safeText(parsed.summary, 240);
  const yearlyGuidance = Array.isArray(parsed.yearlyGuidance)
    ? parsed.yearlyGuidance.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const year = Number(row.year);
      const theme = safeText(row.theme, 40);
      const reflection = safeText(row.reflection, 140);
      const action = safeText(row.action, 100);
      return Number.isInteger(year) && allowedYears.has(year) && theme && reflection && action
        ? [{ year, theme, reflection, action }]
        : [];
    })
    : [];
  if (!summary) throw new Error('RED_LUAN_AI_UNSAFE_OR_EMPTY_SUMMARY');
  return { summary, yearlyGuidance };
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateRedLuanCulturalReading(result: SingleRedLuanHeartbeatResult): Promise<RedLuanCulturalReading> {
  const gate = inspectRedLuanAiGate(result);
  const limitations = [
    '文化解讀只引用技能檔原句，不呼叫 AI、不參與排盤或規則命中。',
    result.monthlyRhythm.limitation,
  ];
  if (gate.status !== 'PASSED') return { status: 'BLOCKED_BY_VALIDATION', provider: 'none', gate, limitations };

  const picked = findSkillLines(['易經神煞', '神煞異君'], ['紅鸞']);
  if (!picked.sourced) return { status: 'TEMPORARILY_UNAVAILABLE', provider: 'none', gate, limitations, message: ASURA_UNAVAILABLE_MESSAGE };
  return { status: 'READY', provider: 'none', gate, sourcedLines: picked.lines, limitations };
}
