/**
 * 寶珠戰 5v5：敵方五隻（10/30 鈺勝確認的 5v5 截圖為功能／版面基準）。
 * 名單來源：orb-battle-preview/contrib/mingli/enemies.json（井木犴、婁金狗、箕水豹、星日馬、女土蝠，.v2 卡圖）。
 * 數值【待平衡】：沿用參考實作 engine.js OFFICIAL_ENEMIES（每隻 HP 300、反擊攻擊 8），不改任何卡面數值。
 * 反擊：每隻敵人各自倒數 ENEMY_COUNTER_EVERY（3）步，歸零攻擊我方 HP 最低的存活卡（同 HP 取前者），套用克制表 elementMultiplier。
 * 連線攻擊【待平衡】：連線模式點選 ≥2 張、每張需且消耗 50 能量；傷害＝round(Σ攻擊 × 3 × (1 + (張數-2) × 0.5))，不算步數。
 */
import { elementMultiplier, type BeastElement } from '../elements';
import { ENEMY_COUNTER_EVERY } from './config';

/** 依 5v5 截圖的敵方五隻（以卡名從 60 張 .v2 卡池解析，不寫死 ID）。 */
export const MATCH3_ENEMY_NAMES = ['井木犴', '婁金狗', '箕水豹', '星日馬', '女土蝠'] as const;
/**
 * 困難 II（hard45b）敵方五隻：固定、可重現的選卡規則（不靠亂數）。
 * 從 60 張 .v2 卡池中：只取成年卡（form==='ADULT'，即排除幼子 YOUNG 與四聖獸 GUARDIAN）、
 * 排除 hard45/medium 敵方 MATCH3_ENEMY_NAMES；依盤面五色順序（風、空、水、火、地）每屬性取 id 最小（星宿序號最小）的一張。
 * 我方預設隊伍在 hard45b 也排除這五隻，避免敵我同卡。
 */
export const HARD2_ENEMY_NAMES = ['角木蛟', '亢金龍', '心月狐', '房日兔', '氐土貉'] as const;
export function selectHard2Enemies<C extends { id: string; name: string; element: string; form?: string }>(pool: readonly C[], order: readonly string[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH']): C[] {
  const ok = pool.filter((c) => c.form === 'ADULT' && !(MATCH3_ENEMY_NAMES as readonly string[]).includes(c.name));
  const out: C[] = [];
  for (const el of order) { const c = ok.filter((x) => x.element === el).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]; if (c) out.push(c); }
  return out;
}
/** 該模式的敵方名單：hard45b 用 HARD2，其餘（medium、hard45）維持原本 MATCH3_ENEMY_NAMES。 */
export function enemyNamesFor(modeId?: string | null): readonly string[] { return modeId === 'hard45b' || modeId === 'hard49g' ? HARD2_ENEMY_NAMES : MATCH3_ENEMY_NAMES; }
export const MATCH3_ENEMY_HP = 300;
export const MATCH3_ENEMY_ATK = 8;
export const LINK_MIN_CARDS = 2;
export const LINK_ENERGY_COST = 50;
export const LINK_BASE_MULTIPLIER = 3;
export const LINK_BONUS_PER_EXTRA = 0.5;

export interface Match3Foe { id: string; element: BeastElement; hp: number; maxHp: number; attack: number; cd: number }
interface Ally { id: string; element: BeastElement; hp: number; energy: number }

/** mode 不給＝原本中等數值（HP 300／ATK 8／倒數 3）；困難模式由 config.MATCH3_MODES 傳入【待平衡】值。 */
export function makeFoe(id: string, element: BeastElement, mode?: { enemyHp: number; enemyAtk: number; counterEvery: number }): Match3Foe {
  const hp = mode?.enemyHp ?? MATCH3_ENEMY_HP;
  return { id, element, hp, maxHp: hp, attack: mode?.enemyAtk ?? MATCH3_ENEMY_ATK, cd: mode?.counterEvery ?? ENEMY_COUNTER_EVERY };
}

/** 目前目標：選的還活著就用它，否則第一隻存活；全滅回 -1。 */
export function aliveTarget(foes: readonly { hp: number }[], target: number): number {
  if (foes[target] && foes[target].hp > 0) return target;
  return foes.findIndex((f) => f.hp > 0);
}

/** 傷害打在目標身上（溢出不轉移），回傳新陣列。 */
export function damageFoe<T extends { hp: number }>(foes: readonly T[], index: number, amount: number): T[] {
  return foes.map((f, i) => (i === index ? { ...f, hp: Math.max(0, f.hp - Math.max(0, amount)) } : f));
}

export interface CounterHit { enemy: number; targetId: string; damage: number }

/** 一步結束後的敵方回合：每隻存活敵人倒數 -1，歸零者攻擊我方 HP 最低存活卡並重置倒數。 */
export function counterPhase<T extends Ally, F extends Match3Foe>(team: readonly T[], foes: readonly F[], every: number = ENEMY_COUNTER_EVERY): { team: T[]; foes: F[]; hits: CounterHit[] } {
  let t = team.slice(); const hits: CounterHit[] = [];
  const nf = foes.map((f, ei) => {
    if (f.hp <= 0) return f;
    const cd = f.cd - 1;
    if (cd > 0) return { ...f, cd };
    let ti = -1;
    t.forEach((u, i) => { if (u.hp > 0 && (ti < 0 || u.hp < t[ti].hp)) ti = i; });
    if (ti >= 0) {
      const dmg = Math.round(f.attack * elementMultiplier(f.element, t[ti].element));
      hits.push({ enemy: ei, targetId: t[ti].id, damage: dmg });
      t = t.map((u, i) => (i === ti ? { ...u, hp: Math.max(0, u.hp - dmg), energy: u.hp - dmg <= 0 ? 0 : u.energy } : u));
    }
    return { ...f, cd: every };
  });
  return { team: t, foes: nf, hits };
}

export function linkMultiplier(n: number): number { return 1 + Math.max(0, n - LINK_MIN_CARDS) * LINK_BONUS_PER_EXTRA; }
export function linkDamage(attacks: readonly number[]): number {
  return Math.round(attacks.reduce((s, a) => s + a, 0) * LINK_BASE_MULTIPLIER * linkMultiplier(attacks.length));
}
/** 連線是否可發動：null＝可以；否則回傳原因。 */
export function linkProblem(team: readonly Ally[], ids: readonly string[]): null | 'tooFew' | 'energyLow' | 'down' {
  if (ids.length < LINK_MIN_CARDS) return 'tooFew';
  for (const id of ids) { const u = team.find((x) => x.id === id); if (!u || u.hp <= 0) return 'down'; if (u.energy < LINK_ENERGY_COST) return 'energyLow'; }
  return null;
}
