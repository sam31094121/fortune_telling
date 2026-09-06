const assert=require('node:assert/strict');
const {newMatch,advance,chooseAI}=require('../.beast-game-build/lib/beast-game/interactive.js');
const {adjudicate}=require('../.beast-game-build/lib/beast-game/adjudication.js');
assert.throws(()=>adjudicate(newMatch(['beast_y01'],['beast_y02'],1)));
for(let seed=1;seed<=50;seed++){
 let match=newMatch(['beast_y01'],['beast_a02'],seed);
 while(match.status==='PLAYING')match=advance(match,chooseAI(match,'player'));
 const judgment=adjudicate(match);
 assert.equal(judgment.rounds,match.round-1);
 const invalid=structuredClone(match);invalid.winner=match.winner==='player'?'opponent':'player';assert.throws(()=>adjudicate(invalid));
 const hp=structuredClone(match);hp.player.team[0].hp=-1;assert.throws(()=>adjudicate(hp));
 const state=structuredClone(match);state.player.team[0].defeated=!state.player.team[0].defeated;assert.throws(()=>adjudicate(state));
}
let draw=newMatch(['beast_y01'],['beast_a02'],2);draw.status='FINISHED';draw.winner='DRAW';draw.round=81;assert.match(adjudicate(draw).reason,/80 回合/);
draw.round=5;assert.throws(()=>adjudicate(draw));
console.log('PASS: 50場終局驗證、未完成拒絕、偽勝負拒絕、生命矛盾拒絕、回合上限平手');
