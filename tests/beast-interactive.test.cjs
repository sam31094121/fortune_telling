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
/*
  抽樣場數。

  完整模式 5000 顆種子 × 鏡像兩場 = 一萬場，每張卡約出現一千次；
  35%–65% 的平衡閘門在這個樣本數下才站得住。

  但健康檢查一天要跑很多次，這一項就佔 16.5 秒——將近全場的兩成。
  所以健檢改跑 500 顆種子（一千場）當煙霧測試：
  正確性斷言照跑（那些是決定性的，跑一場跟跑一萬場結果一樣），
  **平衡閘門不評估**。

  為什麼不是把區間放寬就好：每張卡只出現約一百次時，
  一張真正五五波的卡光靠雜訊就可能落到 35% 以下——
  那不是抓到不平衡，是抓到樣本太小。與其誤報，不如誠實說「這一輪沒驗」。

  完整驗證走 npm run test:beast-interactive:full，推送閘也跑那一支。
*/
// 用命令列參數而不是環境變數：npm script 設環境變數在 Windows 與 POSIX 寫法不同，
// 還要多裝一個 cross-env。參數兩邊都一樣。
const seedArg=process.argv.indexOf('--seeds');
const SEEDS=seedArg>0?Number(process.argv[seedArg+1]):5000;
const FULL=SEEDS>=5000;
const MATCHES=SEEDS*2;
const stats=Object.fromEntries(ids.map(id=>[id,{appearances:0,wins:0,draws:0}]));
let draws=0,playerWins=0,maxRounds=0;
for(let seed=0;seed<SEEDS;seed++){
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
/*
  報告寫實際跑了幾場，不是寫死一萬——報告說謊比沒有報告更糟。

  而且煙霧模式寫另一個檔：balance.json 是一萬場的公平性證據，
  被一千場的結果覆蓋掉，就等於把證據換成比較弱的那一份，
  之後誰去看都以為那是完整取樣。
*/
fs.writeFileSync(FULL?'reports/beast-turn-based/balance.json':'reports/beast-turn-based/balance-smoke.json',JSON.stringify({version:'turn-based-1.0.0',mode:FULL?'FULL':'SMOKE',matches:MATCHES,policy:'deterministic skill-first, mirrored lineups; not human strategy coverage',playerWins,draws,maxRounds,stats,flags},null,2));
console.log(JSON.stringify({mode:FULL?'FULL':'SMOKE',matches:MATCHES,playerWins,draws,maxRounds,flags},null,2));
if(FULL)assert.equal(flags.length,0,'35%-65% warning gate; investigate before release');
else console.log(`煙霧模式：${MATCHES} 場，平衡閘門未評估（樣本不足會誤報）。完整驗證跑 npm run test:beast-interactive:full`);
console.log('Interactive engine validation passed.');
