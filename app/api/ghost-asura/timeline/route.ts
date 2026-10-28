/**
 * 鬼魅阿修羅 - 流年計算 API 端點
 *
 * POST /api/ghost-asura/timeline
 *
 * 輸入：使用者資訊 + 出生日期
 * 輸出：過去/現在/未來三時段數據
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateGhostAsuraTimeline,
  inferDayMasterElement,
} from '@/lib/ghost-asura-flow-year-engine';
import { GhostAsuraTimelineResponse } from '@/lib/types/ghost-asura-timeline';
import { evaluateAsuraAgeGate } from '@/lib/server/ghost-asura-display';

/** 請求體型別 */
interface TimelineCalculateRequest {
  name: string;
  birthDate: string; // YYYY-MM-DD
  dayMasterElement?: string; // 可選：日主五行（木火土金水）
}

/** 驗證輸入 */
function validateInput(body: unknown): body is TimelineCalculateRequest {
  if (!body || typeof body !== 'object') return false;

  const data = body as Record<string, unknown>;
  const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
  const hasDate =
    typeof data.birthDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate);

  return hasName && hasDate;
}

/** GET 方法：健康檢查 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '鬼魅阿修羅 - 流年計算 API',
    endpoint: 'POST /api/ghost-asura/timeline',
  });
}

/** POST 方法：計算流年 */
export async function POST(request: NextRequest) {
  try {
    // 2026-10-17 stability：壞掉的 JSON 當成輸入格式錯誤（下方回 400），不再落到 catch 回 500；計算邏輯不動。
    const body: unknown = await request.json().catch(() => null);

    // 驗證輸入
    if (!validateInput(body)) {
      return NextResponse.json(
        {
          code: 'INVALID_INPUT',
          message: '缺少必填欄位或格式錯誤',
          details: {
            required: ['name', 'birthDate'],
            birthDateFormat: 'YYYY-MM-DD',
            optionalFields: ['dayMasterElement'],
          },
        },
        { status: 400 }
      );
    }

    // 鬼魅阿修羅 18 歲禁忌守門（同時檢查今日實歲與查詢日期實歲）
    const rawTargetDate = (body as unknown as Record<string, unknown>).targetDate;
    const ageGate = evaluateAsuraAgeGate(
      body.birthDate,
      typeof rawTargetDate === 'string' ? rawTargetDate : undefined,
    );
    if (ageGate.status === 'WITHHELD') {
      return NextResponse.json(
        {
          status: 'WITHHELD',
          code: 'AGE_WITHHELD',
          message: ageGate.message,
          ageGate,
          timeline: null,
        },
        { status: 200 }
      );
    }

    // 推斷日主五行（如果沒有提供）
    let dayMasterElement = body.dayMasterElement;
    if (!dayMasterElement) {
      const dayPart = body.birthDate.split('-')[2];
      dayMasterElement = inferDayMasterElement(dayPart);
    }

    // 計算流年
    const result = await calculateGhostAsuraTimeline(
      body.name,
      body.birthDate,
      dayMasterElement
    );

    return NextResponse.json(result as GhostAsuraTimelineResponse, {
      status: 200,
    });
  } catch (error) {
    console.error('[Timeline API Error]', error);

    return NextResponse.json(
      {
        code: 'CALCULATION_ERROR',
        message:
          error instanceof Error ? error.message : '流年計算過程中發生錯誤',
      },
      { status: 500 }
    );
  }
}
