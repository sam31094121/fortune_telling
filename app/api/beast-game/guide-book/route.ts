import { NextResponse } from 'next/server';
import { buildGuideBook } from '@/lib/beast-game/guide-book';

export const runtime = 'nodejs';

/**
 * 相剋戰力手冊（唯讀）
 *
 * 後端化第三階段 3B：五元素攻守倍率、相剋說明、六十張卡的出戰基礎分析，
 * 用戰鬥核心同一份規則在後端算好；前端只照印。內容只隨卡池與規則改版而變，可短暫快取。
 */
export async function GET() {
  return NextResponse.json({ ok: true, book: buildGuideBook() }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
