import type { Match } from './interactive';

/** Validate the engine's terminal state before authorizing collection settlement. */
export function adjudicate(match:Match) {
  if(match.status!=='FINISHED'||!match.winner)throw new Error('對戰尚未完成，不予結算。');
  for(const side of [match.player,match.opponent]) {
    if(!side.team.length||side.team.some(card=>!Number.isFinite(card.hp)||card.hp<0||card.hp>card.maxHp||card.defeated!==(card.hp===0)))throw new Error('生命與擊倒紀錄不一致，暫停判決。');
  }
  const playerDown=match.player.team.every(card=>card.defeated);
  const opponentDown=match.opponent.team.every(card=>card.defeated);
  const expected=playerDown&&opponentDown?'DRAW':opponentDown?'player':playerDown?'opponent':match.round>80?'DRAW':null;
  if(!expected||match.winner!==expected)throw new Error('勝負與戰鬥終局不一致，暫停判決。');
  const reason=playerDown&&opponentDown?'雙方全部倒下，判為平手。':opponentDown?'對手神獸全部倒下，我方獲勝。':playerDown?'我方神獸全部倒下，對手獲勝。':'已達 80 回合上限，雙方仍有神獸存活，判為平手。';
  return {ruleId:'beast-adjudication-v1',engineVersion:match.version,rounds:match.round-1,reason,
    remaining:`我方剩餘生命 ${match.player.team.reduce((sum,c)=>sum+c.hp,0)}；對手剩餘生命 ${match.opponent.team.reduce((sum,c)=>sum+c.hp,0)}。`};
}
