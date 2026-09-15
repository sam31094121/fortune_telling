/** Authoritative, replayable one-active-beast combat. No browser outcome calculation. */
import { getCard, playableCards } from './registry';
import { instantiate } from './battle';
import { effectiveStat, resolveEffects, type BeastInstance, type EffectSpec, type EffectLogEntry } from './effects';
import { createRng } from './turn';
import { elementGenerates, elementMultiplier, type BeastElement } from './elements';
import { MAX_ORBS, MAX_RAGE, resolveFusionTier, bossCounterOptions, type BossCounter, type FusionDifficulty, type FusionTier } from './fusion';
export const RAGE_ATTACK_BONUS = 38;
export interface RageTierInfo { tier: FusionTier; skillName: string; orbs: number; rage: number; bonus: number; breaksShield: boolean }
/** 暴怒合體依魔珠與暴怒升級。門檻與 fusion.ts 相同；加成經 test:beast-interactive:full 平衡閘門驗證。 */
export const RAGE_TIERS: readonly RageTierInfo[] = [
  { tier: 'NONE', skillName: '暴怒合體', orbs: 0, rage: 0, bonus: RAGE_ATTACK_BONUS, breaksShield: false },
  { tier: 'DUAL_UNSEAL', skillName: '雙珠解封', orbs: 2, rage: 50, bonus: 55, breaksShield: false },
  { tier: 'TRUE_FUSION', skillName: '迴天滅地', orbs: 3, rage: 70, bonus: 72, breaksShield: true },
  { tier: 'RAGE_ULTIMATE', skillName: '暴怒・天地終焉', orbs: 5, rage: 100, bonus: 96, breaksShield: true },
];
export function rageTierInfo(s: Match, side: Side): RageTierInfo {
  const tier = resolveFusionTier(s[side].orbs ?? 0, s[side].rage ?? 0);
  return RAGE_TIERS.find((info) => info.tier === tier) ?? RAGE_TIERS[0];
}
/** Only a living deployed reserve can lend energy; collections are never consulted. */
export function rageMaterialFor(s:Match, side:Side) {
  const t=s[side], active=t.team[t.active];
  return t.team.find((f,index)=>index!==t.active&&!f.defeated&&f.hp>0&&elementGenerates(f.element as BeastElement,active.element as BeastElement))??null;
}
export function rageUnavailableReason(s:Match, side:Side):string|null {
  if(s.status!=='PLAYING')return '戰鬥已結束';
  const t=s[side], f=t.team[t.active];
  if(f.defeated)return '請先換上後備';
  if(f.stunnedTurns>0)return '受控中';
  if(t.rageAvailable!==1)return t.rageAvailable===0?'本場已使用':'下場開放合體';
  return rageMaterialFor(s,side)?null:'需要相生後備';
}

