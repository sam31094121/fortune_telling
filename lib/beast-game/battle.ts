/**
 * 神獸卡遊戲｜戰鬥核心（Battle Engine）
 * ============================================================================
 *
 * 規格第八條：禁止前端自行扣血，統一由 Game Core 計算。
 * 規格第十二條：後端／Game Core 已先確定結果，前端才播放對應動畫。
 *
 * 所以這支檔案是純函式：給定狀態，算出結果與一份逐步紀錄。
 * 前端拿到的是「已經決定好的事實」，它只負責把事實演出來。
 * 動畫演什麼、演多久，都不會改變任何一個數字。
 */

import { getSkill, type SkillDefinition } from '../../cards/skills';
import {
  computeDamage,
  effectiveStat,
  elementBoostPercent,
  resolveEffects,
  type BeastInstance,
  type EffectLogEntry,
  type EffectSideChannel,
} from './effects';
import type { BeastCard } from './schema';

export type PlayerSide = 'PLAYER' | 'OPPONENT';

/** 把不可變的卡片資料，變成場上可變的一隻。 */
export function instantiate(card: BeastCard, instanceId: string): BeastInstance {
  return {
    instanceId,
    cardId: card.id,
    name: card.name,
    element: card.element,
    subElement: card.subElement ?? null,
    maxHp: card.stats.hp,
    hp: card.stats.hp,
    attack: card.stats.attack,
    defense: card.stats.defense,
    speed: card.stats.speed,
    shield: 0,
    stunnedTurns: 0,
    modifiers: [],
    elementBoosts: [],
    defeated: false,
  };
}

/** 技能使用次數紀錄。整場共用一份，避免同一招無限放。 */
export type SkillUsage = Map<string, number>;

export function canUseSkill(skill: SkillDefinition, usage: SkillUsage, instanceId: string): boolean {
  if (skill.usesPerBattle == null) return true;
  return (usage.get(`${instanceId}:${skill.id}`) ?? 0) < skill.usesPerBattle;
}

function markUsed(skill: SkillDefinition, usage: SkillUsage, instanceId: string): void {
  const key = `${instanceId}:${skill.id}`;
  usage.set(key, (usage.get(key) ?? 0) + 1);
}

export interface BattleContext {
  side: EffectSideChannel;
  usage: SkillUsage;
  log: EffectLogEntry[];
}

/**
 * 觸發某一隻的某個時機的技能。
 *
 * Battle Engine 不認得任何一個技能的名字——它只認 trigger，
 * 然後把 effects 丟給 Effect Engine。這就是規格第九條說的
 * 「新增技能只新增資料，不要修改 Battle Engine」。
 */
export function triggerSkills(params: {
  card: BeastCard;
  self: BeastInstance;
  enemy: BeastInstance | null;
  trigger: SkillDefinition['trigger'];
  baseAttack?: number;
  context: BattleContext;
}): void {
  const { card, self, enemy, trigger, context } = params;
  if (self.defeated) return;

  const ids = trigger === 'PASSIVE' ? card.passive : card.skills;
  for (const id of ids) {
    const skill = getSkill(id);
    if (!skill || skill.trigger !== trigger) continue;
    if (!canUseSkill(skill, context.usage, self.instanceId)) continue;

    let resolved = false;
    for (const effect of skill.effects) {
      const targeting = effect.target ?? skill.targeting;
      const target = targeting === 'ENEMY' ? enemy : self;
      if (targeting === 'ENEMY' && (!target || target.defeated)) continue;
      resolveEffects([effect], {
        source: self,
        target,
        baseAttack: params.baseAttack ?? 0,
        side: context.side,
        log: context.log,
      });
      resolved = true;
    }
    if (resolved) markUsed(skill, context.usage, self.instanceId);
  }
}

export interface AttackResult {
  attacker: string;
  defender: string;
  /** 普攻造成的傷害。技能的額外傷害另計在 log 裡。 */
  basicDamage: number;
  multiplier: number;
  defenderDefeated: boolean;
  skipped: 'STUNNED' | 'DEFEATED' | null;
  log: EffectLogEntry[];
}

/**
 * 一次攻擊。
 *
 * 順序固定：普攻先結算，再跑 ON_ATTACK 技能，最後跑守方的 ON_DAMAGED。
 * 順序寫死在這裡而不是散在各張卡，是因為順序一旦各卡自己決定，
 * 同樣的兩張卡對打會因為誰先寫而得到不同結果——那就沒有規則可言了。
 */
export function performAttack(params: {
  attackerCard: BeastCard;
  attacker: BeastInstance;
  defenderCard: BeastCard;
  defender: BeastInstance;
  context: BattleContext;
  /** 受創反應使用守方的抽牌與技能次數。 */
  defenderContext?: BattleContext;
}): AttackResult {
  const { attacker, defender, context } = params;
  const log: EffectLogEntry[] = [];

  if (attacker.defeated) {
    return { attacker: attacker.name, defender: defender.name, basicDamage: 0, multiplier: 1, defenderDefeated: defender.defeated, skipped: 'DEFEATED', log };
  }
  if (attacker.stunnedTurns > 0) {
    log.push({ type: 'STUN', sourceName: attacker.name, targetName: attacker.name, applied: attacker.stunnedTurns, detail: '暈眩中，本回合無法行動' });
    context.log.push(...log);
    return { attacker: attacker.name, defender: defender.name, basicDamage: 0, multiplier: 1, defenderDefeated: defender.defeated, skipped: 'STUNNED', log };
  }

  const attack = effectiveStat(attacker, 'attack');
  const defense = effectiveStat(defender, 'defense');
  const boost = elementBoostPercent(attacker, attacker.element);
  const { damage, multiplier, detail } = computeDamage({
    attack,
    defense,
    attackerElement: attacker.element,
    defenderElement: defender.element,
    boostPercent: boost,
  });

  const absorbed = Math.min(defender.shield, damage);
  defender.shield -= absorbed;
  const toHp = damage - absorbed;
  defender.hp = Math.max(0, defender.hp - toHp);
  if (defender.hp === 0) defender.defeated = true;

  log.push({
    type: 'DAMAGE',
    sourceName: attacker.name,
    targetName: defender.name,
    applied: toHp,
    detail: `普攻 ${detail}${absorbed > 0 ? `／護盾吸收 ${absorbed}` : ''}${defender.defeated ? '／目標陣亡' : ''}`,
  });
  context.log.push(...log);

  // 攻擊時技能：帶著這一次的攻擊值進去，讓 DAMAGE 效果能加在普攻之上。
  triggerSkills({
    card: params.attackerCard,
    self: attacker,
    enemy: defender,
    trigger: 'ON_ATTACK',
    baseAttack: attack,
    context,
  });

  // 守方的受創反應。已經陣亡就不再觸發——死了不會再有反應。
  if (!defender.defeated) {
    triggerSkills({
      card: params.defenderCard,
      self: defender,
      enemy: attacker,
      trigger: 'ON_DAMAGED',
      context: params.defenderContext ?? context,
    });
  }

  return {
    attacker: attacker.name,
    defender: defender.name,
    basicDamage: toHp,
    multiplier,
    defenderDefeated: defender.defeated,
    skipped: null,
    log,
  };
}

/** 出手順序由速度決定；同速時用 instanceId 排，保證同一場永遠同一順序。 */
export function orderBySpeed(units: BeastInstance[]): BeastInstance[] {
  return [...units].sort((a, b) => {
    const diff = effectiveStat(b, 'speed') - effectiveStat(a, 'speed');
    return diff !== 0 ? diff : a.instanceId.localeCompare(b.instanceId);
  });
}
