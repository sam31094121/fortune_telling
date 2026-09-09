/** Authoritative, replayable one-active-beast combat. No browser outcome calculation. */
import { getCard, playableCards } from './registry';
import { instantiate } from './battle';
import { effectiveStat, resolveEffects, type BeastInstance, type EffectSpec, type EffectLogEntry } from './effects';
import { createRng } from './turn';

export const INTERACTIVE_VERSION = 'turn-based-1.0.0';
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
export type Action = {type:'ATTACK'} | {type:'SKILL'} | {type:'SWITCH'; index:number};
export interface Fighter extends BeastInstance { cooldown:number; counter:boolean }
export interface CombatChange {
  side: Side; cardId: string;
  hpBefore: number; hpAfter: number; shieldBefore: number; shieldAfter: number;
}
export interface Match {
  version:string; seed:number; round:number; revision:number; status:'PLAYING'|'FINISHED'; winner:Side|'DRAW'|null;
  player:{team:Fighter[];active:number;energy:number}; opponent:{team:Fighter[];active:number;energy:number};
  log:Array<{side:Side;cardId:string;text:string;changes?:CombatChange[];action?:Action['type']|'REPLACEMENT'|'SKIP'}>;
  history:Array<{revision:number;player:Action;opponent:Action}>;
}
function fighter(id:string):Fighter {
  const card=getCard(id); if(!card) throw new Error('神獸不存在。');
  const p=profile(id); const form=card.form === 'YOUNG' ? -2 : card.form === 'GUARDIAN' ? 2 : 0;
  const stats={hp:160+form*2,attack:43+(p.role==='主攻'?3:0),defense:p.role==='守護'?36:30,speed:p.role==='速度'?76:56-form};
  return {...instantiate({...card,stats},id),cooldown:0,counter:false};
}
export function newMatch(ids:string[],foes:string[],seed:number):Match {
  /*
    隊伍大小放寬到 1–6。

    原本寫死三張。戰場 V1 是主戰一格＋後備五格，上場的可能是一到六隻，
    寫死三張就接不上——而 advance()、legalActions()、chooseAI() 對隊伍大小
    本來就是泛型的（team.every / team[active] / team.flatMap），
    只有這一行的守衛在擋。所以是放寬守衛，不是改戰鬥邏輯。

    上限六隻＝主戰一＋後備五，與戰場格數一致；再多就是畫面放不下。
  */
  for(const team of [ids,foes]) if(team.length<1||team.length>MAX_TEAM||new Set(team).size!==team.length||team.some(id=>!getCard(id))) throw new Error(`請選 1–${MAX_TEAM} 張不重複的神獸。`);
  return {version:INTERACTIVE_VERSION,seed,round:1,revision:0,status:'PLAYING',winner:null,
    player:{team:ids.map(fighter),active:0,energy:2},opponent:{team:foes.map(fighter),active:0,energy:2},log:[],history:[]};
}
export function legalActions(s:Match,side:Side):Action[] {
  if(s.status!=='PLAYING')return [];
  const t=s[side], f=t.team[t.active];
  const swaps=t.team.flatMap((b,index):Action[]=>!b.defeated&&index!==t.active?[{type:'SWITCH',index}]:[]);
  if(f.defeated)return swaps;
  return [{type:'ATTACK'},...(f.cooldown===0&&t.energy>=profile(f.cardId).cost?[{type:'SKILL'} as Action]:[]),...swaps];
}
export function chooseAI(s:Match,side:Side):Action {
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
    const effects=action.type==='SKILL'?p.effects:[{type:'DAMAGE',value:0,target:'ENEMY'} as EffectSpec];
    if(action.type==='SKILL'){t.energy-=p.cost;f.cooldown=3;if(p.role==='反擊')f.counter=true;}
    const before=enemy.hp+enemy.shield;
    const snapshots = [{ side, fighter: f }, { side: foe, fighter: enemy }].map(({ side, fighter }) => ({
      side, fighter, hpBefore: fighter.hp, shieldBefore: fighter.shield,
    }));
    for(const effect of effects)resolveEffects([effect],{source:f,target:effect.target==='SELF'?f:enemy,baseAttack:effectiveStat(f,'attack'),side:{draw:()=>0,discard:()=>0},log:logs});
    f.shield=Math.min(70,f.shield);
    if(enemy.counter&&enemy.hp+enemy.shield<before&&!enemy.defeated){enemy.counter=false;f.hp=Math.max(0,f.hp-24);f.defeated=f.hp===0;logs.push({type:'DAMAGE',sourceName:enemy.name,targetName:f.name,applied:24,detail:'迎擊反擊 24 點'});}
    s.log.push({side,cardId:f.cardId,action:action.type,text:`${f.name}・${action.type==='SKILL'?p.skillName:'普通攻擊'}：${logs.map(l=>l.detail).join('；')}`,
      changes: snapshots.map(({ side, fighter, hpBefore, shieldBefore }) => ({ side, cardId: fighter.cardId,
        hpBefore, hpAfter: fighter.hp, shieldBefore, shieldAfter: fighter.shield })),
    });
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
  s.round++;s.revision++;return s;
}
export function interactiveCatalog(){return playableCards().map(c=>({id:c.id,name:c.name,element:c.element,rarity:c.rarity,form:c.form,front:c.art.front,thumbnail:c.art.thumbnail,story:c.story,...profile(c.id),stats:((f)=>({hp:f.maxHp,attack:f.attack,defense:f.defense,speed:f.speed}))(fighter(c.id))}));}
