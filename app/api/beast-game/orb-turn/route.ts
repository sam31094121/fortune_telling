import { resolveTreasureUse, validateTreasureBook } from '@/lib/beast-game/match3/treasures';
import { NextResponse } from 'next/server';
import { resolveOrbTurn, type TurnInput } from '@/lib/beast-game/match3/resolve-turn';
import { resolveCardAttackTurn } from '@/lib/beast-game/match3/card-attack';
import { isBeastElement } from '@/lib/beast-game/elements';
import { getCard } from '@/lib/beast-game/registry';
import { cultivationOwner } from '@/lib/beast-game/cultivation-games';
import { verifySharedOrb, resolveSharedOrbTurn } from '@/lib/beast-game/cultivation-orb';
import { openGuestOrb, guestOrbInput, resolveGuestOrb } from '@/lib/beast-game/guest-orb';
export const runtime = 'nodejs';
// 共同卡庫資料庫在東京（Supabase ap-northeast-1）；函式預設在美東，每次資料庫來回多耗數百毫秒，改放東京。
export const preferredRegion = 'hnd1';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 120000) return NextResponse.json({ error: '戰鬥資料過大，請重試。' }, { status: 413 });
    let p = JSON.parse(raw) as TurnInput & {sharedBattleToken?:string;sharedVersion?:number;guestBattleToken?:string};
    const guest=p.guestBattleToken?openGuestOrb(p.guestBattleToken):null;
    if(guest)p=guestOrbInput(guest,p);
    const owner=cultivationOwner(request);
    const shared=owner&&!guest?await verifySharedOrb(owner,p.sharedBattleToken):null;
    if(p.mode==='hard45'&&!shared&&!guest)throw new Error('親友戰局缺少驗證憑據');
    if(shared){if(p.wins!==shared.wins||JSON.stringify(p.team?.map(c=>c.id))!==JSON.stringify(shared.teamIds))throw new Error('invalid');p.team=p.team.map(c=>({...c,attack:shared.attacks[c.id],attackExact:shared.exactAttacks?.[c.id]}));}
    else if(!guest&&Array.isArray(p.team))p.team=p.team.map(({attackExact,...c})=>c);
    if(Array.isArray(p.foes))p.foes=p.foes.map(f=>{const c={...f} as typeof f & {attackExact?:string};delete c.attackExact;return c;});
    const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
    if (!['medium','hard45','hard45b'].includes(p.mode) || !integer(p.seed,0,4294967295) || !integer(p.move,0,1000000) || !integer(p.wins,0,1000000) || !integer(p.target,0,4) || ![1,1.5].includes(p.attackBoost)) throw new Error('invalid');
    const rows = p.mode === 'medium' ? 5 : 8;
    if (!Array.isArray(p.board) || p.board.length !== rows || p.board.some(r => !Array.isArray(r) || r.length !== 7 || r.some(e => !isBeastElement(e)))) throw new Error('invalid');
    if (!Array.isArray(p.magic) || p.magic.length !== rows || p.magic.some(r => !Array.isArray(r) || r.length !== 7 || r.some(n => !integer(n,0,1000000)))) throw new Error('invalid');
    if (!Array.isArray(p.path) || p.path.length > 56 || p.path.some(c => !c || !integer(c.r,0,rows-1) || !integer(c.c,0,6))) throw new Error('invalid');
    for (const side of [p.team,p.foes]) {
      if (!Array.isArray(side) || side.length !== 5 || new Set(side.map(f => f.id)).size !== 5) throw new Error('invalid');
      for (const f of side) if (!getCard(f.id) || getCard(f.id)!.element !== f.element || !integer(f.maxHp,1,10000000) || !integer(f.hp,0,f.maxHp) || !Number.isSafeInteger(f.attack) || !integer(f.attack,0,side===p.team&&shared?Number.MAX_SAFE_INTEGER:10000000)) throw new Error('invalid');
    }
    if (p.team.some(f => !integer(f.energy,0,100)) || p.foes.some(f => !integer(f.cd,0,1000)) || !['tap-lead','first-attacks','all-attack'].includes(p.rule) || !p.chosen || typeof p.chosen !== 'object' || Array.isArray(p.chosen)) throw new Error('invalid');
    if (p.foes.some(f => f.attackEnergy !== undefined && ![0,25,50,75,100].includes(f.attackEnergy) || f.lastChargeTurn !== undefined && (typeof f.lastChargeTurn !== 'string' || f.lastChargeTurn.length > 80))) throw new Error('invalid');
    if (Object.entries(p.chosen).some(([element,id]) => !isBeastElement(element) || typeof id !== 'string' || !p.team.some(f => f.id === id && f.element === element))) throw new Error('invalid');
    if (p.treasures !== undefined) validateTreasureBook(p.treasures);
    if (p.actionId !== undefined && (typeof p.actionId !== 'string' || !p.actionId.length || p.actionId.length > 100)) throw new Error('invalid');
    if (p.treasureGuard !== undefined && ![1,0.5].includes(p.treasureGuard)) throw new Error('invalid');
    if(guest){
      if(p.action!==undefined&&!['treasure','energy','link'].includes(p.action))throw new Error('invalid');
      if(p.action&&p.path.length)throw new Error('invalid');
      if(p.action==='treasure'&&!isBeastElement(p.treasureElement))throw new Error('invalid');
      return NextResponse.json(resolveGuestOrb(guest,p),{headers:{'Cache-Control':'no-store'}});
    }
    if(shared){
      if(p.action!==undefined&&!['treasure','energy','link'].includes(p.action))throw new Error('invalid');
      if(p.action==='treasure'&&!isBeastElement(p.treasureElement))throw new Error('invalid');
      if(p.action&&p.path.length)throw new Error('invalid');
      return NextResponse.json(await resolveSharedOrbTurn(shared,p,p.sharedVersion!),{headers:{'Cache-Control':'no-store'}});
    }
    if (p.action === 'treasure') {
      if (!isBeastElement(p.treasureElement) || (p.treasureVariant !== undefined && !integer(p.treasureVariant,0,4))) throw new Error('invalid');
      const result=resolveTreasureUse(p, p.treasureElement, p.treasureVariant ?? 0);
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    // 能量技／連結攻擊：伺服端算傷害並回權威敵方 HP（擊倒由前端 deriveServerKnockouts 讀取，不在前端判定）。
    if (p.action === 'energy' || p.action === 'link') {
      if (p.path.length !== 0) throw new Error('invalid');
      const result=resolveCardAttackTurn(p);
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (p.action !== undefined) throw new Error('invalid');
    const result=resolveOrbTurn(p);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: '暫時無法完成本回合，請重試；尚未套用結果。' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
