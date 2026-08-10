import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  NUMBER_CORE_ENGINE_VERSION,
  analyzeNumberCore,
  validateNumberCoreInput,
  type NumberAnalysisMode,
  type NumberAnalysisResponse,
} from '@/lib/number-core-engine';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';
import { buildNumberFiveElementResult } from '@/lib/five-element-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type NumberFortuneRequest = {
  mode?: unknown;
  value?: unknown;
};

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
  const analysisHash = hashValue(rawValue);
  const analysisId = hashToUuid(analysisHash);
  const result = analyzeNumberCore(rawValue);
  if (!result.ok) {
    return NextResponse.json({ ...result, requestId, code: 'ANALYSIS_REJECTED' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const fiveElement = buildNumberFiveElementResult(result);
  const response: NumberAnalysisResponse & { analysisId: string; requestId: string; mode: NumberAnalysisMode; fiveElement: ReturnType<typeof buildNumberFiveElementResult> } = {
    ...result,
    analysisId,
    requestId,
    fiveElement,
  };

  await persistAnalysisResult(response, rawValue, analysisHash, analysisId);

  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
