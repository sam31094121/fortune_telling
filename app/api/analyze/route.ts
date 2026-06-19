import { NextResponse } from 'next/server';
import { analyzeDestiny } from '@/lib/gemini';
import type { PersonInput } from '@/lib/types';
import { isRecord, isValidBirthday, isValidBloodType } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function validatePerson(person: unknown): string | null {
  if (!isRecord(person)) {
    return '資料格式錯誤。';
  }

  const candidate = person as Partial<PersonInput>;

  if (!isValidBirthday(candidate.birthday)) {
    return '生日格式不正確、日期無效，或是未來日期。';
  }

  if (
    !isValidBloodType(candidate.bloodType)
  ) {
    return '血型格式不正確。';
  }

  if (
    typeof candidate.name !== 'string'
    || candidate.name.trim().length < 2
    || candidate.name.trim().length > 20
  ) {
    return '姓名需要 2 到 20 個字，才能解鎖剩餘 70% 的個人模型。';
  }

  return null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error('[api/analyze] invalid request body', error);
    return NextResponse.json({ error: '請求內容不是有效的 JSON。' }, { status: 400 });
  }

  const person = isRecord(body) ? body.person : undefined;
  const validationError = validatePerson(person);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await analyzeDestiny({
      ...(person as PersonInput),
      name: (person as PersonInput).name.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析過程發生未知錯誤。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
