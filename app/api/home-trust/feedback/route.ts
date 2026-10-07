/**
 * 首頁信任統計 — 私密意見回饋 API
 *
 * POST /api/home-trust/feedback
 * 提交回饋：投票 + 可選留言
 *
 * 鐵律：
 * - 與計數系統完全分離
 * - 回饋失敗不影響計數
 * - 私密保存，不公開
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/home-trust/feedback/feedback.service';
import type { FeedbackSubmitRequest } from '@/lib/home-trust/feedback/feedback.types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/home-trust/feedback
 *
 * 提交回饋
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const feedbackRequest: FeedbackSubmitRequest = {
      vote: body.vote,
      message: body.message,
      category: body.category,
      deviceType: body.deviceType,
      allowContact: body.allowContact,
    };

    const result = await submitFeedback(feedbackRequest);

    // 無論成功或失敗，都回傳 200
    // 失敗不應中斷前端流程
    return NextResponse.json(result, {
      status: result.success ? 200 : 202, // 202 表示已接收但處理有問題
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] POST /api/home-trust/feedback failed:', message);

    // 即使發生異常，也要回傳友善訊息
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        message: '暫時無法保存意見，但感謝你的想法。',
      },
      { status: 202 }
    );
  }
}
