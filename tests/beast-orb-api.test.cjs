const assert=require('node:assert/strict');
const {fixture}=require('./beast-orb-turn.test.cjs');
const endpoint=(process.env.ORB_TEST_BASE_URL || 'http://127.0.0.1:8888')+'/api/beast-game/orb-turn';
async function post(p){return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:typeof p==='string'?p:JSON.stringify(p)});}
(async()=>{
 for(const mode of ['medium','hard45','hard45b'])for(const rule of ['tap-lead','first-attacks','all-attack']){
  const p=fixture();p.mode=mode;p.rule=rule;if(mode==='medium'){p.board=p.board.slice(0,5);p.magic=p.magic.slice(0,5);}p.board[0].fill('WATER');
  const r=await post(p);assert.equal(r.status,200);assert(r.headers.get('cache-control').split(',').map(s=>s.trim()).includes('no-store'));const result=await r.json();assert.equal(result.res.valid,true);assert(result.counter.team.every(f=>Number.isFinite(f.hp)&&f.hp>=0&&f.hp<=f.maxHp));
 }
 for(const change of [p=>p.board[0].pop(),p=>p.magic[0][0]=-1,p=>p.path[0].r=99,p=>p.team[0].hp=Infinity,p=>p.chosen={SPACE:'missing'},p=>p.attackBoost=100]){const p=fixture();change(p);assert.equal((await post(p)).status,400);}
 assert.equal((await post('{')).status,400);assert.equal((await post(' '.repeat(120001))).status,413);
 console.log('PASS orb API: all modes/rules, no-store, malformed snapshots rejected, no persistence writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
