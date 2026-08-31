import { GoogleGenAI } from '@google/genai';
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
    'AI 只負責把已通過門控的年度規則證據轉成文化性反思與行動參考，不參與排盤或規則命中。',
    result.monthlyRhythm.limitation,
  ];
  if (gate.status !== 'PASSED') return { status: 'BLOCKED_BY_VALIDATION', provider: 'none', gate, limitations };

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { status: 'UNAVAILABLE_AI_NOT_CONFIGURED', provider: 'none', gate, limitations };

  const payload = buildRedLuanAiEvidencePayload(result);
  const allowedYears = new Set(payload.verifiedEvidence.map((item) => item.year));
  const prompt = `你是「桃花・紅鸞心動」的易經文化解讀助手。後端已完成確定性八字規則計算與品質門控。你只能讀取下列已驗證的年度證據與限制，不能重新排盤、不能新增星曜、卦象、月份、分數或事件。

請用繁體中文輸出 JSON：
{
  "summary": "80到160字的文化性總結",
  "yearlyGuidance": [
    { "year": 只可使用證據中存在的年份, "theme": "關係發展訊號名稱", "reflection": "條件式文化反思", "action": "具體且低風險的社交或溝通行動" }
  ]
}

限制：
1. 不得使用「一定、必然、保證、會結婚、遇到真愛、命中注定、準確率」等確定性語句。
2. 不得推測人格、心理狀態、創傷或當事人未提供的感受。
3. 沒有月份規則，禁止輸出月份；沒有易經起卦規則，禁止生成卦象。
4. 可使用「關係發展訊號、相遇與社交機會參考、可留意、適合」等條件式語氣。
5. AI 只是文化文字的表達層，不得自稱易經權威、神諭、通靈者或能感應當事人；不得暗示已知道當事人的心理狀態。

後端證據：${JSON.stringify(payload)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 } },
    }), 10_000);
    const text = response.text?.trim();
    if (!text) throw new Error('RED_LUAN_AI_EMPTY');
    const parsed = parseAiReading(text, allowedYears);
    return { status: 'READY', provider: 'google', gate, ...parsed, limitations };
  } catch (error) {
    console.info('[red-luan-heartbeat] cultural reading unavailable', error instanceof Error ? error.message : String(error));
    return { status: 'TEMPORARILY_UNAVAILABLE', provider: 'none', gate, limitations };
  }
}
