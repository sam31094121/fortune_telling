/**
 * 九宮格靈動數字 API
 * GET  → 填寫引導與公信力說明（來自技能檔案，前端只照印）
 * POST { birthDate: 'YYYY-MM-DD'（西元）, name?: string } → 九宮格、數字特質、靈動連線（後端運算）
 *   有 name 時另外附上 nameOverlay（姓名五格來自既有姓名學引擎；本站交叉對照，非古法）；study 本身完全不變。
 */
import { NextResponse } from 'next/server';
import { buildNineGridGuidance, buildNineGridStudy, parseBirthDate } from '@/lib/nine-grid-numbers';
import { buildNineGridNameOverlay } from '@/lib/nine-grid-name-overlay';
import { buildNameologyAnalysis } from '@/lib/nameology-engine';
import { getNamePersonalityScores } from '@/lib/name-model-db';
import { loadLocalNameologyDictionary } from '@/lib/nameology-dictionary-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, guidance: buildNineGridGuidance() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: '資料格式無法讀取，請重新送出一次。' }, { status: 400 });
  }
  const birthDate = body && typeof body === 'object' ? (body as { birthDate?: unknown }).birthDate : undefined;
  const rawName = body && typeof body === 'object' ? (body as { name?: unknown }).name : undefined;
  const parsed = parseBirthDate(birthDate);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: parsed.message }, { status: 400 });
  let study;
  try {
    study = buildNineGridStudy(parsed);
  } catch (error) {
    console.error('[nine-grid] failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, code: 'TEMPORARILY_UNAVAILABLE', message: '九宮格正在重新同步，請稍候再試。' }, { status: 502 });
  }
  if (rawName === undefined || rawName === null || (typeof rawName === 'string' && rawName.trim() === '')) {
    return NextResponse.json({ ok: true, study });
  }
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!/^\p{Script=Han}{2,6}$/u.test(name)) {
    return NextResponse.json({ ok: false, code: 'INVALID_NAME', message: '姓名請輸入 2 到 6 個中文字。' }, { status: 400 });
  }
  try {
    const dictionarySnapshot = await loadLocalNameologyDictionary();
    const analysis = buildNameologyAnalysis(name, getNamePersonalityScores(name), { birthDate: parsed.birthDate, dictionarySnapshot });
    if (!analysis.standardOutput.verification.readyForFrontend) {
      return NextResponse.json({ ok: false, code: 'NAME_RULES_NOT_READY', message: '這個名字有字還查不到可靠筆畫，暫時無法對照。' }, { status: 422 });
    }
    return NextResponse.json({ ok: true, study, nameOverlay: buildNineGridNameOverlay(study, name, analysis.grids, analysis.characters) });
  } catch (error) {
    console.error('[nine-grid] name overlay failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, code: 'TEMPORARILY_UNAVAILABLE', message: '姓名對照正在重新同步，請稍候再試。' }, { status: 502 });
  }
}
