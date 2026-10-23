// 2026-10-23 ai-to-asura：數字解說不再呼叫 AI；改附技能檔（九宮格靈動數字）含本組格局名的原句與出處，查無則回「暫時無法取得」。
import { findSkillLines } from '@/lib/asura/sourced-lines';
import { createHash, randomUUID } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { readNumberByIChing } from '@/lib/iching-numbers';
import { buildNumberCrossVerdict } from '@/lib/number-cross-verdict';
import { hasCompleteNumberCrossVerdict } from '@/lib/number-cross-gate';

import { NUMBER_CORE_ENGINE_VERSION, analyzeNumberCore, validateNumberCoreInput, type NumberAnalysisMode, type NumberAnalysisResponse } from '@/lib/number-core-engine';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';
import { buildNumberFiveElementResult } from '@/lib/five-element-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type NumberFortuneRequest = {
  mode?: unknown;
  value?: unknown;
  purpose?: unknown;
  includeAiExplanation?: unknown;
};

type NumberPurpose = 'general' | 'plate' | 'phone' | 'birthdate';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function hashValue(value: string) {
  return createHash('sha256')
    .update(`${NUMBER_CORE_ENGINE_VERSION}:${value}`)
    .digest('hex');
}

function hashToUuid(hash: string) {
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

async function withTimeout<T>(task: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Google 只負責把既有數字核心的結果說清楚；不參與分數計算、不修改好壞判定。 */
function resolvePurpose(value: unknown): NumberPurpose {
  return value === 'plate' || value === 'phone' || value === 'birthdate' ? value : 'general';
}

type PersistResult = {
  error: { message?: string } | null;
};

async function persistAnalysisResult(result: NumberAnalysisResponse, rawValue: string, analysisHash: string, analysisId: string) {
  const supabase = getVisitorSupabaseClient();
  if (!supabase) return;

  const legacyInsert = () => supabase
    .from('number_analysis_results')
    .insert({
      analysis_hash: analysisHash,
      rule_version: result.ruleVersion,
      input_mode: result.mode,
      input_length: rawValue.length,
      input_last4: rawValue.slice(-4),
      score: result.score,
      level: result.level,
      matrix: result.matrix,
      evidence: result.evidence,
      summary: result.summary,
      strengths: result.strengths,
      cautions: result.cautions,
      suitable_directions: result.suitableDirections,
      indexes: result.indexes,
      confidence_score: result.confidenceScore,
      advice: result.advice,
    });

  const v5Insert = () => supabase
    .from('number_analysis_records')
    .insert({
      analysis_id: analysisId,
      input_hash: analysisHash,
      input_mode: result.mode,
      rule_version: result.ruleVersion,
      engine_version: result.engineVersion,
      matrix_json: result.matrix,
      index_json: result.indexes,
      final_score: result.finalScore,
      fortune_level: result.fortuneLevel,
      confidence_score: result.confidenceScore,
    });

  for (const insert of [legacyInsert, v5Insert]) {
    let persisted = false;
    for (let attempt = 0; attempt < 2 && !persisted; attempt += 1) {
      try {
        const { error } = await withTimeout(insert() as unknown as Promise<PersistResult>, 1500);
        if (error) throw error;
        persisted = true;
      } catch (error) {
        if (attempt === 1) {
          console.error('[number-fortune] result persistence skipped', error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
}

export async function POST(request: Request) {
  let body: NumberFortuneRequest;
  const requestId = randomUUID();

  if (isRateLimited(clientKey(request))) {
    return NextResponse.json(
      { ok: false, requestId, code: 'RATE_LIMITED', message: '請稍候再試，系統正在保護分析服務穩定性。', ruleVersion: NUMBER_CORE_ENGINE_VERSION },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, requestId, code: 'INVALID_JSON', message: '請提供有效的 JSON 請求資料。', ruleVersion: NUMBER_CORE_ENGINE_VERSION },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 2026-10-17 numerology QA：請求內容是 JSON 的 null 或純數字時，讀 body.value 會直接丟例外變成空白 500。
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, requestId, code: 'INVALID_JSON', message: '請提供有效的 JSON 請求資料。', ruleVersion: NUMBER_CORE_ENGINE_VERSION },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const validation = validateNumberCoreInput(body.value);
  if (typeof validation !== 'string') {
    return NextResponse.json({ ...validation, requestId, code: 'INVALID_INPUT' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (body.mode !== undefined && body.mode !== validation) {
    return NextResponse.json(
      { ok: false, requestId, code: 'MODE_MISMATCH', message: '輸入模式與數字長度不一致。', ruleVersion: NUMBER_CORE_ENGINE_VERSION },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const rawValue = body.value as string;
  const purpose = resolvePurpose(body.purpose);
  const analysisHash = hashValue(rawValue);
  const analysisId = hashToUuid(analysisHash);
  const result = analyzeNumberCore(rawValue);
  if (!result.ok) {
    return NextResponse.json({ ...result, requestId, code: 'ANALYSIS_REJECTED' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const fiveElement = buildNumberFiveElementResult(result);
  // 《易經》論數字：逐碼配卦＋相鄰生剋交叉＋整組梅花易數起卦（決定性、可回查）。
  // 判語直接併入 summary，前端不需改版就能看到卜卦結論；完整交叉資料附在 iching 欄位。
  const numberIChing = readNumberByIChing(rawValue);
  const crossVerdict = buildNumberCrossVerdict(result.finalScore, numberIChing);
  if (!hasCompleteNumberCrossVerdict(crossVerdict, numberIChing)) {
    return NextResponse.json({ ok: false, requestId, code: 'CROSS_VERDICT_INCOMPLETE', message: '交叉判定尚未完成，請稍後再試。', ruleVersion: NUMBER_CORE_ENGINE_VERSION }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  result.summary = `${numberIChing.verdictLine}${result.summary}`;
  // The deterministic Number Core result is the primary response.  External AI
  // prose is opt-in so a slow provider cannot make a basic number lookup feel
  // frozen or delay the user from seeing the calculated result.
  const asuraExplanation = body.includeAiExplanation === true
    ? findSkillLines(['九宮格靈動數字'], [numberIChing.patternName])
    : null;
  const response: NumberAnalysisResponse & { analysisId: string; requestId: string; mode: NumberAnalysisMode; purpose: NumberPurpose; fiveElement: ReturnType<typeof buildNumberFiveElementResult>; crossVerdict: typeof crossVerdict; googleExplanation?: string; googleProvider?: 'Google Gemini'; iching: { hexagramName: string; kingWen: number; patternName: string; chainScore: number; verdictLine: string; digitReadings: typeof numberIChing.digitReadings; crossChain: typeof numberIChing.crossChain; ghost: typeof numberIChing.ghost } } = {
    ...result,
    analysisId,
    requestId,
    purpose,
    fiveElement,
    crossVerdict,
    iching: {
      hexagramName: numberIChing.hexagram.hexagramName,
      kingWen: numberIChing.hexagram.kingWen,
      patternName: numberIChing.patternName,
      chainScore: numberIChing.chainScore,
      verdictLine: numberIChing.verdictLine,
      digitReadings: numberIChing.digitReadings,
      crossChain: numberIChing.crossChain,
      ghost: numberIChing.ghost,
    },
    ...(asuraExplanation ? { asuraExplanation } : {}),
  };

  // Persistence is best-effort analytics. Schedule it after the response so it
  // can never delay the deterministic result the user is waiting to read.
  after(() => persistAnalysisResult(response, rawValue, analysisHash, analysisId));

  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
