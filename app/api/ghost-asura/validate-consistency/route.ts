/**
 * 鬼魅阿修羅跨設備驗證 API
 *
 * 端點：POST /api/ghost-asura/validate-consistency
 * 功能：驗證三端（手機、平板、電腦）的數據一致性
 *
 * 規範 #30-33：三端驗證
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  validateCrossDeviceConsistency,
  formatValidationResult,
  type AsuraDisplayModelV1,
  type CrossDeviceValidationResult,
} from '@/lib/ghost-asura-cross-device-validator';

export const runtime = 'nodejs';

/**
 * 請求體定義
 */
interface ValidationRequest {
  clientInputHash: string;
  backendVersion: string;
  skillVersion: string;
  mobileData: AsuraDisplayModelV1[];
  tabletData: AsuraDisplayModelV1[];
  desktopData: AsuraDisplayModelV1[];
}

/**
 * 驗證請求格式
 */
function validateRequest(body: unknown): body is ValidationRequest {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const req = body as Record<string, unknown>;

  return (
    typeof req.clientInputHash === 'string' &&
    typeof req.backendVersion === 'string' &&
    typeof req.skillVersion === 'string' &&
    Array.isArray(req.mobileData) &&
    Array.isArray(req.tabletData) &&
    Array.isArray(req.desktopData)
  );
}

/**
 * POST /api/ghost-asura/validate-consistency
 *
 * 驗證三端資料一致性
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        {
          error: 'Content-Type must be application/json',
          status: 'error',
        },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          status: 'error',
        },
        { status: 400 }
      );
    }

    // 驗證請求格式
    if (!validateRequest(body)) {
      return NextResponse.json(
        {
          error: 'Invalid request format. Required fields: clientInputHash, backendVersion, skillVersion, mobileData, tabletData, desktopData',
          status: 'error',
        },
        { status: 400 }
      );
    }

    // 執行驗證
    const result: CrossDeviceValidationResult =
      validateCrossDeviceConsistency(
        body.clientInputHash,
        body.backendVersion,
        body.skillVersion,
        body.mobileData,
        body.tabletData,
        body.desktopData
      );

    // 格式化結果
    const formatted = formatValidationResult(result);

    return NextResponse.json(
      {
        status: result.isConsistent ? 'PASSED' : 'FAILED',
        consistent: result.isConsistent,
        result,
        formatted,
      },
      {
        status: result.isConsistent ? 200 : 422,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS 支持
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
