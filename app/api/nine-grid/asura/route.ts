/**
 * 阿修羅九宮融會 API（鬼魅阿修羅技能檔案：九宮融會.md）
 * POST { birthDate: 'YYYY-MM-DD'（西元）, name?: string } → { ok, asuraFusion }
 *
 * 不重做任何運算：九宮格與姓名疊圖直接取自 /api/nine-grid（同一個處理函式，驗證與錯誤一模一樣），
 * 生命主數取自西方生命密碼引擎；這裡只把它們依「根→盤→合→位→名→斷」重組成阿修羅話術。
 * /api/nine-grid 的回應完全不變。
 */
import { NextResponse } from 'next/server';
import { POST as nineGridPost } from '../route';
import { buildAsuraFusion, type FusionLifeCode } from '@/lib/nine-grid-asura-fusion';
import { calculateLifeCode } from '@/lib/western-life-code/engine';
import type { NineGridStudy } from '@/lib/nine-grid-numbers';
import type { NineGridNameOverlay } from '@/lib/nine-grid-name-overlay';

export const dynamic = 'force-dynamic';

type NineGridBody = { ok: boolean; study?: NineGridStudy; nameOverlay?: NineGridNameOverlay; code?: string; message?: string };

/** 生命密碼只取「生命主數」那張卡；算不出來就當作沒有，融會的「根」會誠實標示未核對。 */
function lifeCodeFor(birthDate: string): FusionLifeCode | null {
  try {
    return calculateLifeCode({ birthDate }) as unknown as FusionLifeCode;
  } catch (error) {
    console.error('[nine-grid/asura] life code unavailable', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function POST(request: Request) {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: '資料格式無法讀取，請重新送出一次。' }, { status: 400 });
  }

  // 與 /api/nine-grid 同一個處理函式：輸入驗證、姓名查字、錯誤訊息全部沿用。
  const upstream = await nineGridPost(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text }));
  const data = (await upstream.json()) as NineGridBody;
  if (!upstream.ok || !data.ok || !data.study) {
    return NextResponse.json(
      { ok: false, code: data.code ?? 'TEMPORARILY_UNAVAILABLE', message: data.message ?? '阿修羅九宮融會暫時無法使用，請稍後再試。' },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }

  const asuraFusion = buildAsuraFusion({
    study: data.study,
    nameOverlay: data.nameOverlay ?? null,
    lifeCode: lifeCodeFor(data.study.input.birthDate),
  });
  return NextResponse.json({ ok: true, asuraFusion });
}
