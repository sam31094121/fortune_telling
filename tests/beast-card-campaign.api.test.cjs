// Synthetic signed battles only: no browser inventory or customer cards are used.
const assert = require('node:assert/strict');
const base = process.env.BEAST_TEST_BASE_URL || 'http://localhost:8888';
async function call(body) {
  const response = await fetch(`${base}/api/beast-game/battlefield`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body), signal:AbortSignal.timeout(30000),
  });
  const data = await response.json();
  assert.equal(response.status,200,JSON.stringify(data)); assert.equal(data.ok,true);
  return data;
}
(async () => {
  const initial = await call({type:'PROGRESS'});
  const selectedEntries = [1,2,3,4,5].map(n=>({id:`synthetic-api-copy-${n}`,cardId:`beast_a${String(n).padStart(2,'0')}`}));
  const deal = await call({type:'DEAL',campaign:true,campaignToken:initial.campaignToken,selectedEntries});
  let battle = await call({type:'START',tableToken:deal.tableToken,playerTeam:selectedEntries.map(c=>c.cardId),stakeCardId:selectedEntries[0].cardId,stakeCount:1});
  assert.equal(battle.match.player.team.length,5); assert.equal(battle.match.opponent.team.length,5);
  let actions=0;
  while(battle.match.status==='PLAYING' && actions<200) { battle=await call({type:'AUTO',token:battle.token}); actions++; }
  assert.equal(battle.match.status,'FINISHED');
  assert.equal(battle.campaign.wins,battle.match.winner==='player'?1:0);
  const replay=await call({type:'RESUME',token:battle.token});
  assert.equal(replay.campaignToken,battle.campaignToken,'finished response cannot promote twice');
  const next=await call({type:'DEAL',campaign:true,campaignToken:battle.campaignToken,selectedEntries});
  assert.equal(next.campaign.stage,battle.campaign.wins+1);
  console.log(JSON.stringify({passed:true,actions,winner:battle.match.winner,nextStage:next.campaign.stage,collectionWrites:0}));
})().catch(error=>{console.error(error);process.exitCode=1;});
