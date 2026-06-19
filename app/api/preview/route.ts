import { NextResponse } from 'next/server';
import { analyzePreview } from '@/lib/gemini';
import { isRecord, isValidBirthday, isValidBloodType } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error('[api/preview] invalid request body', error);
    return NextResponse.json({ error: '請求內容不是有效的 JSON。' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: '資料格式錯誤。' }, { status: 400 });
  }

  if (!isValidBirthday(body.birthday)) {
    return NextResponse.json({ error: '生日格式不正確、日期無效，或是未來日期。' }, { status: 400 });
  }

  if (!isValidBloodType(body.bloodType)) {
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
