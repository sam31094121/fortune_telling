/**
 * 神獸卡遊戲｜效果核心（Effect Engine）
 * ============================================================================
 *
 * 規格第十條：統一 Effect Type，不得每張卡片重新發明效果程式。
 * 規格第八條：暴擊、閃避、加成、減傷，全部由 Effect Engine 統一處理。
 *
 * 所以這裡是唯一一處會改動場上狀態的程式。
 * 新增一種效果 = 在 EFFECT_HANDLERS 加一個 key；
 * 新增一張卡、一個技能 = 只加資料，不動這支檔案。
 *
 * 每一次結算都會產生一筆 log。理由和三合一那邊一樣：
 * 客戶看到血量掉了，我們要講得出為什麼掉那麼多——
 * 沒有紀錄的戰鬥結果等於「前端說多少就是多少」。
 */

import { elementMultiplier, type BeastElement } from './elements';

export const EFFECT_TYPES = [
  'DAMAGE',
  'HEAL',
  'BUFF_ATTACK',
  'BUFF_DEFENSE',
  'BUFF_SPEED',
  'DEBUFF_ATTACK',
  'DEBUFF_DEFENSE',
  'STUN',
  'SHIELD',
  'DRAW',
  'DISCARD',
  'REVIVE',
  'ELEMENT_BOOST',
] as const;
export type EffectType = (typeof EFFECT_TYPES)[number];

export interface EffectSpec {
  type: EffectType;
  value: number;
  /** 混合技能可逐項指定作用對象，避免把自己的增益送給敵方。 */
  target?: 'SELF' | 'ENEMY';
  /** 持續回合數。加減益與暈眩用得到；傷害、治療不需要。 */
  duration?: number;
  /** 只有 ELEMENT_BOOST 用：加成哪一個元素。 */
  element?: BeastElement;
}

/** 場上一隻神獸的即時狀態。卡片本身是不可變資料，這一份才會變。 */
export interface BeastInstance {
  instanceId: string;
  cardId: string;
  name: string;
  element: BeastElement;
  subElement?: BeastElement | null;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  /** 護盾先扣，扣完才扣血。 */
  shield: number;
  /** 暈眩剩餘回合。大於 0 時不能行動。 */
  stunnedTurns: number;
  /** 進行中的加減益。到期自動移除。 */
  modifiers: Array<{ stat: 'attack' | 'defense' | 'speed'; value: number; remainingTurns: number; source: string }>;
  /** 元素加成，例如「本回合火屬性傷害 +15%」。 */
  elementBoosts: Array<{ element: BeastElement; percent: number; remainingTurns: number }>;
  /** 是否已陣亡。REVIVE 會看這個。 */
  defeated: boolean;
}

export interface EffectLogEntry {
  type: EffectType;
  sourceName: string;
  targetName: string | null;
  /** 實際生效的量。與 spec.value 可能不同（護盾吸收、上限截斷等）。 */
  applied: number;
  detail: string;
}

/** 效果結算需要的場外能力（抽牌、棄牌）。由 Turn Engine 注入。 */
export interface EffectSideChannel {
  draw: (count: number) => number;
  discard: (count: number) => number;
}

export interface EffectContext {
  source: BeastInstance;
  target: BeastInstance | null;
  /** 攻擊型效果會用到；純輔助效果傳 0。 */
  baseAttack: number;
  side: EffectSideChannel;
  log: EffectLogEntry[];
}

/** 傷害底值。規格第八條：最低傷害不得小於設定底值。 */
export const MINIMUM_DAMAGE = 1;

/** 目前有效的屬性值＝基礎值＋所有進行中的加減益。負值一律夾到 0。 */
export function effectiveStat(beast: BeastInstance, stat: 'attack' | 'defense' | 'speed'): number {
  const base = beast[stat];
  const delta = beast.modifiers
    .filter((modifier) => modifier.stat === stat)
    .reduce((sum, modifier) => sum + modifier.value, 0);
  return Math.max(0, base + delta);
}

/** 這隻神獸目前的元素加成百分比（對指定元素）。 */
export function elementBoostPercent(beast: BeastInstance, element: BeastElement): number {
  return beast.elementBoosts
    .filter((boost) => boost.element === element)
    .reduce((sum, boost) => sum + boost.percent, 0);
}