export const INTERACTIVE_VERSION = 'turn-based-1.3.0';
/** 一隊最多幾隻＝戰場的主戰一格＋後備五格。 */
export const MAX_TEAM = 6;
export type Role = '主攻' | '守護' | '控制' | '輔助' | '反擊' | '速度';
const adult: Role[] = ['主攻','反擊','守護','輔助','控制','主攻','速度','控制','守護','控制','速度','輔助','反擊','守護','主攻','反擊','輔助','輔助','控制','控制','反擊','守護','輔助','速度','主攻','輔助','控制','守護'];
const young: Role[] = ['速度','守護','守護','輔助','控制','主攻','速度','輔助','守護','控制','速度','速度','守護','守護','主攻','反擊','輔助','輔助','控制','速度','主攻','守護','輔助','速度','速度','輔助','控制','守護'];
export function profile(id: string) {
  const card = getCard(id);
  if (!card) throw new Error('神獸不存在。');
  const guardian: Record<string, Role> = { beast_g_qinglong: '輔助', beast_g_baihu: '主攻', beast_g_zhuque: '主攻', beast_g_xuanwu: '守護' };
  const role = guardian[id] ?? (card.form === 'YOUNG' ? young : adult)[Number(id.slice(-2)) - 1];
  const cost = card.form === 'YOUNG' ? 1 : card.form === 'ADULT' ? 2 : 4;
  const bonus = cost * 7;
  const effects: Record<Role, EffectSpec[]> = {
    主攻: [{type:'DAMAGE',value:bonus + 10,target:'ENEMY'}],
    守護: [{type:'SHIELD',value:bonus + 30,target:'SELF'}],
    控制: [{type:'DAMAGE',value:0,target:'ENEMY'},{type:'DEBUFF_ATTACK',value:bonus + 5,duration:2,target:'ENEMY'}],
    輔助: [{type:'HEAL',value:bonus + 37,target:'SELF'}],
    反擊: [{type:'SHIELD',value:bonus + 10,target:'SELF'}],
    速度: [{type:'DAMAGE',value:bonus,target:'ENEMY'},{type:'BUFF_SPEED',value:20,duration:2,target:'SELF'}],
  };
  const label: Record<Role,string> = {主攻:'破陣',守護:'護體',控制:'制勢',輔助:'回元',反擊:'迎擊',速度:'疾行'};
  const desc: Record<Role,string> = {
    主攻:`以攻擊力加 ${bonus+10} 計算傷害。`, 守護:`獲得 ${bonus+30} 護盾（總上限 70）。`,
    控制:`攻擊並降低對手 ${bonus+5} 攻擊力，持續 2 次行動。`, 輔助:`恢復自身 ${bonus+37} 生命，不超過上限。`,
    反擊:`獲得 ${bonus+10} 護盾，下一次受擊反擊 24 點傷害。`, 速度:`以攻擊力加 ${bonus} 計算傷害，自身速度 +20，持續 2 次行動。`,
  };
  return {role, tier:card.form === 'YOUNG' ? 'I' : card.form === 'ADULT' ? 'II' : 'III', cost,
    skillName:`${card.name.split('・')[0]}・${label[role]}`, description:desc[role], effects:effects[role],
    passive:role === '守護' ? '厚甲：基礎防禦較高。' : role === '速度' ? '輕身：基礎速度較高。' : '均衡：不額外觸發隱藏技能。',
    evolution:card.form === 'YOUNG' ? id.replace('beast_y','beast_a') : null};
}
export type Side = 'player' | 'opponent';
export type Action = {type:'ATTACK'} | {type:'SKILL'} | {type:'RAGE'} | {type:'SWITCH'; index:number};
export interface Fighter extends BeastInstance { cooldown:number; counter:boolean }
export interface CombatChange {
  side: Side; cardId: string;
  hpBefore: number; hpAfter: number; shieldBefore: number; shieldAfter: number;
}
/**
 * 易經的出手層次（2026-09-15 三級）。只改判斷，不改任何數值；玩家的自動連擊固定用簡單（業主定調）。
 * 缺值（舊存檔）＝簡單，行為與 1.2.0 完全相同。
 */
