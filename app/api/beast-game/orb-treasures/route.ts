import { NextResponse } from 'next/server';
import { treasureCatalog, validateTreasureBook } from '@/lib/beast-game/match3/treasures';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 120000) throw new Error('invalid');
    return NextResponse.json(treasureCatalog(validateTreasureBook(JSON.parse(raw))), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: '暫時無法讀取寶器' }, { status: 400 }); }
}