/**
 * 傷害公式。規格第八條：damage = attack − defenseModifier，且有底值。
 *
 * 元素倍率與元素加成都在這裡一起算完，
 * 不讓任何一處自己再乘一次——重複相乘是數值失控最常見的來源。
 */
export function computeDamage(input: {
  attack: number;
  defense: number;
  attackerElement: BeastElement;
  defenderElement: BeastElement;
  boostPercent?: number;
}): { damage: number; multiplier: number; detail: string } {
  const multiplier = elementMultiplier(input.attackerElement, input.defenderElement);
  const boosted = input.attack * (1 + (input.boostPercent ?? 0) / 100);
  const raw = boosted * multiplier - input.defense;
  const damage = Math.max(MINIMUM_DAMAGE, Math.round(raw));
  const detail = `攻${Math.round(boosted)} × 元素${multiplier} − 防${input.defense} = ${damage}`
    + (damage === MINIMUM_DAMAGE && raw < MINIMUM_DAMAGE ? `（低於底值 ${MINIMUM_DAMAGE}，取底值）` : '');
  return { damage, multiplier, detail };
}

/** 扣血。護盾先吃，扣完才扣 hp；歸零就標記陣亡。 */
function applyDamageTo(target: BeastInstance, amount: number): { absorbed: number; toHp: number } {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const toHp = amount - absorbed;
  target.hp = Math.max(0, target.hp - toHp);
  if (target.hp === 0) target.defeated = true;
  return { absorbed, toHp };
}

type EffectHandler = (spec: EffectSpec, context: EffectContext) => void;

function addModifier(
  beast: BeastInstance,
  stat: 'attack' | 'defense' | 'speed',
  value: number,
  duration: number,
  source: string,
) {
  beast.modifiers.push({ stat, value, remainingTurns: Math.max(1, duration), source });
}

/**
 * 效果分派表。
 *
 * 新增效果種類就在這裡加一個 key，其他地方都不用改——
 * 這就是規格第九條「未來新增技能只新增資料，不要修改 Battle Engine」的實作位置。
 */
