/**
 * 鬼魅阿修羅 - 後端 API 端點（簡化版本）
 *
 * POST /api/ghost-asura/calculate
 *
 * 輸入：生辰資料
 * 輸出：計算結果（純數據，不含話術）
 *
 * ⚠️ 設計：後端只計算、不產話術
 *         話術由前端調用 lib/asura-frontend-renderer.ts 生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { GhostAsuraCalculationResponse } from '@/lib/types/ghost-asura-calculation';

/** 請求體型別 */
interface CalculateRequest {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm
  gender?: string;
}

/** 驗證輸入 */
function validateInput(body: unknown): body is CalculateRequest {
  if (!body || typeof body !== 'object') return false;

  const data = body as Record<string, unknown>;
  const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
  const hasDate =
    typeof data.birthDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate);
  const hasTime =
    !data.birthTime ||
    (typeof data.birthTime === 'string' &&
      /^\d{2}:\d{2}$/.test(data.birthTime));

  return hasName && hasDate && hasTime;
}

/** 簡化版計算函式 - 返回模擬計算結果 */
async function calculateGhostAsuraCard(
  input: CalculateRequest
): Promise<GhostAsuraCalculationResponse> {
  // TODO：完整實裝時，此處調用實際的八字、紫微、神煞、易經引擎
  // 現在返回模擬結構以驗證 API 框架

  const dateParts = input.birthDate.split('-');
  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];

  // 簡化的四柱模擬（實際應使用 lib/bazi/engine.ts）
  const mockBaziPillars = [
    { name: '年' as const, stem: '甲', branch: '寅', element: '木' as const, elementColor: '#52c41a' },
    { name: '月' as const, stem: '庚', branch: '午', element: '火' as const, elementColor: '#e63946' },
    { name: '日' as const, stem: '甲', branch: '辰', element: '土' as const, elementColor: '#d4af37' },
    { name: '時' as const, stem: '丙', branch: '寅', element: '木' as const, elementColor: '#52c41a' },
  ];

  // 簡化的紫微宮位模擬（實際應使用 lib/ziwei/engine.ts）
  const mockZiweiPalaces = [
    { name: '命宮', mainStar: '紫微', secondaryStars: ['左輔', '右弼'] },
    { name: '財帛宮', mainStar: '天府', secondaryStars: ['天相'] },
    { name: '官祿宮', mainStar: '天機', secondaryStars: ['巨門'] },
  ];

  // 簡化的神煞模擬（實際應使用 lib/iching-shensha-combos.ts）
  const mockShensha = [
    { id: 'tiandehe', name: '天德合', category: '吉星' as const, pillar: '年' as const },
    { id: 'tiande', name: '天德', category: '吉星' as const, pillar: '月' as const },
    { id: 'yuede', name: '月德', category: '吉星' as const, pillar: '日' as const },
  ];

  // 簡化的易經模擬（實際應使用 lib/iching-layer.ts）
  const mockIching = {
    hexagram: 1,
    name: '乾',
  };

  return {
    user: {
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
    },

    bazi: {
      pillars: mockBaziPillars,
    },

    ziwei: {
      chart: {
        palaces: mockZiweiPalaces,
      },
      verification: {
        status: 'VERIFIED',
      },
    },

    shensha: {
      items: mockShensha,
      flowYear: {
        current: '今年流年提示...',
      },
    },

    iching: {
      result: mockIching,
    },

    visual: {
      themeColor: '#d4af37',
      accentColor: '#e63946',
      cardLayout: 'vertical',
    },

    meta: {
      timestamp: Date.now(),
      version: '1.0.0',
      verified: true,
    },
  };
}

/** GET 方法：健康檢查 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '鬼魅阿修羅 API 運行中',
    endpoint: 'POST /api/ghost-asura/calculate',
  });
}

/** POST 方法：計算命盤 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證輸入
    if (!validateInput(body)) {
      return NextResponse.json(
        {
          code: 'INVALID_INPUT',
          message: '缺少必填欄位或格式錯誤',
          details: {
            required: ['name', 'birthDate'],
            birthDateFormat: 'YYYY-MM-DD',
            birthTimeFormat: 'HH:mm (可選)',
          },
        },
        { status: 400 }
      );
    }

    // 計算命盤（後端純計算）
    const result = await calculateGhostAsuraCard(body);

    // ✅ 只回傳計算結果，不回傳話術
    // 話術由前端調用 lib/asura-frontend-renderer.ts 生成
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API Error]', error);

    return NextResponse.json(
      {
        code: 'CALCULATION_ERROR',
        message:
          error instanceof Error ? error.message : '運算過程中發生錯誤',
      },
      { status: 500 }
    );
  }
}
