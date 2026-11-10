// 能量技／連結攻擊改由伺服端計算（card-attack.ts）：
// 1) parity：伺服端式 == 1f452bb 前端 rig 分支原式（下方 oldClient* 逐行照抄 Match3Board.tsx unleash／fireLink），多組隨機輸入，mismatch 必須 0。
// 2) 擊倒 id：battleId:skill:N:ko:foeId／battleId:link:N:ko:foeId；同 eventId 重送不再傷害、不再產生擊倒；第 8 關 index 4 殿後神獸走魔王分支。
// 3) 伺服端驗證：非 rig 模式、能量不足、受控、連線不足、重複卡、缺 eventId → 丟錯（路由回 400）。
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{esModuleInterop:true,resolveJsonModule:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const CA=require('../lib/beast-game/match3/card-attack.ts'),P=require('../lib/beast-game/match3/player-skills.ts'),D=require('../lib/beast-game/match3/damage.ts'),E=require('../lib/beast-game/match3/enemies.ts'),K=require('../lib/beast-game/match3/knockout-events.ts'),R=require('../lib/beast-game/registry.ts'),PR=require('../lib/beast-game/match3/progression.ts');
const { ENERGY_MAX } = require('../lib/beast-game/match3/config.ts');
const cards=R.playableCards();
const CASES=+(process.env.CARD_ATTACK_CASES||4000);
let seed=20261110;const rnd=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296};const pick=a=>a[Math.floor(rnd()*a.length)];const int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const unit=c=>({id:c.id,name:c.name,thumbnail:'',element:c.element,hp:c.stats.hp,maxHp:c.stats.hp,attack:c.stats.attack,defense:c.stats.defense,speed:c.stats.speed,energy:ENERGY_MAX});
const foeOf=(c,hp)=>({id:c.id,name:c.name,thumbnail:'',element:c.element,hp:Math.min(hp,c.stats.hp*3),maxHp:c.stats.hp*3,attack:c.stats.attack,defense:c.stats.defense,speed:c.stats.speed,cd:1,attackEnergy:0});
const distinct=(n,pool)=>{const out=[];while(out.length<n){const c=pick(pool);if(!out.some(o=>o.id===c.id))out.push(c);}return out};

// ---- 1f452bb Match3Board.tsx rig 分支原式（照抄；rigEnabled=true） ----
function oldClientEnergy(team,foes,u,ti,stageWins,eventId){
  const foe = foes[ti]; const amt = D.skillAmount(D.fighterEffectiveAttack(u), u.element, foe.element);
  const spentTeam = team.map(x => x.id === u.id ? { ...x, energy: 0 } : x);
  const applied = P.resolvePlayerCardAttack({ foes, team: spentTeam, targetIndex: ti, attackerIds: [u.id], baseDamage: amt, stage: stageWins + 1, eventId, allowEnemyReaction: false });
  const damaged = applied.foes; const nextTeam = applied.team; const actualAmount = applied.actualDamage;
  return { foes: damaged, team: nextTeam, actualDamage: actualAmount, actualHits: applied.actualHits, skillEvents: applied.skillEvents };
}
function oldClientLink(team,foes,link,ti,stageWins,eventId){
  const cards = link.map((id) => team.find((u) => u.id === id));
  const amt = E.linkDamage(cards.map((c) => D.fighterEffectiveAttack(c))); const foe = foes[ti];
  const spentTeam = team.map(u => link.includes(u.id) ? { ...u, energy: u.energy - E.LINK_ENERGY_COST } : u);
  const applied = P.resolvePlayerCardAttack({ foes, team: spentTeam, targetIndex: ti, attackerIds: cards.map(c => c.id), baseDamage: amt, stage: stageWins + 1, eventId, allowEnemyReaction: false });
  return { foes: applied.foes, team: applied.team, actualDamage: applied.actualDamage, actualHits: applied.actualHits, skillEvents: applied.skillEvents };
}
const pickOut=r=>JSON.stringify({foes:r.foes,team:r.team,actualDamage:r.actualDamage,actualHits:r.actualHits,skillEvents:r.skillEvents});

