import {randomInt} from 'node:crypto';
import {NextResponse} from 'next/server';
import {newMatch, advance, chooseAI} from '@/lib/beast-game/interactive';
import {playableCards, getCard} from '@/lib/beast-game/registry';
import {resolveStake} from '@/lib/beast-game/stake';

export const runtime = 'nodejs';
/** Free collection duel: the server resolves both actors using the same engine and AI. */
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ok:false,error:'來源不符'}, {status:403});
    const {entries} = await request.json();
    if(!Array.isArray(entries)||entries.length<1||entries.length>5||new Set(entries.map(e=>e?.id)).size!==entries.length||entries.some(e=>!e||typeof e.id!=='string'||!e.id.trim()||e.id.length>200||typeof e.cardId!=='string'||!getCard(e.cardId)))throw new Error('請押 1～5 張有效收藏紀錄，戰鬥試用牌不能當押注。');
    const cardId=entries[0].cardId;
    const pool = playableCards();
    const opponent = pool[randomInt(pool.length)].id;
    let match = newMatch([cardId], [opponent], randomInt(2147483647));
    for (let i = 0; i < 100 && match.status === 'PLAYING'; i++) match = advance(match, chooseAI(match, 'player'));
    if (match.status !== 'FINISHED') throw new Error('對戰尚未完成，沒有扣卡。');
    const stake=resolveStake({playerStake:cardId,opponentStake:opponent,winner:match.winner === 'player' ? 'PLAYER' : match.winner === 'opponent' ? 'OPPONENT' : 'DRAW'});
    return NextResponse.json({ok:true,rounds:match.round-1,stake:{...stake,netChange:stake.verdict==='LOST'?-entries.length:stake.verdict==='WON'?1:0,selectedEntries:entries,forfeitedEntryIds:stake.verdict==='LOST'?entries.map(e=>e.id):[],message:stake.verdict==='LOST'?`押入的 ${entries.length} 張已輸掉`:stake.verdict==='WON'?`原 ${entries.length} 張保留，額外獎勵一張`:`原 ${entries.length} 張退回`}});
  } catch (error) {
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : '對戰暫時無法開始。'}, {status:400});
  }
}
