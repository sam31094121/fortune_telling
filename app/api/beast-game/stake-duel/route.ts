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
    const {cardId} = await request.json();
    if (typeof cardId !== 'string' || !getCard(cardId)) throw new Error('請選擇有效收藏卡。');
    const pool = playableCards();
    const opponent = pool[randomInt(pool.length)].id;
    let match = newMatch([cardId], [opponent], randomInt(2147483647));
    for (let i = 0; i < 100 && match.status === 'PLAYING'; i++) match = advance(match, chooseAI(match, 'player'));
    if (match.status !== 'FINISHED') throw new Error('對戰尚未完成，沒有扣卡。');
    return NextResponse.json({ok:true,rounds:match.round-1,stake:resolveStake({playerStake:cardId,opponentStake:opponent,winner:match.winner === 'player' ? 'PLAYER' : match.winner === 'opponent' ? 'OPPONENT' : 'DRAW'})});
  } catch (error) {
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : '對戰暫時無法開始。'}, {status:400});
  }
}