export type Difficulty = FusionDifficulty;
/** 困難首領反制（強力版，業主定調）：只有易經有；一律提前一回合在戰報預告，各招整場一次。 */
export interface BossState { armed:BossCounter|null; used:BossCounter[]; desperationRounds:number }
export const DESPERATION_BONUS = 24;
export const DESPERATION_ROUNDS = 2;
/** orbs／rage 缺值（舊存檔）一律視為 0。 */
export interface MatchSide { team:Fighter[]; active:number; energy:number; rageAvailable?:number; orbs?:number; rage?:number; boss?:BossState }
export interface Match {
  version:string; seed:number; round:number; revision:number; status:'PLAYING'|'FINISHED'; winner:Side|'DRAW'|null;
  difficulty?:Difficulty;
  player:MatchSide; opponent:MatchSide;
  log:Array<{side:Side;cardId:string;text:string;changes?:CombatChange[];action?:Action['type']|'REPLACEMENT'|'SKIP';fusionTier?:FusionTier;orbGained?:boolean;bossCounter?:BossCounter}>;
  history:Array<{revision:number;player:Action;opponent:Action}>;
}
function fighter(id:string):Fighter {
  const card=getCard(id); if(!card) throw new Error('神獸不存在。');
  const p=profile(id); const form=card.form === 'YOUNG' ? -2 : card.form === 'GUARDIAN' ? 2 : 0;
  const stats={hp:160+form*2,attack:43+(p.role==='主攻'?3:0),defense:p.role==='守護'?36:30,speed:p.role==='速度'?76:56-form};
  return {...instantiate({...card,stats},id),cooldown:0,counter:false};
}
export function newMatch(ids:string[],foes:string[],seed:number,options:{difficulty?:Difficulty}={}):Match {
  /*
    隊伍大小放寬到 1–6。

    原本寫死三張。戰場 V1 是主戰一格＋後備五格，上場的可能是一到六隻，
    寫死三張就接不上——而 advance()、legalActions()、chooseAI() 對隊伍大小
    本來就是泛型的（team.every / team[active] / team.flatMap），
    只有這一行的守衛在擋。所以是放寬守衛，不是改戰鬥邏輯。

    上限六隻＝主戰一＋後備五，與戰場格數一致；再多就是畫面放不下。
  */
  for(const team of [ids,foes]) if(team.length<1||team.length>MAX_TEAM||new Set(team).size!==team.length||team.some(id=>!getCard(id))) throw new Error(`請選 1–${MAX_TEAM} 張不重複的神獸。`);
  const match:Match={version:INTERACTIVE_VERSION,seed,round:1,revision:0,status:'PLAYING',winner:null,
    player:{team:ids.map(fighter),active:0,energy:2,rageAvailable:1,orbs:0,rage:0},opponent:{team:foes.map(fighter),active:0,energy:2,rageAvailable:1,orbs:0,rage:0},log:[],history:[]};
  const difficulty=options.difficulty??'EASY';
  if(difficulty!=='EASY')match.difficulty=difficulty;
  if(difficulty==='HARD')match.opponent.boss={armed:null,used:[],desperationRounds:0};
  return match;
}
export function legalActions(s:Match,side:Side):Action[] {
  if(s.status!=='PLAYING')return [];
  const t=s[side], f=t.team[t.active];
  const swaps=t.team.flatMap((b,index):Action[]=>!b.defeated&&index!==t.active?[{type:'SWITCH',index}]:[]);
  if(f.defeated)return swaps;
  return [{type:'ATTACK'},...(f.cooldown===0&&t.energy>=profile(f.cardId).cost?[{type:'SKILL'} as Action]:[]),...(rageUnavailableReason(s,side)===null?[{type:'RAGE'} as Action]:[]),...swaps];
}
/** 簡單：原本的固定規則（1.2.0 起不變）。allowRage=false 時只是不放合體，其餘判斷相同。 */
function basicChoice(s:Match,side:Side,allowRage=true):Action {
  const foe:Side=side==='player'?'opponent':'player';
  const actions=legalActions(s,side);
  const t=s[side], f=t.team[t.active];

  // Forced replacement: pick the healthiest reserve, not just the first slot.
  if(f.defeated){
    const swaps=actions.filter((a):a is Extract<Action,{type:'SWITCH'}>=>(a.type==='SWITCH'));
    return swaps.reduce<Action>((best,a)=>
      t.team[a.index].hp>(best.type==='SWITCH'?t.team[best.index].hp:0)?a:best,
      swaps[0]??actions[0]);
  }

  const p=profile(f.cardId);
  const canSkill=actions.some(a=>a.type==='SKILL');
  const enemy=s[foe].team[s[foe].active];
  if(allowRage&&actions.some(a=>a.type==='RAGE')&&(f.hp<f.maxHp*.55||enemy.hp<enemy.maxHp*.55))return {type:'RAGE'};

  // Role-specific skill timing — each role has a reason, not a blanket "always skill".
  if(canSkill){
    // Attacker and speed roles deal damage; skill is always the right tool.
    if(p.role==='主攻'||p.role==='速度')return {type:'SKILL'};
    // Control: debuff the enemy — every opportunity counts.
    if(p.role==='控制')return {type:'SKILL'};
    // Guardian: shield only when meaningful headroom remains.
    if(p.role==='守護'&&f.shield===0)return {type:'SKILL'};
    // Support: heal once below 60 % to make the recovery meaningful.
    if(p.role==='輔助'&&f.hp<f.maxHp*0.6)return {type:'SKILL'};
    // Counter: set shield before taking a hit, not when already shielded.
    if(p.role==='反擊'&&f.shield===0&&enemy.hp>30)return {type:'SKILL'};
  }

  return {type:'ATTACK'};
}
/**
 * 易經出手（2026-09-15 三級）。
 * 簡單：固定規則。中等：合體忍到雙珠以上、被相剋時換上不吃虧的後備。困難：再往後推演一步。
 * 三級都只看檯面上的公開狀態：不讀對方本回合要出什麼、不改數值、不看種子決定的先後手。
 * 玩家那一側預設永遠是簡單——自動連擊不跟著變聰明（業主定調）。
 */
