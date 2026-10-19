import { NextResponse } from 'next/server';
import { createTarotShuffle } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    // 2026-10-17 tarot QA：壞掉的 JSON 不要把英文解析錯誤原文丟給客戶。
    const body = await request.json().catch(() => {
      throw new Error('無法讀取這次的請求內容，請重新整理頁面後再試一次。');
    });
    const result = await createTarotShuffle(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅洗牌暫時失敗，請重新嘗試。';
    return NextResponse.json({ ok: false, code: 'TAROT_SHUFFLE_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}