// ---- 1) parity ----
let energyCases=0,linkCases=0,mismatch=0,kos=0,bossKos=0,nonzero=0,rejected=0;const mism=[];
for(let n=0;n<CASES;n++){
  const wins=int(0,13),stage=PR.progressionStage(wins).wins+1;
  let team=P.initializePlayerSkills(distinct(5,cards).map(unit)).team;
  const foeCards=distinct(5,cards);
  let foes=E.initializeAvailableFoes(foeCards.map(c=>foeOf(c,int(1,c.stats.hp*3))),stage);
  // 隨機先打幾下，讓 skillRuntime（增益、護盾、受控、receipts）多樣化
  for(let w=int(0,3);w>0;w--){const ti=E.availableFoeTarget(foes,int(0,4),stage);if(ti<0)break;const a=pick(team);const r=P.resolvePlayerCardAttack({team,foes,targetIndex:ti,attackerIds:[a.id],baseDamage:int(1,60),stage,eventId:'warm:'+n+':'+w,allowEnemyReaction:true});team=r.team.map(u=>({...u,energy:ENERGY_MAX}));foes=r.foes;}
  if(rnd()<.35){const ti=int(0,4);foes=foes.map((f,i)=>i===ti?{...f,hp:int(1,30)}:f);} // 低血量 → 擊倒案例
  team=team.map(u=>({...u,energy:pick([ENERGY_MAX,ENERGY_MAX,E.LINK_ENERGY_COST,int(0,ENERGY_MAX)])}));
  const ti=E.availableFoeTarget(foes,int(0,4),stage); if(ti<0)continue;
  const eventId=`${int(0,99999)}:energy:${int(1,40)}`;
  const input={board:[],magic:[],path:[],team,foes,mode:pick(['hard45','hard45b']),wins,target:ti,seed:1,move:0,chosen:{},rule:'tap-lead',attackBoost:1,eventId,actionId:'battle-'+n+':x:1'};
  if(rnd()<.5){
    const u=pick(team);
    const eligible=u.hp>0&&u.energy>=ENERGY_MAX&&D.fighterCanAct(u);
    let srv=null;try{srv=CA.resolveCardAttackTurn({...input,action:'energy',attackerId:u.id});}catch{srv=null}
    if(!eligible){assert.equal(srv,null,'server must reject what the old client guard rejected');rejected++;continue;}
    energyCases++;
    const old=oldClientEnergy(team,foes,u,ti,stage-1,eventId);
    if(pickOut(old)!==pickOut(srv)){mismatch++;if(mism.length<3)mism.push({n,kind:'energy'});}
    if(srv.actualDamage>0)nonzero++;
    const ko=K.deriveServerKnockouts(foes,srv.foes,{actionId:'battle-'+n+':skill:1',source:'server-skill',isFinalBoss:K.reservedGuardianBossRule(stage)});
    kos+=ko.length;bossKos+=ko.filter(e=>e.isFinalBoss).length;
  } else {
    const ids=distinct(int(2,5),team).map(u=>u.id);
    const problem=ids.some(id=>!D.fighterCanAct(team.find(u=>u.id===id)))?'controlled':E.linkProblem(team,ids);
    let srv=null;try{srv=CA.resolveCardAttackTurn({...input,action:'link',linkIds:ids});}catch{srv=null}
    if(problem){assert.equal(srv,null,'server must reject what the old client guard rejected');rejected++;continue;}
    linkCases++;
    const old=oldClientLink(team,foes,ids,ti,stage-1,eventId);
    if(pickOut(old)!==pickOut(srv)){mismatch++;if(mism.length<3)mism.push({n,kind:'link'});}
    if(srv.actualDamage>0)nonzero++;
    const ko=K.deriveServerKnockouts(foes,srv.foes,{actionId:'battle-'+n+':link:1',source:'server-link',isFinalBoss:K.reservedGuardianBossRule(stage)});
    kos+=ko.length;bossKos+=ko.filter(e=>e.isFinalBoss).length;
  }
}
console.log(JSON.stringify({parity:{cases:CASES,energyCases,linkCases,rejectedSameAsClientGuard:rejected,mismatch,nonzeroDamage:nonzero,knockouts:kos,bossKnockouts:bossKos,examples:mism}}));
assert.equal(mismatch,0,'server damage must equal old client damage');
assert.ok(energyCases>500&&linkCases>500&&kos>50,'parity sample must include energy, link and knockout cases');

