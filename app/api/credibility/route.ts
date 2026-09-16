import { NextResponse } from 'next/server';
import { credibilityReport } from '@/lib/credibility-wording';

export const runtime = 'nodejs';

/**
 * 公信力話術（唯讀）
 *
 * 後端讀八字、紫微斗數、易經三份來源登記，用來源閘門重算狀態，依口令《易經》順序組好句子；
 * 前端只照印。內容只隨來源登記改版而變，可短暫快取。
 */
export async function GET() {
  return NextResponse.json({ ok: true, report: credibilityReport() }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