export function chooseAI(s:Match,side:Side,level:Difficulty=side==='opponent'?(s.difficulty??'EASY'):'EASY'):Action {
  if(level==='EASY')return basicChoice(s,side);
  if(level==='NORMAL')return tacticalChoice(s,side);
  return lookaheadChoice(s,side);
}
const otherSide=(side:Side):Side=>side==='player'?'opponent':'player';
const matchup=(a:Fighter,b:Fighter)=>elementMultiplier(a.element as BeastElement,b.element as BeastElement)-elementMultiplier(b.element as BeastElement,a.element as BeastElement);
function tacticalChoice(s:Match,side:Side):Action {
  const t=s[side], f=t.team[t.active], e=s[otherSide(side)], enemy=e.team[e.active];
  const actions=legalActions(s,side);
  const swaps=actions.filter((a):a is Extract<Action,{type:'SWITCH'}>=>a.type==='SWITCH');
  if(f.defeated){
    const score=(i:number)=>t.team[i].hp/t.team[i].maxHp+matchup(t.team[i],enemy)*2;
    return swaps.reduce<Action>((best,a)=>best.type!=='SWITCH'||score(a.index)>score(best.index)?a:best,swaps[0]??actions[0]);
  }
  // 合體忍到雙珠以上；快倒下才提早放。
  if(actions.some(a=>a.type==='RAGE')&&(rageTierInfo(s,side).tier!=='NONE'||f.hp<f.maxHp*.3))return {type:'RAGE'};
  // 被相剋就換上不吃虧、還健康的後備；換卡要花一回合，所以四次動作內不重複換。
  if(matchup(enemy,f)>0&&f.hp>f.maxHp*.25){
    const safe=swaps.filter(a=>{const r=t.team[a.index];return r.hp>r.maxHp*.6&&matchup(enemy,r)<=0;});
    const lastSwitch=[...(s.history??[])].reverse().find(h=>h[side]?.type==='SWITCH');
    if(safe.length&&(!lastSwitch||s.revision-lastSwitch.revision>=4))return safe[0];
  }
  return basicChoice(s,side,false);
}
/** 速度相同時先後手由種子決定；推演時兩種先後各算一次取平均，不偷看這一場的種子。 */
function neutralSeeds(revision:number):number[] {
  let playerFirst=-1, opponentFirst=-1;
  for(let k=1;k<256&&(playerFirst<0||opponentFirst<0);k++){const r=createRng(k+revision*9973)();if(r<.5&&playerFirst<0)playerFirst=k;if(r>=.5&&opponentFirst<0)opponentFirst=k;}
  return [playerFirst,opponentFirst].filter(k=>k>0);
}
function rageValue(m:Match,side:Side):number {
  const t=m[side];
  if(t.rageAvailable!==1||!rageMaterialFor(m,side))return 0;
  return rageTierInfo(m,side).bonus+(t.orbs??0)*4+(t.rage??0)*.2;
}
/** 局面分數：只用公開的生命、護盾、能量、魔珠與暴怒。 */
function evaluate(m:Match,side:Side):number {
  const foe=otherSide(side);
  if(m.status==='FINISHED')return m.winner===side?1e5:m.winner==='DRAW'?0:-1e5;
  const team=(x:Side)=>m[x].team.reduce((sum,f)=>sum+(f.defeated?0:45+100*f.hp/f.maxHp+f.shield*.4),0);
  return team(side)-team(foe)+.6*(rageValue(m,side)-rageValue(m,foe))+2*(m[side].energy-m[foe].energy);
}
const sameAction=(a:Action,b:Action)=>a.type===b.type&&(a.type!=='SWITCH'||(b.type==='SWITCH'&&a.index===b.index));
/**
 * 推演候選：主動換卡只留中等規則認可的那一個。
 * 實測（300 局）：推演時放任換卡，易經每場亂換 3.5 次、白送回合，勝率反而掉到 38%。
 */