// ---- 2) KO ids／no replay／boss branch ----
const guardian=cards.find(c=>c.form==='GUARDIAN'),regular=distinct(4,cards.filter(c=>c.form!=='GUARDIAN'));
const strong=P.initializePlayerSkills(distinct(5,cards.filter(c=>c.form!=='GUARDIAN')).map(unit)).team;
const lineup=(hp4)=>[...regular.map(c=>({...foeOf(c,0)})),{...foeOf(guardian,hp4)}];
const bossInput=(wins,action,extra)=>({board:[],magic:[],path:[],team:strong,foes:lineup(1),mode:'hard45',wins,target:4,seed:1,move:0,chosen:{},rule:'tap-lead',attackBoost:1,eventId:'7:energy:1',actionId:'B:'+(action==='energy'?'skill':'link')+':1',action,...extra});
for(const [action,extra] of [['energy',{attackerId:strong[0].id}],['link',{linkIds:[strong[0].id,strong[1].id]}]]){
  const s8=CA.resolveCardAttackTurn(bossInput(7,action,extra));
  assert.ok(s8.foes[4].hp<=0,'stage 8 guardian knocked out by '+action);
  const src=action==='energy'?'server-skill':'server-link',actionId='B:'+(action==='energy'?'skill':'link')+':1';
  const ev=K.deriveServerKnockouts(lineup(1),s8.foes,{actionId,source:src,isFinalBoss:K.reservedGuardianBossRule(8)});
  assert.deepEqual(ev,[{id:actionId+':ko:'+guardian.id,foeId:guardian.id,foeIndex:4,source:src,actionId,isFinalBoss:true}]);
  // 重送同一 eventId：receipts 擋下，不再傷害；從已倒狀態推導不再產生擊倒（不重播）
  const again=CA.resolveCardAttackTurn({...bossInput(7,action,extra),team:s8.team.map(u=>({...u,energy:ENERGY_MAX})),foes:lineup(5)});
  assert.equal(again.actualDamage,0,'same eventId replay deals no damage ('+action+')');
  assert.deepEqual(K.deriveServerKnockouts(s8.foes,s8.foes,{actionId,source:src,isFinalBoss:K.reservedGuardianBossRule(8)}),[],'no replay from already-down foes');
  // 第 7 關同陣容：一般擊倒分支
  const s7=CA.resolveCardAttackTurn(bossInput(6,action,extra));
  const ev7=K.deriveServerKnockouts(lineup(1),s7.foes,{actionId,source:src,isFinalBoss:K.reservedGuardianBossRule(7)});
  assert.equal(ev7.length,1);assert.equal(ev7[0].isFinalBoss,false,'stage 7 is regular fx');
  // 第 8 關 index 0–3 一般敵人：一般分支
  const reg=[...regular.map(c=>foeOf(c,1)),foeOf(guardian,500)];
  const s8r=CA.resolveCardAttackTurn({...bossInput(7,action,extra),foes:reg,target:0,eventId:'7:energy:9'});
  const evr=K.deriveServerKnockouts(reg,s8r.foes,{actionId:'B:x:2',source:src,isFinalBoss:K.reservedGuardianBossRule(8)});
  assert.ok(evr.length===1&&evr[0].foeIndex===0&&evr[0].isFinalBoss===false&&evr[0].id==='B:x:2:ko:'+reg[0].id);
}
// 不同動作 id 不相撞
assert.notEqual('B:skill:1:ko:x','B:link:1:ko:x');

// ---- 3) validation ----
const base={board:[],magic:[],path:[],team:strong,foes:lineup(1),mode:'hard45',wins:7,target:4,seed:1,move:0,chosen:{},rule:'tap-lead',attackBoost:1,eventId:'1:energy:1',actionId:'V:skill:1'};
const bad=[
  ['medium mode',{...base,mode:'medium',action:'energy',attackerId:strong[0].id}],
  ['missing eventId',{...base,eventId:undefined,action:'energy',attackerId:strong[0].id}],
  ['missing actionId',{...base,actionId:undefined,action:'energy',attackerId:strong[0].id}],
  ['energy < max',{...base,team:strong.map((u,i)=>i===0?{...u,energy:ENERGY_MAX-1}:u),action:'energy',attackerId:strong[0].id}],
  ['attacker down',{...base,team:strong.map((u,i)=>i===0?{...u,hp:0}:u),action:'energy',attackerId:strong[0].id}],
  ['unknown attacker',{...base,action:'energy',attackerId:'nope'}],
  ['controlled attacker',{...base,team:strong.map((u,i)=>i===0?{...u,skillRuntime:{...u.skillRuntime,stunnedTurns:1}}:u),action:'energy',attackerId:strong[0].id}],
  ['target down',{...base,target:0,action:'energy',attackerId:strong[0].id}],
  ['link one card',{...base,action:'link',linkIds:[strong[0].id]}],
  ['link duplicate',{...base,action:'link',linkIds:[strong[0].id,strong[0].id]}],
  ['link low energy',{...base,team:strong.map((u,i)=>i===1?{...u,energy:E.LINK_ENERGY_COST-1}:u),action:'link',linkIds:[strong[0].id,strong[1].id]}],
  ['unknown action',{...base,action:'nuke'}],
];
for(const [name,inp] of bad) assert.throws(()=>CA.resolveCardAttackTurn(inp),undefined,name);
console.log(JSON.stringify({koIds:'ok',boss:'ok',validation:bad.length}));
console.log('beast-match3-card-attack-server: PASS');