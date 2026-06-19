// POST /api/analyze
// 接收兩人資料 → 驗證 → 呼叫 Gemini → 回傳結構化分析結果
// 前端不直接接觸 Gemini，金鑰只存在於此 server-side 環境

import { NextResponse } from 'next/server';
import { analyzeCompatibility } from '@/lib/gemini';
import type { AnalyzeRequest, BloodType, PersonInput } from '@/lib/types';

// 強制動態執行，避免被靜態快取（每次請求都要即時呼叫 AI）
export const dynamic = 'force-dynamic';

// 放寬 serverless function 逾時上限到 30 秒（Vercel 免費方案預設僅 10 秒）
// 避免 Gemini 偶爾回應較慢時，線上版被提早切斷而失敗
export const maxDuration = 30;

const VALID_BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];

/** 驗證單一使用者輸入，回傳錯誤訊息字串；通過則回傳 null */
function validatePerson(person: unknown, label: string): string | null {
  if (!person || typeof person !== 'object') {
    return `${label}資料缺失`;
  }

  const p = person as Partial<PersonInput>;

  if (typeof p.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(p.bloodType as BloodType)) {
    return `${label}血型無效`;
  }

  // 生日需為 YYYY-MM-DD 且可被解析為合法日期
  if (typeof p.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) {
    return `${label}生日格式錯誤`;
  }
  const date = new Date(p.birthday);
  if (Number.isNaN(date.getTime())) {
    return `${label}生日不是有效日期`;
  }
  // 不允許未來日期
  if (date.getTime() > Date.now()) {
    return `${label}生日不能是未來日期`;
  }

  return null;
}

export async function POST(request: Request) {
  // 1. 解析 body
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch (err) {
    console.error('[api/analyze] body 解析失敗：', err);
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  // 2. 驗證雙方輸入
  const errorA = validatePerson(body.personA, '第一位');
  if (errorA) {
    return NextResponse.json({ error: errorA }, { status: 400 });
  }
  const errorB = validatePerson(body.personB, '第二位');
  if (errorB) {
    return NextResponse.json({ error: errorB }, { status: 400 });
  }

  // 3. 呼叫 Gemini 分析
  try {
    const result = await analyzeCompatibility(body.personA, body.personB);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    // analyzeCompatibility 內已 log 細節，此處回傳對使用者友善的訊息
    const message = err instanceof Error ? err.message : '分析失敗，請稍後再試';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
