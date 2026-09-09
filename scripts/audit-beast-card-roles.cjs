/* Reproducible scope-limited audit. Public-state policies never read a submitted rival action. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {newMatch,advance,legalActions,chooseAI,interactiveCatalog,profile} = require('../.beast-game-build/lib/beast-game/interactive');
const {cardTactics} = require('../.beast-game-build/lib/beast-game/card-tactics');
const {elementMultiplier,ELEMENT_LABEL} = require('../.beast-game-build/lib/beast-game/elements');
const cards=interactiveCatalog();
assert.equal(cards.length,60);
assert.deepEqual(['ADULT','YOUNG','GUARDIAN'].map(form=>cards.filter(c=>c.form===form).length),[28,28,4]);
const attack=(s,side)=>legalActions(s,side).find(a=>a.type==='ATTACK')??legalActions(s,side)[0];
const patient=(s,side)=>{
  const t=s[side],f=t.team[t.active],p=profile(f.cardId);
  const option=legalActions(s,side).find(a=>a.type==='SKILL');
  if(!option||f.defeated)return attack(s,side);
  if(p.role==='輔助'&&f.maxHp-f.hp<p.effects[0].value&&f.hp>f.maxHp*.4)return attack(s,side);
  if(p.role==='守護'&&f.shield>=20)return attack(s,side);
  if(p.role==='反擊'&&(f.counter||f.shield>=30))return attack(s,side);
  return option;
};
const policies={attack,existing:chooseAI,patient};
function duel(a,b,seed,pa,pb,context){
  let s=newMatch(a,b,seed),turns=0;
  if(context){s.player.team[0].hp=Math.min(context.hp,s.player.team[0].maxHp);s.opponent.team[0].hp=Math.min(context.foeHp,s.opponent.team[0].maxHp);s.player.energy=context.energy;s.player.team[0].shield=context.shield;}
  while(s.status==='PLAYING'){
    const left=pa(s,'player'),right=pb(s,'opponent');
    s=advance(s,left,right);assert.ok(++turns<=170);
    for(const side of ['player','opponent'])for(const f of s[side].team)assert.ok(f.hp>=0&&f.hp<=f.maxHp&&f.shield>=0&&f.shield<=70);
  }
  return s;
}
const stats=Object.fromEntries(cards.map(c=>[c.id,{wins:0,losses:0,draws:0,byPolicy:{},winExample:null,lossExample:null}]));
const matrix={};let matches=0,youngOverGuardian=0,guardianOverYoung=0;
for(const [policyName,policy] of Object.entries(policies)){
  matrix[policyName]={};
  for(const card of cards){
    const row=matrix[policyName][card.id]={},count={wins:0,losses:0,draws:0};
    for(const opponent of cards){
      let score=0;
      for(const seed of [17,941]){
        const s=duel([card.id],[opponent.id],seed,policy,policy);matches++;
        const key=s.winner==='player'?'wins':s.winner==='opponent'?'losses':'draws';
        count[key]++;stats[card.id][key]++;score+=key==='wins'?1:key==='draws'?.5:0;
        if(key==='wins'&&(card.element!==opponent.element||card.role!==opponent.role)&&!stats[card.id].winExample)stats[card.id].winExample={opponent:opponent.id,policy:policyName,seed};
        if(key==='losses'&&(card.element!==opponent.element||card.role!==opponent.role)&&!stats[card.id].lossExample)stats[card.id].lossExample={opponent:opponent.id,policy:policyName,seed};
        if(card.form==='YOUNG'&&opponent.form==='GUARDIAN'&&key==='wins')youngOverGuardian++;
        if(card.form==='GUARDIAN'&&opponent.form==='YOUNG'&&key==='wins')guardianOverYoung++;
      }
      row[opponent.id]=score/2;
    }
    stats[card.id].byPolicy[policyName]=count;
  }
  console.log(`Audited ${policyName}: ${matches} duels`);
}
const identical=new Map();
for(const c of cards){const signature=JSON.stringify([c.element,c.stats,c.cost,c.role,c.effects]);identical.set(signature,[...(identical.get(signature)??[]),c.id]);}
const equivalentGroups=[...identical.values()].filter(ids=>ids.length>1);
const observedDominance=[];
for(const a of cards)for(const b of cards){
  if(a.id===b.id)continue;let better=false,neverWorse=true;
  for(const policy of Object.keys(policies))for(const opponent of cards){const x=matrix[policy][a.id][opponent.id],y=matrix[policy][b.id][opponent.id];if(x<y)neverWorse=false;if(x>y)better=true;}
  if(neverWorse&&better)observedDominance.push({a:a.id,b:b.id});
}
// Equal three-card teams; identical lineups exchange sides and policy assignment.
const strategy={patientVsExisting:{wins:0,losses:0,draws:0},existingVsAttack:{wins:0,losses:0,draws:0}};
for(let seed=0;seed<60;seed++){
  const a=[0,7,19].map(n=>cards[(seed+n)%60].id),b=[29,41,53].map(n=>cards[(seed+n)%60].id);
  for(const [label,left,right] of [['patientVsExisting',patient,chooseAI],['existingVsAttack',chooseAI,attack]])for(const mirrored of [false,true]){
    const s=duel(mirrored?b:a,mirrored?a:b,1000+seed,mirrored?right:left,mirrored?left:right);
    const winSide=mirrored?'opponent':'player';strategy[label][s.winner==='DRAW'?'draws':s.winner===winSide?'wins':'losses']++;matches++;
  }
}
const contexts=[{hp:40,foeHp:40,energy:1,shield:0},{hp:80,foeHp:80,energy:1,shield:0},{hp:40,foeHp:120,energy:6,shield:0},{hp:80,foeHp:40,energy:0,shield:0},{hp:120,foeHp:160,energy:6,shield:60},{hp:20,foeHp:50,energy:2,shield:20}];
const contextReversals=[];let contextMatches=0;
for(const pair of observedDominance){
  let found=false;
  for(const context of contexts){if(found)break;for(const foe of cards){
    const a=duel([pair.a],[foe.id],177,patient,chooseAI,context),b=duel([pair.b],[foe.id],177,patient,chooseAI,context);contextMatches+=2;
    const score=s=>s.winner==='player'?1:s.winner==='DRAW'?.5:0;
    if(score(b)>score(a)){contextReversals.push({...pair,opponent:foe.id,context,aResult:a.winner,bResult:b.winner});found=true;break;}
  }}
}
matches+=contextMatches;
const rows=cards.map(card=>({id:card.id,name:card.name,form:card.form,element:ELEMENT_LABEL[card.element],role:card.role,stats:card.stats,cost:card.cost,skill:card.description,tactics:cardTactics(card.id),...stats[card.id]}));
for(const row of rows)assert.ok(row.tactics.strength&&row.tactics.weakness&&row.tactics.timing);
const summary={version:'turn-based-1.0.0',matches,duels:21600,teamMatches:240,contextMatches,contextReversals,seeds:[17,941],policies:Object.keys(policies),youngOverGuardian,guardianOverYoung,strategy,equivalentGroups,observedDominance,withoutObservedWin:rows.filter(r=>!r.wins).map(r=>r.id),withoutObservedLoss:rows.filter(r=>!r.losses).map(r=>r.id),limitations:'All 60x60 duels, two seeds, three public-state policies; paired three-card strategy comparisons and explicit midgame contexts. Observed dominance is limited to these policies and opponent states, not proof across all tactics. No human, ranked, or collection-risk fairness claim.'};
fs.mkdirSync('reports/beast-card-roles',{recursive:true});
fs.writeFileSync('reports/beast-card-roles/audit.json',JSON.stringify({summary,cards:rows},null,2)+'\n');
const esc=s=>String(s).replaceAll('|','／');
const table=rows.map(r=>`|${r.name} (${r.id})|${r.form}/${r.element}/${r.role}|${r.stats.hp}/${r.stats.attack}/${r.stats.defense}/${r.stats.speed}；氣${r.cost}|${r.tactics.strength}${r.tactics.timing}|${r.tactics.weakness}${r.tactics.counter}|${r.wins}/${r.losses}/${r.draws}|`).join('\n');
fs.writeFileSync('reports/beast-card-roles/role-review.md',`# 六十張神獸實際定位審查\n\n來源：interactive.ts、card-tactics.ts；可重跑 node scripts/beast-build.mjs 後 node scripts/audit-beast-card-roles.cjs。\n\n共${matches}局：21600場單挑（60×60×2種子×3策略，含對調方向），240場等數三卡策略對照，另${contextMatches}場明確中局情境比較。${contextReversals.length}/${observedDominance.length}項開場樣本優於關係找到中局反例；其餘未找到不等於證明全面支配。勝／負／平是本次單挑樣本，不是對真人勝率。\n\n幼子擊敗四象${youngOverGuardian}次，四象擊敗幼子${guardianOverYoung}次；沒有觀察到勝局的卡：${summary.withoutObservedWin.join('、')||'無'}；沒有觀察到敗局的卡：${summary.withoutObservedLoss.join('、')||'無'}。\n\n同元素／数值／技能／成本的機械等價組${equivalentGroups.length}組；不能聲稱60張各有獨有機制。觀察到跨三個策略的樣本優於關係${observedDominance.length}項，僅是這組樣本的疑點，不證明全面支配，見audit.json。\n\n策略對照：${JSON.stringify(strategy)}。不同策略效益不一定正向，不能以策略名稱保證更強。\n\n|卡片|身分／元素／職責|血／攻／防／速與成本|擅長與上場時機|弱點與應對|樣本勝／負／平|\n|---|---|---|---|---|---|\n${table}\n\n限制：未涵蓋所有三卡排列、所有人類策略、全部血量／氣量中局、等價卡的外觀偏好或長期收藏經濟。身份不是强弱保证，未任意改值。现行押五赢一输五不对称仍独立待决策。\n`);
console.log(JSON.stringify(summary,null,2));
