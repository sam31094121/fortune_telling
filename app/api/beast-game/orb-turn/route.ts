import { resolveTreasureUse, validateTreasureBook } from '@/lib/beast-game/match3/treasures';
import { NextResponse } from 'next/server';
import { resolveOrbTurn, type TurnInput } from '@/lib/beast-game/match3/resolve-turn';
import { resolveCardAttackTurn } from '@/lib/beast-game/match3/card-attack';
import { isBeastElement } from '@/lib/beast-game/elements';
import { getCard } from '@/lib/beast-game/registry';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 120000) return NextResponse.json({ error: '戰鬥資料過大，請重試。' }, { status: 413 });
    const p = JSON.parse(raw) as TurnInput;
    const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
    if (!['medium','hard45','hard45b'].includes(p.mode) || !integer(p.seed,0,4294967295) || !integer(p.move,0,1000000) || !integer(p.wins,0,1000000) || !integer(p.target,0,4) || ![1,1.5].includes(p.attackBoost)) throw new Error('invalid');
    const rows = p.mode === 'medium' ? 5 : 8;
    if (!Array.isArray(p.board) || p.board.length !== rows || p.board.some(r => !Array.isArray(r) || r.length !== 7 || r.some(e => !isBeastElement(e)))) throw new Error('invalid');
    if (!Array.isArray(p.magic) || p.magic.length !== rows || p.magic.some(r => !Array.isArray(r) || r.length !== 7 || r.some(n => !integer(n,0,1000000)))) throw new Error('invalid');
    if (!Array.isArray(p.path) || p.path.length > 56 || p.path.some(c => !c || !integer(c.r,0,rows-1) || !integer(c.c,0,6))) throw new Error('invalid');
    for (const side of [p.team,p.foes]) {
      if (!Array.isArray(side) || side.length !== 5 || new Set(side.map(f => f.id)).size !== 5) throw new Error('invalid');
      for (const f of side) if (!getCard(f.id) || getCard(f.id)!.element !== f.element || !integer(f.maxHp,1,10000000) || !integer(f.hp,0,f.maxHp) || !integer(f.attack,0,10000000)) throw new Error('invalid');
    }
    if (p.team.some(f => !integer(f.energy,0,100)) || p.foes.some(f => !integer(f.cd,0,1000)) || !['tap-lead','first-attacks','all-attack'].includes(p.rule) || !p.chosen || typeof p.chosen !== 'object' || Array.isArray(p.chosen)) throw new Error('invalid');
    if (p.foes.some(f => f.attackEnergy !== undefined && ![0,25,50,75,100].includes(f.attackEnergy) || f.lastChargeTurn !== undefined && (typeof f.lastChargeTurn !== 'string' || f.lastChargeTurn.length > 80))) throw new Error('invalid');
    if (Object.entries(p.chosen).some(([element,id]) => !isBeastElement(element) || typeof id !== 'string' || !p.team.some(f => f.id === id && f.element === element))) throw new Error('invalid');
    if (p.treasures !== undefined) validateTreasureBook(p.treasures);
    if (p.actionId !== undefined && (typeof p.actionId !== 'string' || !p.actionId.length || p.actionId.length > 100)) throw new Error('invalid');
    if (p.treasureGuard !== undefined && ![1,0.5].includes(p.treasureGuard)) throw new Error('invalid');
    if (p.action === 'treasure') {
      if (!isBeastElement(p.treasureElement) || (p.treasureVariant !== undefined && !integer(p.treasureVariant,0,4))) throw new Error('invalid');
      return NextResponse.json(resolveTreasureUse(p, p.treasureElement, p.treasureVariant ?? 0), { headers: { 'Cache-Control': 'no-store' } });
    }
    // 能量技／連結攻擊：伺服端算傷害並回權威敵方 HP（擊倒由前端 deriveServerKnockouts 讀取，不在前端判定）。
    if (p.action === 'energy' || p.action === 'link') {
      if (p.path.length !== 0) throw new Error('invalid');
      return NextResponse.json(resolveCardAttackTurn(p), { headers: { 'Cache-Control': 'no-store' } });
    }
    if (p.action !== undefined) throw new Error('invalid');
    return NextResponse.json(resolveOrbTurn(p), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: '暫時無法完成本回合，請重試；尚未套用結果。' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
