const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),path=require('node:path');
const transpile=f=>ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
require.extensions['.ts']=(m,f)=>m._compile(transpile(f),f);
const Module=require('node:module'),resolve=Module._resolveFilename;Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(__dirname,'..',name.slice(2)):name,...args)};
const C=require('../lib/beast-game/card-campaign.ts'),R=require('../lib/beast-game/registry.ts'),B=require('../lib/beast-game/battle-session.ts'),I=require('../lib/beast-game/interactive.ts');
const c={v:1,kind:'card-campaign',id:'test-campaign',seed:100,wins:0,pending:null,enhancements:[]};
const cards=R.playableCards(),snapshot=JSON.stringify(cards),young=cards.find(x=>x.form==='YOUNG'),adult=cards.find(x=>x.form==='ADULT');
const selected=[adult,...cards.filter(x=>x.id!==adult.id).slice(0,4)].map((x,i)=>({id:`owned-${i}`,cardId:x.id}));
const material={id:'material-unique',cardId:young.id},target=selected[0];
for(const [wins,difficulty] of [[0,'EASY'],[2,'EASY'],[3,'NORMAL'],[6,'NORMAL'],[7,'HARD'],[20,'HARD']]){
 const progress={...c,wins},stage=C.cardCampaignStage(wins);assert.equal(stage.difficulty,difficulty);assert.equal(stage.enemyMultiplier,1+wins*.02);
 const opponents=C.cardCampaignOpponent(progress);assert.equal(new Set(opponents).size,5);assert.deepEqual(C.cardCampaignOpponent(progress),opponents);
 const base=I.newMatch(selected.map(e=>e.cardId),opponents,10,{difficulty}),scaled=C.applyCardCampaignStats(base,progress,selected);
 assert.equal(scaled.opponent.team[0].attack,Math.round(base.opponent.team[0].attack*(1+wins*.02)));assert.equal(scaled.opponent.team[0].hp,Math.round(base.opponent.team[0].hp*(1+wins*.02)));assert.equal(scaled.opponent.team[0].speed,base.opponent.team[0].speed);
 const upgraded=C.enhanceCardCampaign(progress,'op',target,material).campaign;
 const trained=C.applyCardCampaignStats(base,upgraded,selected);assert.deepEqual(trained.opponent,scaled.opponent,'enemy never copies player growth');assert.equal(trained.player.team[0].attack,base.player.team[0].attack+upgraded.enhancements[0].attackBonus);
}
const preview=C.cardCampaignEnhancementPreview(c,target,material),enhanced=C.enhanceCardCampaign(c,'op1',target,material);
assert.equal(preview.battleBaseAttack,I.newMatch([adult.id],[adult.id],1).player.team[0].attack);assert.equal(enhanced.receipt.attackBonus,Math.max(1,Math.floor(young.stats.attack*.1)));
assert.equal(C.enhanceCardCampaign(enhanced.campaign,'op1',target,material).duplicate,true);assert.throws(()=>C.enhanceCardCampaign(enhanced.campaign,'op2',target,material));assert.throws(()=>C.enhanceCardCampaign({...c,pending:'battle'},'op',target,material));
assert.equal(C.cardCampaignEnhancementPreview({...c,enhancements:Array(2048).fill(enhanced.receipt)},target,{...material,id:'new'}).allowed,false);
const token=B.signCardCampaign(enhanced.campaign);assert.deepEqual(B.openCardCampaign(token),enhanced.campaign);assert.equal(B.openCardCampaign(token.slice(0,-1)+'!'),null);
assert.equal(C.parseCardCampaign({...c,wins:-1}),null);assert.equal(C.parseCardCampaign({...enhanced.campaign,enhancements:[{...enhanced.receipt,attackBonus:9999}]}),null);
assert.equal(JSON.stringify(cards),snapshot);
const route={exports:{}};vm.runInNewContext(transpile(path.join(__dirname,'../app/api/beast-game/battlefield/route.ts')),{exports:route.exports,console,URL,Buffer,Date,process,require(name){if(name==='next/server')return {NextResponse:{json:(data,opts={})=>({data,status:opts.status??200})}};if(name.startsWith('@/'))return require(path.join(__dirname,'..',name.slice(2)+'.ts'));return require(name);}});
async function call(body){return route.exports.POST(new Request('http://localhost/api/beast-game/battlefield',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));}
(async()=>{
 const progress=(await call({type:'PROGRESS'})).data;assert(progress.ok);
 const request={type:'DEAL',campaign:true,campaignToken:progress.campaignToken,selectedEntries:selected};
 const deal=(await call(request)).data,repeated=(await call(request)).data;assert(deal.ok);assert.deepEqual(deal.table.opponent,repeated.table.opponent);assert.equal(B.openTableTicket(deal.tableToken).opponentTeam.length,5);
 const started=(await call({type:'START',tableToken:deal.tableToken,playerTeam:selected.map(e=>e.cardId),stakeCount:20,stakeCardId:young.id})).data;assert(started.ok);assert.equal(started.match.player.team.length,5);assert.equal(started.match.opponent.team.length,5);
 assert.equal((await call({type:'ENHANCE',campaignToken:started.campaignToken,target,material,operationId:'blocked'})).status,400);
 const session=B.openBattleSession(started.token);for(const winner of ['player','opponent','DRAW']){const final={...session,match:{...session.match,status:'FINISHED',winner}};const one=(await call({type:'RESUME',token:B.signBattleSession(final)})).data,two=(await call({type:'RESUME',token:B.signBattleSession(final)})).data;assert.equal(one.campaign.wins,winner==='player'?1:0);assert.equal(one.campaignToken,two.campaignToken);}
 const trial=(await call({type:'DEAL',campaign:true,campaignToken:progress.campaignToken})).data;
 assert.equal((await call({type:'START',tableToken:trial.tableToken,playerTeam:trial.table.player.hand,stakeCount:1,stakeCardId:young.id})).status,400);
 const trialStart=(await call({type:'START',tableToken:trial.tableToken,playerTeam:trial.table.player.hand,stakeCount:0})).data;assert(trialStart.ok);
 const trialSession=B.openBattleSession(trialStart.token);trialSession.match.status='FINISHED';trialSession.match.winner='player';assert.equal((await call({type:'RESUME',token:B.signBattleSession(trialSession)})).data.campaign.wins,0,'free trial cannot advance staked campaign');
 assert.equal((await call({type:'START',tableToken:deal.tableToken,playerTeam:selected.slice(0,4).map(e=>e.cardId),stakeCount:0})).status,400);
 const before=(await call({type:'ENHANCE',preview:true,campaignToken:progress.campaignToken,target,material})).data;assert(before.preview.allowed);
 const save=(await call({type:'ENHANCE',campaignToken:before.campaignToken,target,material,operationId:'saved'})).data;assert(save.ok);assert.equal(save.receipt.attackBonus,preview.attackBonus);
 assert.deepEqual(save.receipt.display,preview.display);
 const trainedDeal=(await call({...request,campaignToken:save.campaignToken,opponentTeam:['fake']})).data;
 const trainedStart=(await call({type:'START',tableToken:trainedDeal.tableToken,playerTeam:selected.map(e=>e.cardId),stakeCount:1,stakeCardId:young.id,opponentTeam:['fake']})).data;
 assert.equal(trainedStart.match.player.team[0].attack,save.receipt.display.afterAttack,'signed real-copy bonus reaches original battle attack');
 assert.deepEqual(trainedStart.match.opponent.team,started.match.opponent.team,'player enhancement does not inflate fixed opponent');
 const move=(await call({type:'ACTION',token:trainedStart.token,action:{type:'ATTACK'}})).data;assert(move.ok);assert.equal(move.match.revision,1);assert.equal(move.campaign.wins,0,'an action cannot advance the stage');
 console.log('PASS card campaign: fixed 5v5 opponent, stage strategy/2% independent stats, signed progress, win-only once/trial no promotion, owned-copy enhancement original formula/capacity/replay, unchanged card definitions');
})().catch(e=>{console.error(e);process.exit(1)});
