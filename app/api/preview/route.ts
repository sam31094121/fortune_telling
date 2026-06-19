import { NextResponse } from 'next/server';
import { analyzePreview } from '@/lib/gemini';
import type { BloodType, PreviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const VALID_BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];

export async function POST(request: Request) {
  let body: PreviewRequest;

  try {
    body = (await request.json()) as PreviewRequest;
  } catch (error) {
    console.error('[api/preview] invalid request body', error);
    return NextResponse.json({ error: '請求內容不是有效的 JSON。' }, { status: 400 });
  }

  if (typeof body.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthday)) {
    return NextResponse.json({ error: '生日格式不正確。' }, { status: 400 });
  }

  if (!VALID_BLOOD_TYPES.includes(body.bloodType)) {
    return NextResponse.json({ error: '血型格式不正確。' }, { status: 400 });
  }

  try {
    const result = await analyzePreview({
      birthday: body.birthday,
      bloodType: body.bloodType,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '天地預分析發生未知錯誤。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