const EFFECT_HANDLERS: Record<EffectType, EffectHandler> = {
  DAMAGE: (spec, ctx) => {
    if (!ctx.target || ctx.target.defeated) return;
    const boost = elementBoostPercent(ctx.source, ctx.source.element);
    const { damage, detail } = computeDamage({
      attack: ctx.baseAttack + spec.value,
      defense: effectiveStat(ctx.target, 'defense'),
      attackerElement: ctx.source.element,
      defenderElement: ctx.target.element,
      boostPercent: boost,
    });
    const { absorbed, toHp } = applyDamageTo(ctx.target, damage);
    ctx.log.push({
      type: 'DAMAGE',
      sourceName: ctx.source.name,
      targetName: ctx.target.name,
      applied: toHp,
      detail: `${detail}${absorbed > 0 ? `／護盾吸收 ${absorbed}` : ''}${ctx.target.defeated ? '／目標陣亡' : ''}`,
    });
  },

  HEAL: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    if (target.defeated) return;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + spec.value);
    ctx.log.push({
      type: 'HEAL',
      sourceName: ctx.source.name,
      targetName: target.name,
      applied: target.hp - before,
      detail: `回復 ${target.hp - before}（上限 ${target.maxHp}）`,
    });
  },

  BUFF_ATTACK: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    addModifier(target, 'attack', spec.value, spec.duration ?? 1, ctx.source.name);
    ctx.log.push({ type: 'BUFF_ATTACK', sourceName: ctx.source.name, targetName: target.name, applied: spec.value, detail: `攻擊 +${spec.value}，${spec.duration ?? 1} 回合` });
  },
  BUFF_DEFENSE: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    addModifier(target, 'defense', spec.value, spec.duration ?? 1, ctx.source.name);
    ctx.log.push({ type: 'BUFF_DEFENSE', sourceName: ctx.source.name, targetName: target.name, applied: spec.value, detail: `防禦 +${spec.value}，${spec.duration ?? 1} 回合` });
  },
  BUFF_SPEED: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    addModifier(target, 'speed', spec.value, spec.duration ?? 1, ctx.source.name);
    ctx.log.push({ type: 'BUFF_SPEED', sourceName: ctx.source.name, targetName: target.name, applied: spec.value, detail: `速度 +${spec.value}，${spec.duration ?? 1} 回合` });
  },
  DEBUFF_ATTACK: (spec, ctx) => {
    if (!ctx.target) return;
    addModifier(ctx.target, 'attack', -spec.value, spec.duration ?? 1, ctx.source.name);
    ctx.log.push({ type: 'DEBUFF_ATTACK', sourceName: ctx.source.name, targetName: ctx.target.name, applied: -spec.value, detail: `攻擊 −${spec.value}，${spec.duration ?? 1} 回合` });
  },
  DEBUFF_DEFENSE: (spec, ctx) => {
    if (!ctx.target) return;
    addModifier(ctx.target, 'defense', -spec.value, spec.duration ?? 1, ctx.source.name);
    ctx.log.push({ type: 'DEBUFF_DEFENSE', sourceName: ctx.source.name, targetName: ctx.target.name, applied: -spec.value, detail: `防禦 −${spec.value}，${spec.duration ?? 1} 回合` });
  },

  STUN: (spec, ctx) => {
    if (!ctx.target || ctx.target.defeated) return;
    const turns = Math.max(1, spec.duration ?? spec.value ?? 1);
    ctx.target.stunnedTurns = Math.max(ctx.target.stunnedTurns, turns);
    ctx.log.push({ type: 'STUN', sourceName: ctx.source.name, targetName: ctx.target.name, applied: turns, detail: `暈眩 ${turns} 回合` });
  },

  SHIELD: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    target.shield += spec.value;
    ctx.log.push({ type: 'SHIELD', sourceName: ctx.source.name, targetName: target.name, applied: spec.value, detail: `護盾 +${spec.value}（目前 ${target.shield}）` });
  },

  DRAW: (spec, ctx) => {
    const drawn = ctx.side.draw(spec.value);
    ctx.log.push({ type: 'DRAW', sourceName: ctx.source.name, targetName: null, applied: drawn, detail: `抽 ${drawn} 張` });
  },
  DISCARD: (spec, ctx) => {
    const discarded = ctx.side.discard(spec.value);
    ctx.log.push({ type: 'DISCARD', sourceName: ctx.source.name, targetName: null, applied: discarded, detail: `棄 ${discarded} 張` });
  },

  REVIVE: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    if (!target.defeated) return;
    target.defeated = false;
    target.hp = Math.min(target.maxHp, Math.max(1, spec.value));
    ctx.log.push({ type: 'REVIVE', sourceName: ctx.source.name, targetName: target.name, applied: target.hp, detail: `復活，回復至 ${target.hp}` });
  },

  ELEMENT_BOOST: (spec, ctx) => {
    const target = ctx.target ?? ctx.source;
    const element = spec.element ?? target.element;
    target.elementBoosts.push({ element, percent: spec.value, remainingTurns: Math.max(1, spec.duration ?? 1) });
    ctx.log.push({ type: 'ELEMENT_BOOST', sourceName: ctx.source.name, targetName: target.name, applied: spec.value, detail: `${element} 傷害 +${spec.value}%，${spec.duration ?? 1} 回合` });
  },
};

/** 結算一組效果。這是唯一的入口，任何地方要改狀態都得走這裡。 */
export function resolveEffects(effects: EffectSpec[], context: EffectContext): void {
  for (const spec of effects) {
    const handler = EFFECT_HANDLERS[spec.type];
    if (!handler) {
      throw new Error(`UNKNOWN_EFFECT_TYPE: ${String(spec.type)} 不在 Effect Registry 裡，禁止結算。`);
    }
    handler(spec, context);
  }
}

/** 回合結束時把持續效果扣一回合，到期就移除。 */
export function tickDurations(beast: BeastInstance): void {
  beast.modifiers = beast.modifiers
    .map((modifier) => ({ ...modifier, remainingTurns: modifier.remainingTurns - 1 }))
    .filter((modifier) => modifier.remainingTurns > 0);
  beast.elementBoosts = beast.elementBoosts
    .map((boost) => ({ ...boost, remainingTurns: boost.remainingTurns - 1 }))
    .filter((boost) => boost.remainingTurns > 0);
  if (beast.stunnedTurns > 0) beast.stunnedTurns -= 1;
}

export function isEffectType(value: unknown): value is EffectType {
  return typeof value === 'string' && (EFFECT_TYPES as readonly string[]).includes(value);
}
