import { lockedCardGuard } from '@/lib/dual-chart-auth';

import { ASURA_UNAVAILABLE_MESSAGE } from '@/lib/asura/sourced-lines';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 2026-10-23 ai-to-asura：音樂生成沒有技能檔來源，已停用 Lyria AI 呼叫，固定回明確狀態「暫時無法取得」。
export async function POST(request: Request) {
  // 上鎖卡片（人格音樂）：沒有輸入密碼就不能呼叫。見 lib/locked-cards.ts
  const locked = lockedCardGuard(request);
  if (locked) return locked;
  const requestId = createRequestId();
  return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', ASURA_UNAVAILABLE_MESSAGE, 503);
}

