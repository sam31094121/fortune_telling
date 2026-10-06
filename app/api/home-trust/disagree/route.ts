import { handleHomeTrustIncrement } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/home-trust/disagree
 * 不認同 +1，由資料庫原子完成；客戶端只能指定動作，不能指定數字。
 * 本文可帶 { "eventId": "<8~100 個英數字、底線、連字號>" }：同一事件重送只 +1 一次。
 */
export async function POST(request: Request) {
  return handleHomeTrustIncrement('disagree', request);
}