function lookaheadCandidates(s:Match,side:Side):{actions:Action[];preferred:Action} {
  const preferred=tacticalChoice(s,side);
  const actions=legalActions(s,side);
  if(s[side].team[s[side].active].defeated)return {actions,preferred};
  return {actions:actions.filter(a=>a.type!=='SWITCH'||sameAction(a,preferred)),preferred};
}
const lightCopy=(s:Match):Match=>({...s,log:[],history:[]});
/** 推一步：對方以基礎規則回應，兩種先後手取平均。 */
function stepScore(s:Match,side:Side,action:Action):number {
  const light=lightCopy(s);
  const reply=basicChoice(light,otherSide(side));
  const seeds=neutralSeeds(s.revision);
  let total=0;
  for(const seed of seeds){const probe:Match={...light,seed};total+=evaluate(side==='player'?advance(probe,action,reply):advance(probe,reply,action),side);}
  return total/seeds.length;
}
/**
 * 困難：往後推演兩步——我出手、對方以基礎規則回應，再選我下一步最好的那一招。
 * 假想對方用基礎規則是公開規則的推測，不是讀取對方實際的選擇。
 * 實測（1200 局，對基礎自動連擊，含首領反制）：易經勝率約七成；每次決定數毫秒。
 */
function lookaheadChoice(s:Match,side:Side):Action {
  const {actions,preferred}=lookaheadCandidates(s,side);
  if(actions.length<=1)return actions[0]??{type:'ATTACK'};
  const light=lightCopy(s);
  const reply=basicChoice(light,otherSide(side));
  const seeds=neutralSeeds(s.revision);
  let best=preferred, bestScore=-Infinity;
  for(const action of [preferred,...actions.filter(a=>!sameAction(a,preferred))]){
    let total=0;
    for(const seed of seeds){
      const probe:Match={...light,seed};
      const mid=side==='player'?advance(probe,action,reply):advance(probe,reply,action);
      if(mid.status!=='PLAYING'){total+=evaluate(mid,side);continue;}
      const next=lookaheadCandidates(lightCopy(mid),side).actions;
      total+=next.length?Math.max(...next.map(a=>stepScore(mid,side,a))):evaluate(mid,side);
    }
    const score=total/seeds.length;
    if(score>bestScore){bestScore=score;best=action;}
  }
  return best;
}
/** 首領反制的回合結算：先執行上回合預告的寶珠封印，再依公開狀態預告下一招。 */
function bossRoundEnd(s:Match){
  const boss=s.opponent.boss!, player=s.player, opp=s.opponent;
  const cardId=opp.team[opp.active].cardId;
  if(boss.armed==='ORB_SEAL'&&player.rageAvailable===1&&(player.orbs??0)>0){
    player.orbs=0;
    s.log.push({side:'opponent',cardId,bossCounter:'ORB_SEAL',text:'易經・寶珠封印：你的魔珠全部被封印。'});
  }
  boss.armed=null;
  if(boss.desperationRounds>0)boss.desperationRounds--;
  if(s.status!=='PLAYING')return;
  const unused=(c:BossCounter)=>!boss.used.includes(c);
  const own=bossCounterOptions('HARD',opp.orbs??0,opp.rage??0,'IDLE').map(o=>o.counter);
  if(own.includes('DESPERATION_MODE')&&unused('DESPERATION_MODE')){
    boss.used.push('DESPERATION_MODE');boss.desperationRounds=DESPERATION_ROUNDS;
    s.log.push({side:'opponent',cardId,bossCounter:'DESPERATION_MODE',text:`易經進入背水模式：接下來 ${DESPERATION_ROUNDS} 回合攻擊加 ${DESPERATION_BONUS}。`});
    return;
  }
  if(player.rageAvailable!==1||!rageMaterialFor(s,'player'))return;
  const threat=bossCounterOptions('HARD',player.orbs??0,player.rage??0,'FUSION_ACTIVE').map(o=>o.counter);
  const pick=(['FUSION_BREAK','ORB_SEAL'] as BossCounter[]).find(c=>threat.includes(c)&&unused(c));
  if(!pick)return;
  boss.used.push(pick);boss.armed=pick;
  s.log.push({side:'opponent',cardId,bossCounter:pick,text:pick==='FUSION_BREAK'?'易經預告・合體破壞：下回合你若暴怒合體，會被直接擊碎。':'易經預告・寶珠封印：這回合結束前沒用掉魔珠，會全部被封印。'});
}
/**
 * 戰鬥畫面上客戶要看到的首領提示（2026-09-15）。
 * 預告只寫在收起來的戰報裡，客戶看不到就不算預告——所以正在預告的招要在操作區顯眼處照印，並附對策。
 * 正在預告的招優先；沒有預告時顯示這一步剛生效的反制。畫面照印這裡的字，不自己編。
 */
