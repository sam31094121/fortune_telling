import { isBeastElement } from '@/lib/beast-game/elements';
import { getCard } from '@/lib/beast-game/registry';
import { NextResponse } from 'next/server';
import { treasureCatalog, validateTreasureBook } from '@/lib/beast-game/match3/treasures';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 120000) throw new Error('invalid');
    const p = JSON.parse(raw);
    const team = p.team;
    if (team !== undefined && (!Array.isArray(team) || team.length !== 5 || new Set(team.map((u: {id:string})=>u.id)).size !== 5 || team.some((u:{id:string;element:unknown;hp:number})=>!isBeastElement(u.element) || getCard(u.id)?.element !== u.element || !Number.isSafeInteger(u.hp) || u.hp < 0))) throw new Error('invalid team');
    return NextResponse.json(treasureCatalog(validateTreasureBook(p.book ?? p), team), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: '暫時無法讀取寶器' }, { status: 400 }); }
}
