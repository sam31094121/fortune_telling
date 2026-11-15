const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const X=require('../lib/beast-game/exact-combat.ts');
const I=require('../lib/beast-game/interactive.ts');
const C=require('../lib/beast-game/card-campaign.ts');
const R=require('../lib/beast-game/registry.ts');
const D=require('../lib/beast-game/match3/damage.ts');
const A=require('../lib/beast-game/match3/card-attack.ts');
const E=require('../lib/beast-game/match3/enemies.ts');
const T=require('../lib/beast-game/match3/treasures.ts');
const O=require('../lib/beast-game/match3/resolve-turn.ts');
const B=require('../lib/beast-game/match3/board.ts');
const G=require('../lib/beast-game/match3/drag.ts');
const reward=require('../lib/beast-game/battle-reward-server.ts');
const huge='9'.repeat(400),ids=['beast_a01','beast_a02','beast_a03','beast_a04','beast_a05'];
const entries=ids.map((cardId,i)=>({id:'copy'+i,cardId})),bonuses=Object.fromEntries(entries.map(e=>[e.id,huge]));
const campaign={v:1,kind:'card-campaign',id:'test',seed:5,wins:0,pending:null,enhancements:[]};
const initial=()=>C.applyCardCampaignStats(I.newMatch(ids,['beast_y01','beast_y02','beast_y03','beast_y04','beast_y05'],5),campaign,entries,bonuses);
const finite=value=>{if(typeof value==='number')assert(Number.isFinite(value),'all response numbers finite');else if(value&&typeof value==='object')Object.values(value).forEach(finite);};
assert.equal(X.exactFormula('5',[.5]),'3');assert.equal(X.exactFormula('5',[.5],3),'0');
assert.equal(X.exactFormula('9007199254740993',[1]),'9007199254740993');
assert.equal(X.exactFormula(huge,[1.2,.5]),((BigInt(huge)*6n+5n)/10n).toString());
assert.equal(X.exactDamage(huge,[1.2],10,1,83).damage,83);
let m=initial();assert.equal(m.player.team[0].attackExact,(BigInt(I.newMatch(ids,ids,5).player.team[0].attack)+BigInt(huge)).toString());
for(const type of ['ATTACK','SKILL','RAGE']){
 let s=initial();s.player.energy=6;s.player.rageAvailable=1;
 // A valid generating reserve for the attacker's original element.
 if(type==='RAGE') {const el=s.player.team[0].element;const {elementGenerates}=require('../lib/beast-game/elements.ts');const c=R.playableCards().find(c=>elementGenerates(c.element,el)&&!ids.includes(c.id));s.player.team[4]=I.newMatch([c.id],[c.id],5).player.team[0];}
 const next=I.advance(s,{type},{type:'ATTACK'});finite(next);assert(next.opponent.team[0].hp< s.opponent.team[0].hp,type+' causes real damage');
}
for(let n=0;m.status!=='FINISHED'&&n<100;n++)m=I.advance(m,I.legalActions(m,'player').find(a=>a.type==='ATTACK')??I.legalActions(m,'player')[0],I.legalActions(m,'opponent').find(a=>a.type==='ATTACK')??I.legalActions(m,'opponent')[0]);
assert.equal(m.status,'FINISHED');assert.notEqual(reward.replayHighestFusionTier(m,{campaign,selectedEntries:entries,sharedBonuses:bonuses}),null);finite(m);assert(!JSON.stringify(m).includes('Infinity'));
const unit=id=>{const c=R.getCard(id);return {id,name:c.name,thumbnail:'',element:c.element,attack:Number.MAX_SAFE_INTEGER,attackExact:huge,hp:10000,maxHp:10000,energy:100};};
const team=ids.map(unit),foes=['beast_y01','beast_y02','beast_y03','beast_y04','beast_y05'].map(id=>({...unit(id),attack:8,attackExact:undefined,hp:500,maxHp:500,cd:3}));
for(const kind of ['energy','link']) {const r=A.resolveCardAttackTurn({team,foes,target:0,wins:0,mode:'hard45',action:kind,actionId:kind,eventId:kind,attackerId:team[0].id,linkIds:team.slice(0,2).map(c=>c.id)});assert.equal(r.foes[0].hp,0);assert.equal(r.actualDamage,500);finite(r);}
assert.equal(E.linkDamage([Number.MAX_SAFE_INTEGER,1],[huge,undefined]),Number.MAX_SAFE_INTEGER);
const book=T.emptyTreasureBook();book.counts[team[0].element]=1;
const r=T.resolveTreasureUse({team,foes,target:0,wins:0,mode:'hard45',actionId:'treasure',treasures:book},team[0].element);assert.equal(r.effect.damage,500);finite(r);
const board=G.generateDragBoard(B.seededRng(7),8,7,true),chain=[0,1,2,3].map(c=>({r:7,c}));chain.forEach(p=>board[p.r][p.c]=team[0].element);
const turn=O.resolveOrbTurn({team,foes,target:0,wins:0,mode:'hard45',actionId:'orbs',board,magic:G.emptyMagic(board),path:chain,seed:7,move:0,chosen:{},rule:'all-attack',attackBoost:1,treasures:T.emptyTreasureBook()});assert.equal(turn.counter.foes[0].hp,0);assert(turn.damage+turn.startDamage+turn.endDamage<=500);finite(turn);
for(let attack=1;attack<=150;attack++)assert.equal(D.hitAmount(attack,4,2,'FIRE','WATER'),D.hitAmount(attack,4,2,'FIRE','WATER',String(attack)));
console.log('PASS exact combat: 400-digit cultivation in ATTACK/SKILL/RAGE/replay, orb/energy/link/treasure, exact boundary and rational factors, finite JSON, actual HP loss, ordinary values unchanged.');
