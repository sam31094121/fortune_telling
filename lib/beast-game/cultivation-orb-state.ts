import 'server-only';
import { playableCards } from './registry';
import { CARD_FACE_STATS } from './card-face-stats';
import { getSkill } from '../../cards/skills';
import { seededRng } from './match3/board';
import { emptyMagic, generateDragBoard } from './match3/drag';
import { match3Mode, type Match3ModeId } from './match3/config';
import { selectProgressionEnemies, progressionLineupStats, progressionStage } from './match3/progression';
import { initializeAvailableFoes } from './match3/enemies';
import { initializePlayerSkills } from './match3/player-skills';
import { emptyTreasureBook } from './match3/treasures';
import type { HardCampaign } from './match3/hard-campaign';
import type { TurnInput } from './match3/resolve-turn';
import { initialComeback, comebackLabel, COMEBACK_POLICY } from './match3/comeback';

/** Same registry, lineup progression and board generator as the existing game. */
export function initialSharedOrb(profile:HardCampaign,seed:number,mode:Match3ModeId):TurnInput {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!['hard45','hard45b'].includes(mode))throw new Error('開戰資料無效。');
  const rng=seededRng(seed),cfg=match3Mode(mode),pool=playableCards().filter(c=>CARD_FACE_STATS[c.id]);
  // Preserve existing RNG consumption by the lineup picker before enemy selection.
  pool.slice().sort(()=>rng()-0.5);
  const team=initializePlayerSkills(profile.teamIds.map(id=>{
    const c=pool.find(c=>c.id===id)!,s=CARD_FACE_STATS[id],skill=getSkill(c.skills[0]),a=profile.shared!.stats[id];
    return {id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:s.hp,maxHp:s.hp,attack:a.attack,...(a.attackExact?{attackExact:a.attackExact}:{}),energy:0,skillName:skill?.name,description:skill?.description};
  })).team;
  const selected=selectProgressionEnemies(pool,rng,profile.wins),stats=progressionLineupStats(selected,profile.wins,pool);
  const challenge = mode === 'hard45' && profile.wins + 1 >= COMEBACK_POLICY.challengeStage;
  const foes=initializeAvailableFoes(selected.map((c,i)=>{const hp=Math.round(stats[i].hp*(challenge?COMEBACK_POLICY.challengeHpMultiplier:1));return {id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp,maxHp:hp,attack:Math.round(stats[i].attack*(challenge?COMEBACK_POLICY.challengeAttackMultiplier:1)),cd:1};}),profile.wins+1);
  const board=generateDragBoard(rng,cfg.rows,cfg.cols,cfg.diagonal,progressionStage(profile.wins).minChain);
  return {team,foes,board,magic:emptyMagic(board),mode,wins:profile.wins,seed,move:0,chosen:{},rule:'tap-lead',attackBoost:1,treasureGuard:1,treasures:profile.treasures??emptyTreasureBook(),path:[],target:0,...(mode==='hard45'?{comeback:initialComeback(profile.wins,profile.comebackRecord),comebackText:comebackLabel(initialComeback(profile.wins,profile.comebackRecord))}:{})};
}
