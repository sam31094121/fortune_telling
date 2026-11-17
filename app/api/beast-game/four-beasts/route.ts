import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cultivationRepository } from '@/lib/beast-game/cultivation-repository';
import { fourBeastsView } from '@/lib/beast-game/four-beasts-view';

export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';
const headers = { 'Cache-Control': 'no-store' };

/** 唯讀：四大神獸強化頁的計數、關係與每張材料能不能強化，全部在這裡算好。真正扣料仍走 /api/beast-game/cultivation 的 FUSE。 */
export async function GET(request: Request) {
  try {
    const capability = request.headers.get('x-beast-wallet');
    if (!capability || !/^[a-f0-9]{64}$/.test(capability)) throw new Error('共同卡庫識別無效，請保留原存檔。');
    const owner = createHash('sha256').update(capability).digest('hex');
    return NextResponse.json({ ok: true, view: fourBeastsView(await cultivationRepository().read(owner)) }, { headers });
  } catch (error) {
    const message = error instanceof Error && /[\u3400-\u9fff]/.test(error.message) ? error.message : '共同卡庫暫時無法取得，請稍後重試。';
    return NextResponse.json({ ok: false, error: message }, { status: 400, headers });
  }
}
