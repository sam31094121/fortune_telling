/** Approved orb treasure rules. Server owns grants, inventory arithmetic and effects. */
import * as policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/元素寶器.json';
import { ELEMENTS, elementMultiplier, type BeastElement } from '../elements';
import type { TurnInput } from './resolve-turn';
import { fighterEffectiveAttack } from './damage';
import { damageFoe, foeAvailable, initializeAvailableFoes } from './enemies';
import { isShieldFusionPath, isValidPath, type DragResult } from './drag';
export interface TreasureBook { version: 1; counts: Record<BeastElement, number>; receipts: string[] }
export const emptyTreasureBook = (): TreasureBook => ({ version: 1, counts: { SPACE: 0, AIR: 0, WATER: 0, FIRE: 0, EARTH: 0 }, receipts: [] });
export function validateTreasureBook(value: unknown): TreasureBook {
  const b = value as TreasureBook;
  if (!b || b.version !== 1 || !b.counts || ELEMENTS.some(e => !Number.isSafeInteger(b.counts[e]) || b.counts[e] < 0) || !Array.isArray(b.receipts) || b.receipts.some(id => typeof id !== 'string' || !id.length || id.length > 120) || new Set(b.receipts).size !== b.receipts.length) throw new Error('寶器紀錄不完整，請保留存檔後重試');
  return { version: 1, counts: { ...b.counts }, receipts: [...b.receipts] };
}
export const treasureCatalog = (book: TreasureBook) => ELEMENTS.map(element => ({ element, name: policy[element].name, description: policy[element].description, count: book.counts[element] }));
function operation(book: TreasureBook, id: string, element: BeastElement, delta: number) {
  const next = validateTreasureBook(book);
  if (!id || id.length > 120 || next.receipts.includes(id)) throw new Error('這次寶器操作已處理，請重新進入戰場');
  const count = next.counts[element] + delta;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('目前沒有可使用的寶器');
  next.counts[element] = count; next.receipts.push(id); return next;
}
export function grantTreasure(input: TurnInput, res: DragResult) {
  const book = validateTreasureBook(input.treasures ?? emptyTreasureBook());
  if (!input.actionId || input.mode === 'medium' || !res.valid || !isValidPath(input.board, input.path, true, input.magic, true) || !isShieldFusionPath(input.path, input.magic) || new Set(input.path.map(p => input.board[p.r][p.c])).size !== policy.grant.distinctShieldElements) return { book, earned: null, catalog: treasureCatalog(book) };
  const end = input.path[input.path.length - 1], element = input.board[end.r][end.c];
  const id = `grant:${input.actionId}`;
  if (book.receipts.includes(id)) return { book, earned: null, catalog: treasureCatalog(book) };
  const next = operation(book, id, element, policy.grant.amount);
  return { book: next, earned: { element, name: policy[element].name, count: policy.grant.amount }, catalog: treasureCatalog(next) };
}
export function resolveTreasureUse(input: TurnInput, element: BeastElement) {
  if (input.mode === 'medium' || !input.actionId || !foeAvailable(input.foes, input.target, input.wins + 1) || !input.team.some(u => u.hp > 0)) throw new Error('目前不能使用寶器');
  const book = operation(input.treasures ?? emptyTreasureBook(), `use:${input.actionId}`, element, -1);
  const base = Math.max(...input.team.filter(u => u.hp > 0).map(fighterEffectiveAttack));
  let foes = initializeAvailableFoes(input.foes, input.wins + 1);
  const target = input.target, before = foes[target], shieldBefore = before.skillRuntime?.shield ?? 0;
  const broken = element === 'SPACE' ? Math.ceil(shieldBefore * policy.SPACE.shieldBreak) : 0;
  if (broken && before.skillRuntime) foes[target] = { ...before, skillRuntime: { ...before.skillRuntime, shield: shieldBefore - broken } };
  const hits: { hpBefore: number; hpAfter: number; damage: number; shieldAbsorbed: number }[] = [];
  for (const multiplier of policy[element].hits) {
    if (foes[target].hp <= 0) break;
    const prior = foes[target], shield = prior.skillRuntime?.shield ?? 0;
    foes = damageFoe(foes, target, Math.round(base * multiplier * elementMultiplier(element, prior.element)));
    hits.push({ hpBefore: prior.hp, hpAfter: foes[target].hp, damage: prior.hp - foes[target].hp, shieldAbsorbed: shield - (foes[target].skillRuntime?.shield ?? 0) });
  }
  const energyBefore = foes[target].attackEnergy ?? 0;
  const energyAfter = element === 'WATER' && foes[target].hp > 0 ? Math.max(0, energyBefore - policy.WATER.energyDrain) : energyBefore;
  foes[target] = { ...foes[target], attackEnergy: energyAfter };
  const guardScale = element === 'EARTH' ? policy.EARTH.guardScale : input.treasureGuard ?? 1;
  const damage = hits.reduce((sum, hit) => sum + hit.damage, 0);
  return { book, catalog: treasureCatalog(book), team: input.team, foes: initializeAvailableFoes(foes, input.wins + 1), guardScale,
    effect: { id: input.actionId, element, name: policy[element].name, targetId: before.id, damage, shieldBroken: broken, hits, energyBefore, energyAfter,
      description: `${policy[element].name}：實際傷害 ${damage}${broken ? `，削除護盾 ${broken}` : ''}${energyBefore !== energyAfter ? `，蓄力 ${energyBefore} → ${energyAfter}` : ''}${element === 'EARTH' ? '，下次敵方反擊減傷50%' : ''}` } };
}
export type TreasureUse = ReturnType<typeof resolveTreasureUse>;
