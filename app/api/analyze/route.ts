import { NextResponse } from 'next/server';
import { analyzeDestiny } from '@/lib/gemini';
import type { AnalyzeRequest, BloodType, PersonInput } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const VALID_BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];

function validatePerson(person: unknown): string | null {
  if (!person || typeof person !== 'object') {
    return '資料格式錯誤。';
  }

  const candidate = person as Partial<PersonInput>;

  if (typeof candidate.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.birthday)) {
    return '生日格式不正確。';
  }

  const date = new Date(candidate.birthday);
  if (Number.isNaN(date.getTime())) {
    return '生日不是有效日期。';
  }

  if (date.getTime() > Date.now()) {
    return '生日不能是未來日期。';
  }

  if (
    typeof candidate.bloodType !== 'string' ||
    !VALID_BLOOD_TYPES.includes(candidate.bloodType as Exclude<BloodType, ''>)
  ) {
    return '血型格式不正確。';
  }

  if (typeof candidate.name !== 'string' || candidate.name.trim().length < 2) {
    return '姓名至少需要 2 個字，才能解鎖剩餘 70% 的個人模型。';
  }

  return null;
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;

  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch (error) {
    console.error('[api/analyze] invalid request body', error);
    return NextResponse.json({ error: '請求內容不是有效的 JSON。' }, { status: 400 });
  }

  const validationError = validatePerson(body.person);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await analyzeDestiny(body.person);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析過程發生未知錯誤。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