export function bossNotice(m:Match):string|null {
  const boss=m.opponent.boss;
  if(!boss)return null;
  if(m.status==='PLAYING'){
    if(boss.armed==='ORB_SEAL')return '易經預告・寶珠封印：這回合沒用掉魔珠，就會全部被封印。想搶先暴怒合體，按「暫停」自己出招。';
    if(boss.armed==='FUSION_BREAK')return '易經預告・合體破壞：這回合暴怒合體會被擊碎。按「暫停」可以先忍住。';
    if(boss.desperationRounds>0)return `易經背水模式：還有 ${boss.desperationRounds} 回合，攻擊加 ${DESPERATION_BONUS}。`;
  }
  const effect=m.log.find(e=>e.bossCounter&&!/預告|進入/.test(e.text));
  return effect?.text??null;
}
export function advance(previous:Match,playerAction:Action,opponentAction:Action=chooseAI(previous,'opponent')):Match {
  if(previous.status!=='PLAYING')throw new Error('這場戰鬥已結束。');
  for(const [side,action] of [['player',playerAction],['opponent',opponentAction]] as const) {
    if(!legalActions(previous,side).some(a=>a.type===action?.type&&(a.type!=='SWITCH'||(action.type==='SWITCH'&&a.index===action.index))))throw new Error('目前不能使用這個動作。');
  }
  const s:Match=structuredClone(previous); s.log=[];
  s.history=[...(s.history??[]),{revision:s.revision,player:playerAction,opponent:opponentAction}];
  const rng=createRng(s.seed+s.revision*9973);
  const actions={player:playerAction,opponent:opponentAction};
  // Forced replacement is a separate choice; no free attack or energy from either side.
  if(s.player.team[s.player.active].defeated||s.opponent.team[s.opponent.active].defeated) {
    for(const side of ['player','opponent'] as Side[]) if(s[side].team[s[side].active].defeated){const a=actions[side];if(a.type==='SWITCH'){s[side].active=a.index;s.log.push({side,cardId:s[side].team[a.index].cardId,action:'REPLACEMENT',text:`後備接替：${s[side].team[a.index].name}`});}}
    s.revision++; return s;
  }
  const speed=(side:Side)=>actions[side].type==='SWITCH'?10000:effectiveStat(s[side].team[s[side].active],'speed');
  const first:Side=speed('player')===speed('opponent')?(rng()<.5?'player':'opponent'):speed('player')>speed('opponent')?'player':'opponent';
  for(const side of [first,first==='player'?'opponent':'player'] as Side[]) {
    const foe:Side=side==='player'?'opponent':'player', t=s[side],e=s[foe], f=t.team[t.active], enemy=e.team[e.active], action=actions[side];
    if(f.defeated)continue;
    const existingModifiers=[...f.modifiers];
    const consumeStatus=()=>{for(const m of existingModifiers)m.remainingTurns--;f.modifiers=f.modifiers.filter(m=>m.remainingTurns>0);};
    if(action.type==='SWITCH'){consumeStatus();t.active=action.index;s.log.push({side,cardId:t.team[t.active].cardId,action:'SWITCH',text:`切換為${t.team[t.active].name}`});continue;}
    if(enemy.defeated)continue;
    const p=profile(f.cardId);const logs:EffectLogEntry[]=[];
    if(f.stunnedTurns>0){f.stunnedTurns--;consumeStatus();s.log.push({side,cardId:f.cardId,action:'SKIP',text:'受到控制，本次不能行動。'});continue;}
    const boss=s.opponent.boss;
    // 合體破壞：上回合已在戰報預告；這回合玩家仍選擇合體，就被擊碎（本場合體用掉、不造成傷害）。
    if(side==='player'&&action.type==='RAGE'&&boss?.armed==='FUSION_BREAK'){
      t.rageAvailable=0;t.orbs=0;t.rage=0;boss.armed=null;consumeStatus();
      s.log.push({side:'opponent',cardId:enemy.cardId,bossCounter:'FUSION_BREAK',text:'易經・合體破壞：你的暴怒合體被擊碎，本場不能再合體。'});
      continue;
    }
    const material=action.type==='RAGE'?rageMaterialFor(s,side):null;
    if(action.type==='RAGE'&&!material)throw new Error('暴怒合體缺少存活的相生後備。');
    const rageTier=action.type==='RAGE'?rageTierInfo(s,side):null;
    // 背水模式：易經造成傷害的效果加成；其他數值一律不動。
    const desperate=side==='opponent'&&(boss?.desperationRounds??0)>0?DESPERATION_BONUS:0;
    const effects=(action.type==='SKILL'?p.effects:[{type:'DAMAGE',value:rageTier?rageTier.bonus:0,target:'ENEMY'} as EffectSpec]).map(e=>desperate&&e.type==='DAMAGE'?{...e,value:(e.value??0)+desperate}:e);
    if(rageTier){t.rageAvailable=0;t.orbs=0;t.rage=0;}
    if(action.type==='SKILL'){t.energy-=p.cost;f.cooldown=3;if(p.role==='反擊')f.counter=true;}
    const before=enemy.hp+enemy.shield;
    const snapshots = [{ side, fighter: f }, { side: foe, fighter: enemy }].map(({ side, fighter }) => ({
      side, fighter, hpBefore: fighter.hp, shieldBefore: fighter.shield,
    }));
    if(rageTier?.breaksShield&&enemy.shield>0){logs.push({type:'DAMAGE',sourceName:f.name,targetName:enemy.name,applied:0,detail:`破封斬：擊碎護盾 ${enemy.shield}`});enemy.shield=0;}
    for(const effect of effects)resolveEffects([effect],{source:f,target:effect.target==='SELF'?f:enemy,baseAttack:effectiveStat(f,'attack'),side:{draw:()=>0,discard:()=>0},log:logs});
    f.shield=Math.min(70,f.shield);
    if(enemy.counter&&enemy.hp+enemy.shield<before&&!enemy.defeated){enemy.counter=false;f.hp=Math.max(0,f.hp-24);f.defeated=f.hp===0;logs.push({type:'DAMAGE',sourceName:enemy.name,targetName:f.name,applied:24,detail:'迎擊反擊 24 點'});}
    s.log.push({side,cardId:f.cardId,action:action.type,...(rageTier?{fusionTier:rageTier.tier}:{}),text:`${f.name}・${action.type==='SKILL'?p.skillName:rageTier?`暴怒合體${rageTier.tier==='NONE'?'':`・${rageTier.skillName}`}・${material?.name}`:'普通攻擊'}：${logs.map(l=>l.detail).join('；')}`,
      changes: snapshots.map(({ side, fighter, hpBefore, shieldBefore }) => ({ side, cardId: fighter.cardId,
        hpBefore, hpAfter: fighter.hp, shieldBefore, shieldAfter: fighter.shield })),
    });
    // 有相生後備時出招打中對手才解封魔珠；受到的傷害（含護盾）一半化為暴怒。用過合體就不再累積。
    if(!rageTier&&before>enemy.hp+enemy.shield&&t.rageAvailable===1&&rageMaterialFor(s,side)){t.orbs=Math.min(MAX_ORBS,(t.orbs??0)+1);s.log[s.log.length-1].orbGained=true;}
    for(const snap of snapshots){const lost=snap.hpBefore+snap.shieldBefore-(snap.fighter.hp+snap.fighter.shield);const hurt=s[snap.side];if(lost>0&&hurt.rageAvailable===1)hurt.rage=Math.min(MAX_RAGE,(hurt.rage??0)+Math.ceil(lost/2));}
    consumeStatus();
  }
  // End of a complete round, both parties use identical resource rules.
  for(const side of ['player','opponent'] as Side[]){
    s[side].energy=Math.min(6,s[side].energy+1);
    for(const f of s[side].team)f.cooldown=Math.max(0,f.cooldown-1);
  }
  const dead=(side:Side)=>s[side].team.every(f=>f.defeated);
  if(dead('player')||dead('opponent')){s.status='FINISHED';s.winner=dead('player')&&dead('opponent')?'DRAW':dead('opponent')?'player':'opponent';}
  else if(s.round>=80){s.status='FINISHED';s.winner='DRAW';s.log.push({side:'player',cardId:s.player.team[s.player.active].cardId,text:'達到 80 回合上限，本場平手。'});}
  if(s.opponent.boss)bossRoundEnd(s);
  s.round++;s.revision++;return s;
}
export function interactiveCatalog(){return playableCards().map(c=>({id:c.id,name:c.name,element:c.element,rarity:c.rarity,form:c.form,front:c.art.front,thumbnail:c.art.thumbnail,story:c.story,...profile(c.id),stats:((f)=>({hp:f.maxHp,attack:f.attack,defense:f.defense,speed:f.speed}))(fighter(c.id))}));}
