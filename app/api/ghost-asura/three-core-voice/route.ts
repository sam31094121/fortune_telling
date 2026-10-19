/**
 * 鬼魅阿修羅 — 三核心修羅口吻端點（POST /api/ghost-asura/three-core-voice）
 *
 * 輸入：與 /api/ghost-asura/reading 相同的生辰欄位。
 * 輸出：{ voice: AsuraThreeCoreVoice | null }——只有白話的修羅斷語，不含干支、星名、卦名。
 * voice 為 null＝四柱核對或易經起卦沒成立，前端不顯示這一段（不補、不猜）。
 *
 * 阿修羅卡目前不上鎖（2026-10-16 解鎖），本端點與 reading 端點一致，只做同源與速率限制。
 * 用自己的限流額度，不吃 reading 的額度（一次解盤會打兩個端點）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/dual-chart-auth';
import { calculateDualChart } from '@/lib/dual-chart';
import { computeGhostAsuraDisplay, normalizeAsuraInput } from '@/lib/server/ghost-asura-display';
import { buildAsuraThreeCoreVoice } from '@/lib/server/asura-three-core-voice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = (globalThis as typeof globalThis & { asuraVoiceHits?: Map<string, number[]> });

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
function clientIP(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}
function allowed(ip: string, now = Date.now()) {
  const map: Map<string, number[]> = (hits.asuraVoiceHits ??= new Map<string, number[]>());
  const recent = (map.get(ip) ?? []).filter((t: number) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { map.set(ip, recent); return false; }
  recent.push(now);
  map.set(ip, recent);
  if (map.size > 500) for (const key of map.keys()) { if (map.size <= 400) break; map.delete(key); }
  return true;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);
  const text = await request.text().catch(() => '');
  if (text.length === 0) return reply({ error: '請先填寫生辰。' }, 400);
  if (text.length > 2048) return reply({ error: '輸入內容過長。' }, 400);
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return reply({ error: '請求格式不正確。' }, 400); }
  const input = normalizeAsuraInput(raw);
  if (typeof input.birthDate !== 'string' || input.birthDate === '') return reply({ error: '缺少出生日期。' }, 400);
  if (!allowed(clientIP(request))) return reply({ error: '戰局開得太密。刀先歇著，一分鐘後再來。' }, 429, { 'Retry-After': '60' });

  const { hourAssumed, identityTarget: _identity, ...engineInput } = input;
  void _identity;
  try {
    // 戰局句依據阿修羅頁自己算好的欄位，和頁面清單同一個集合；排盤事實則取同一條鏈的結果。
    const display = computeGhostAsuraDisplay(raw);
    const result = calculateDualChart(engineInput);
    return reply({ voice: buildAsuraThreeCoreVoice(result, display, { hourAssumed: hourAssumed === true }) });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '出生資料無法排盤。' }, 400);
  }
}
