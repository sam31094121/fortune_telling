import { NextRequest, NextResponse } from 'next/server';
import { handleHomeTrustIncrement, incrementHomeTrust, readEventId } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  // 先進行基本驗證
  const baseResponse = await handleHomeTrustIncrement('agree', request);

  // 如果投票成功，提取計數值並廣播
  if (baseResponse.status >= 200 && baseResponse.status < 300) {
    try {
      // 克隆 response 以便讀取（原始 response 將被返回）
      const clonedResponse = baseResponse.clone();
      const data = await clonedResponse.json() as any;
      if (typeof data.agreeCount === 'number') {
        // 異步廣播，不等待結果（使用相對 URL，自動適應當前主機）
        fetch('/api/trust-feedback/ws', {
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
    } catch {
      // 廣播失敗不應該中斷投票返回
    }
  }

  return baseResponse;
}
