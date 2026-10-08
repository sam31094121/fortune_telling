import { NextRequest, NextResponse } from 'next/server';
import { handleHomeTrustIncrement } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const response = await handleHomeTrustIncrement('agree', request);

  // 廣播投票事件給所有連接的客戶端（非同步，不阻塞投票流程）
  if (response.ok) {
    const data = await response.json() as any;
    if (typeof data.agreeCount === 'number') {
      // 異步廣播，不等待結果
      fetch('http://localhost:3000/api/trust-feedback/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'like',
          agreeCount: data.agreeCount,
        }),
      }).catch(() => {
        // 廣播失敗不應該中斷投票
      });
    }
  }

  return response;
}
