/**
 * 四象魔法珠（10/31 用戶核准）：魔法珠被引爆時，若隊伍裡有對應的四象 UR 神獸，發動該神獸技能演出並加傷。
 * 風→青龍、火→朱雀、空→白虎、水→玄武；地珠→從隊伍裡「在場（未倒下）」的四象隨機一隻。
 * 隊伍沒有對應四象就不觸發。功能旗標預設關閉，只有 NEXT_PUBLIC_GUARDIAN_MAGIC=1 才開。
 * 只是後處理 computeHits 的結果，不改卡面數值、不改 BASE_RATIO、不改魔法珠生成規則。
 */
import type { BeastElement } from '../elements';
import type { Match3Hit } from './damage';
import type { MagicTrigger } from './drag';
import type { Rng } from './board';
import { playableCards } from '../registry';
import { getSkill } from '../../../cards/skills';

export interface GuardianInfo { id: string; name: string; skillId: string; skillName: string; element: BeastElement }

/** 四象對照：不寫死卡片 ID，從卡池（registry）找 form＝GUARDIAN、rarity＝UR 的四象卡，技能取第一招、名稱讀 cards/skills。
 * 預期：風→青龍、火→朱雀、空→白虎、水→玄武（由 tests/guardian-magic-orb.test.cjs 釘住）。 */
function buildGuardians(): Partial<Record<BeastElement, GuardianInfo>> {
  const out: Partial<Record<BeastElement, GuardianInfo>> = {};
  for (const c of playableCards()) {
    if (c.form !== 'GUARDIAN' || c.rarity !== 'UR' || c.element === 'EARTH' || out[c.element]) continue;
    const skillId = c.skills[0];
    out[c.element] = { id: c.id, name: c.name, skillId, skillName: getSkill(skillId)?.name ?? c.name, element: c.element };
  }
  return out;
}
export const GUARDIAN_BY_ELEMENT: Partial<Record<BeastElement, GuardianInfo>> = buildGuardians();
export const GUARDIAN_LIST: readonly GuardianInfo[] = (['AIR', 'FIRE', 'SPACE', 'WATER'] as const).map((e) => GUARDIAN_BY_ELEMENT[e]).filter((g): g is GuardianInfo => !!g);

/** 【待平衡】四象魔法珠：含魔法珠那一組的傷害 × 1.5。 */
export const GUARDIAN_MAGIC_MULT = 1.5;
/** 【待平衡】每一筆傷害因四象加成「多出來」的部分最多加這麼多（避免魔法珠威力無上限時爆傷）。 */
export const GUARDIAN_MAGIC_BONUS_CAP = 120;
/** 演出時間（毫秒），點畫面可略過。 */
export const GUARDIAN_FX_MS = 1400;

/** 程式內總開關；實際是否開啟看 isGuardianMagicEnabled()。 */
export const GUARDIAN_MAGIC_SKILL_ENABLED = process.env.NEXT_PUBLIC_GUARDIAN_MAGIC === '1';
export function isGuardianMagicEnabled(): boolean { return GUARDIAN_MAGIC_SKILL_ENABLED; }

export interface GuardianActivation { chain: number; orbElement: BeastElement; guardian: GuardianInfo; power: number }

/** 依引爆的魔法珠決定要發動哪些四象。同一段同一屬性只發動一次。 */
export function resolveGuardianActivations(triggers: readonly MagicTrigger[], team: readonly { id: string; hp: number }[], rng: Rng): GuardianActivation[] {
  const alive = new Set(team.filter((u) => u.hp > 0).map((u) => u.id));
  const onTeam = GUARDIAN_LIST.filter((g) => alive.has(g.id));
  const out: GuardianActivation[] = [];
  const seen = new Set<string>();
  for (const t of triggers) {
    const key = `${t.chain}:${t.element}`;
    if (seen.has(key)) { const a = out.find((x) => `${x.chain}:${x.orbElement}` === key); if (a) a.power += t.power; continue; }
    let g: GuardianInfo | undefined;
    if (t.element === 'EARTH') g = onTeam.length ? onTeam[Math.min(onTeam.length - 1, Math.floor(rng() * onTeam.length))] : undefined;
    else { const c = GUARDIAN_BY_ELEMENT[t.element]; g = c && alive.has(c.id) ? c : undefined; }
    if (!g) continue;
    seen.add(key);
    out.push({ chain: t.chain, orbElement: t.element, guardian: g, power: t.power });
  }
  return out;
}

export function guardianBonus(amount: number): number {
  if (amount <= 0) return 0;
  return Math.min(GUARDIAN_MAGIC_BONUS_CAP, Math.round(amount * (GUARDIAN_MAGIC_MULT - 1)));
}

/** 把四象加成套到同一段、同一顏色、有傷害的那幾筆。回傳新陣列，不改原本的 hits。 */
export function applyGuardianBonus(hits: readonly Match3Hit[], acts: readonly GuardianActivation[]): Array<Match3Hit & { guardianBonus?: number }> {
  return hits.map((h) => {
    const a = acts.find((x) => x.chain === h.chain && x.orbElement === h.element);
    if (!a || h.amount <= 0) return h;
    const b = guardianBonus(h.amount);
    return { ...h, amount: h.amount + b, guardianBonus: b };
  });
}
