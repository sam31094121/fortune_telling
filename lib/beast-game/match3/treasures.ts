/** Approved orb treasure rules. Server owns grants, inventory arithmetic and effects. */
import * as policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/元素寶器.json';
import { ELEMENTS, elementMultiplier, type BeastElement } from '../elements';
import type { TurnInput } from './resolve-turn';
import { fighterEffectiveAttack, fighterExactAttack } from './damage';
import { exactDamage } from '../exact-combat';
import { damageFoe, foeAvailable, initializeAvailableFoes } from './enemies';
import { isShieldFusionPath, isValidPath, type DragResult } from './drag';
import { comebackMultiplier, finishComeback } from './comeback';
import * as comebackPolicy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/敗部復活.json';
export interface TreasureBook { version: 1; counts: Record<BeastElement, number>; receipts: string[]; variants?: Record<string, number> }
export const emptyTreasureBook = (): TreasureBook => ({ version: 1, counts: { SPACE: 0, AIR: 0, WATER: 0, FIRE: 0, EARTH: 0 }, receipts: [] });
export function validateTreasureBook(value: unknown): TreasureBook {
  const b = value as TreasureBook;
  if (!b || b.version !== 1 || !b.counts || ELEMENTS.some(e => !Number.isSafeInteger(b.counts[e]) || b.counts[e] < 0) || !Array.isArray(b.receipts) || b.receipts.some(id => typeof id !== 'string' || !id.length || id.length > 120) || new Set(b.receipts).size !== b.receipts.length) throw new Error('寶器紀錄不完整，請保留存檔後重試');
  if (b.variants !== undefined && (!b.variants || Array.isArray(b.variants) || typeof b.variants !== 'object' || Object.entries(b.variants).some(([key,count]) => !/^(SPACE|AIR|WATER|FIRE|EARTH):[1-4]$/.test(key) || !Number.isSafeInteger(count) || count < 0))) throw new Error('法寶種類紀錄不完整');
  return { version: 1, counts: { ...b.counts }, receipts: [...b.receipts], ...(b.variants ? { variants: {...b.variants} } : {}) };
}
export type TreasureRole = 'pierce' | 'volley' | 'drain' | 'burst' | 'guard';
export type TreasureMember = {id:string;element:BeastElement;hp:number};
const definition = (element: BeastElement, variant: number) => {
  if (!Number.isInteger(variant) || variant < 0 || variant > 4) throw new Error('法寶階級無效');
  return policy.variants[element][variant];
};
export const treasureCount = (book: TreasureBook, element: BeastElement, variant: number) => variant === 0 ? book.counts[element] : book.variants?.[element+':'+variant] ?? 0;
export function treasureCatalog(book: TreasureBook, team?: readonly TreasureMember[], enhanced = false) {
  const members = team ?? ELEMENTS.map(element=>({id:element,element,hp:1}));
  const seen = new Map<BeastElement, number>();
  return members.map((member,slot) => {
    const variant = seen.get(member.element) ?? 0; seen.set(member.element,variant+1);
    const d = definition(member.element,variant);
    return {element:member.element,variant,role:d.role as TreasureRole,tier:variant+1,slot,ownerId:member.id,available:member.hp>0,name:d.name,description:d.description + (enhanced ? `；寶石捷連線傷害×${comebackPolicy.treasureAttackMultiplier}${variant === 4 ? '；實扣至少敵方生命上限50%，我方存活者補生命上限50%' : ''}` : ''),count:treasureCount(book,member.element,variant)};
  });
}
function operation(book: TreasureBook, id: string, element: BeastElement, delta: number, variant = 0) {
  const next = validateTreasureBook(book);
  if (!id || id.length > 120 || next.receipts.includes(id)) throw new Error('這次寶器操作已處理，請重新進入戰場');
  definition(element, variant);
  const count = treasureCount(next, element, variant) + delta;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('目前沒有可使用的寶器');
  if (variant === 0) next.counts[element] = count; else (next.variants ??= {})[element+':'+variant] = count;
  next.receipts.push(id); return next;
}
export function grantTreasure(input: TurnInput, res: DragResult) {
  const book = validateTreasureBook(input.treasures ?? emptyTreasureBook());
  if (!input.actionId || input.mode === 'medium' || !res.valid || !isValidPath(input.board, input.path, true, input.magic, true) || !isShieldFusionPath(input.path, input.magic) || new Set(input.path.map(p => input.board[p.r][p.c])).size !== 1 || input.path.length < 4 || input.path.length > 8) return { book, earned: null, catalog: treasureCatalog(book,input.team,input.mode === 'hard45' && !!input.comeback) };
  const end = input.path[input.path.length - 1], element = input.board[end.r][end.c];
  const id = `grant:${input.actionId}`;
  if (book.receipts.includes(id)) return { book, earned: null, catalog: treasureCatalog(book,input.team,input.mode === 'hard45' && !!input.comeback) };
  const variant = input.path.length - 4;
  const next = operation(book, id, element, policy.grant.amount, variant);
  return { book: next, earned: { element, variant, name: definition(element,variant).name, count: policy.grant.amount }, catalog: treasureCatalog(next,input.team,input.mode === 'hard45' && !!input.comeback) };
}
export function resolveTreasureUse(input: TurnInput, element: BeastElement, variant = 0) {
  const d = definition(element,variant);
  const slot = treasureCatalog(input.treasures ?? emptyTreasureBook(),input.team).find(x=>x.element===element && x.variant===variant);
  if (!slot?.available) throw new Error('對應神獸未上陣或已倒下，暫時不能使用這件法寶');
  if (input.mode === 'medium' || !input.actionId || !foeAvailable(input.foes, input.target, input.wins + 1) || !input.team.some(u => u.hp > 0)) throw new Error('目前不能使用寶器');
  const book = operation(input.treasures ?? emptyTreasureBook(), `use:${input.actionId}`, element, -1, variant);
  const base = Math.max(...input.team.filter(u => u.hp > 0).map(fighterEffectiveAttack));
  const living=input.team.filter(u=>u.hp>0);
  const exactBase=living.some(u=>u.attackExact)?living.reduce((n,u)=>{const a=BigInt(fighterExactAttack(u)??String(fighterEffectiveAttack(u)));return a>n?a:n;},0n).toString():undefined;
  let foes = initializeAvailableFoes(input.foes, input.wins + 1);
  const target = input.target, before = foes[target], shieldBefore = before.skillRuntime?.shield ?? 0;
  const broken = d.role === 'pierce' ? Math.ceil(shieldBefore * policy.SPACE.shieldBreak) : 0;
  if (broken && before.skillRuntime) foes[target] = { ...before, skillRuntime: { ...before.skillRuntime, shield: shieldBefore - broken } };
  const hits: { hpBefore: number; hpAfter: number; damage: number; shieldAbsorbed: number }[] = [];
  const enhanced = input.mode === 'hard45' && !!input.comeback;
  const rare = enhanced && variant === 4;
  const factor = comebackMultiplier(input.comeback) * (enhanced ? comebackPolicy.treasureAttackMultiplier : 1);
  const multipliers = (d.role === 'volley' ? [d.damageTotal/3,d.damageTotal/3,d.damageTotal/3] : [d.damageTotal]).map(m => m * factor);
  for (const multiplier of multipliers) {
    if (foes[target].hp <= 0) break;
    const prior = foes[target], shield = prior.skillRuntime?.shield ?? 0;
    foes = damageFoe(foes, target, exactBase?exactDamage(exactBase,[multiplier,elementMultiplier(element,prior.element)],0,0,prior.hp+shield).damage:Math.round(base * multiplier * elementMultiplier(element, prior.element)));
    hits.push({ hpBefore: prior.hp, hpAfter: foes[target].hp, damage: prior.hp - foes[target].hp, shieldAbsorbed: shield - (foes[target].skillRuntime?.shield ?? 0) });
  }
  // Eight shields earn the last tier: guarantee actual HP damage, recording shield absorption separately.
  if (rare) {
    const minimum = Math.min(before.hp, Math.ceil(before.maxHp * comebackPolicy.rareTreasureDamagePercent / 100));
    const dealt = before.hp - foes[target].hp;
    if (dealt < minimum) {
      const prior = foes[target], shield = prior.skillRuntime?.shield ?? 0;
      foes = damageFoe(foes, target, minimum - dealt + shield);
      hits.push({ hpBefore: prior.hp, hpAfter: foes[target].hp, damage: prior.hp - foes[target].hp, shieldAbsorbed: shield - (foes[target].skillRuntime?.shield ?? 0) });
    }
  }
  const healing: { id: string; before: number; after: number; actual: number }[] = [];
  const healedTeam = rare ? input.team.map(unit => {
    if (unit.hp <= 0) return unit;
    const hp = Math.min(unit.maxHp, unit.hp + Math.floor(unit.maxHp * comebackPolicy.rareTreasureHealPercent / 100));
    healing.push({ id: unit.id, before: unit.hp, after: hp, actual: hp - unit.hp });
    return { ...unit, hp };
  }) : input.team;
  const energyBefore = foes[target].attackEnergy ?? 0;
  const energyAfter = d.role === 'drain' && foes[target].hp > 0 ? Math.max(0, energyBefore - policy.WATER.energyDrain) : energyBefore;
  foes[target] = { ...foes[target], attackEnergy: energyAfter };
  const guardScale = d.role === 'guard' ? policy.EARTH.guardScale : input.treasureGuard ?? 1;
  const damage = hits.reduce((sum, hit) => sum + hit.damage, 0);
  const recovery=finishComeback(healedTeam,foes,input.comeback,true);
  return { ...(recovery.state ? {comeback:recovery.state} : {}),comebackFacts:recovery.facts,comebackText:recovery.message,outcome: orbOutcome(recovery.team, foes), book, catalog: treasureCatalog(book,recovery.team,enhanced), team: recovery.team, foes: initializeAvailableFoes(foes, input.wins + 1), guardScale,
    effect: { id: input.actionId, element, variant, role: d.role as TreasureRole, tier:variant+1, ownerId:slot.ownerId, name: d.name, targetId: before.id, damage, shieldBroken: broken, hits, healing, energyBefore, energyAfter,
      description: `${d.name}：實際傷害 ${damage}${rare ? `，我方實補 ${healing.reduce((sum, h) => sum + h.actual, 0)}` : ''}${broken ? `，削除護盾 ${broken}` : ''}${energyBefore !== energyAfter ? `，蓄力 ${energyBefore} → ${energyAfter}` : ''}${d.role === 'guard' ? '，下次敵方反擊減傷50%' : ''}` } };
}
export type TreasureUse = ReturnType<typeof resolveTreasureUse>;
import { orbOutcome } from './battle-outcome';
