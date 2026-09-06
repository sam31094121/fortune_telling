const assert=require('node:assert/strict');
const fs=require('node:fs');
const {newMatch,advance,legalActions,chooseAI,interactiveCatalog}=require('../.beast-game-build/lib/beast-game/interactive');
const {createRng}=require('../.beast-game-build/lib/beast-game/turn');
const cards=interactiveCatalog(),ids=cards.map(c=>c.id);
assert.equal(new Set(ids).size,60);
assert.equal(cards.filter(c=>c.evolution).length,28);
assert(cards.every(c=>c.role&&c.skillName&&c.description&&c.stats.hp>0));
assert.throws(()=>newMatch([ids[0],ids[0],ids[1]],ids.slice(3,6),7));
let game=newMatch(ids.slice(0,3),ids.slice(3,6),7);
const frozen=JSON.stringify(game),next=advance(game,{type:'ATTACK'});
assert.equal(JSON.stringify(game),frozen,'pure engine must not mutate the input');
assert.deepEqual(next,advance(game,{type:'ATTACK'}),'same state and action replay identically');
game.player.energy=0;
assert.throws(()=>advance(game,{type:'SKILL'}),'no free skills');
assert.throws(()=>advance(game,{type:'SWITCH',index:99}));
game.player.team[0].hp=0;game.player.team[0].defeated=true;
assert(legalActions(game,'player').every(a=>a.type==='SWITCH'));
const replacement=advance(game,{type:'SWITCH',index:1});
assert.equal(replacement.round,game.round);assert.equal(replacement.player.energy,game.player.energy);
assert.equal(replacement.opponent.team[0].hp,game.opponent.team[0].hp,'replacement never grants free damage');
assert(fs.readFileSync('app/beast-game/page.tsx','utf8').includes('<BeastTurnGame'));
assert(!fs.readFileSync('components/BeastTurnGame.tsx','utf8').includes('advance('),'UI cannot resolve outcomes');
const stats=Object.fromEntries(ids.map(id=>[id,{appearances:0,wins:0,draws:0}]));
let draws=0,playerWins=0,maxRounds=0;
for(let seed=0;seed<5000;seed++){
 const rng=createRng(seed),pool=[...ids],pick=()=>pool.splice(Math.floor(rng()*pool.length),1)[0];
 const a=[pick(),pick(),pick()],b=[pick(),pick(),pick()];
 for(const swap of [false,true]){
  let s=newMatch(swap?b:a,swap?a:b,seed);
  while(s.status==='PLAYING')s=advance(s,chooseAI(s,'player'),chooseAI(s,'opponent'));
  maxRounds=Math.max(maxRounds,s.round-1);if(s.winner==='DRAW')draws++;if(s.winner==='player')playerWins++;
  for(const side of ['player','opponent'])for(const f of s[side].team){stats[f.cardId].appearances++;if(s.winner===side)stats[f.cardId].wins++;if(s.winner==='DRAW')stats[f.cardId].draws++;assert(f.hp>=0&&f.hp<=f.maxHp);}
 }
}
const flags=cards.flatMap(c=>{const st=stats[c.id],rate=(st.wins+st.draws*.5)/st.appearances;return rate>.65||rate<.35?[{id:c.id,role:c.role,rate,...st}]:[];});
fs.mkdirSync('reports/beast-turn-based',{recursive:true});
fs.writeFileSync('reports/beast-turn-based/balance.json',JSON.stringify({version:'turn-based-1.0.0',matches:10000,policy:'deterministic skill-first, mirrored lineups; not human strategy coverage',playerWins,draws,maxRounds,stats,flags},null,2));
console.log(JSON.stringify({matches:10000,playerWins,draws,maxRounds,flags},null,2));
assert.equal(flags.length,0,'35%-65% warning gate; investigate before release');
console.log('Interactive engine validation passed.');
