/**
 * PLAN-v2 A6｜困難模式（寶珠闖關 hard45／hard45b）中途重整接回原戰局：瀏覽器與伺服端共用的純規則。
 *
 * ‧ 開關：NEXT_PUBLIC_M3_BATTLE_RESUME === '1' 才生效（沿用 feedChainEnabled 的 '1' 慣例）；關閉時戰鬥、存檔、回合請求與舊版完全相同。
 * ‧ 戰局核心（BattleCore）＝伺服端每次回合收據後的權威狀態：盤面、魔法珠、雙方卡（血量、能量、技能狀態）、回合數、反攻倍率、寶器防護。
 *   伺服端把核心做成雜湊並簽章（orb-battle-ledger.ts），瀏覽器只能原樣存、原樣送回；改一個數字簽章就對不上。
 * ‧ 本檔不引用 node:crypto 與瀏覽器 API，兩邊都能編譯。
 * ‧ 期限等數字是【待平衡暫定值】。
 */
import type { Board, Cell } from './board';
import type { MagicGrid } from './drag';

export function battleResumeEnabled(value: string | undefined = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_M3_BATTLE_RESUME : undefined): boolean {
  return value === '1';
}

export const BATTLE_RESUME_POLICY = {
  /** 【待平衡暫定值】最後一次伺服端回合收據後，超過這麼久就不能接回（這場作廢＝不發獎勵、勝場不變，與落敗相同）。 */
  expireMs: 24 * 60 * 60 * 1000,
  /** 【待平衡暫定值】快照字串上限（防止塞爆儲存空間）；正常一場約 10–30 KB。 */
  maxSnapshotChars: 200_000,
  /** 【待平衡暫定值】伺服端記憶中最多追蹤的戰局數（超過時先清已結束的，再清最舊的；搬到共用儲存後改用 TTL）。 */
  ledgerMax: 5000,
} as const;

export const BATTLE_RESUME_MODES = ['hard45', 'hard45b'] as const;
export type BattleResumeMode = typeof BATTLE_RESUME_MODES[number];
export type BattleRule = 'tap-lead' | 'first-attacks' | 'all-attack';

/** 戰局身分：開局後不會變。wins＝開局時的勝場（＝第 wins+1 關），結算時必須一致。 */
export interface BattleMeta { battleId: string; mode: BattleResumeMode; wins: number; seed: number; rule: BattleRule }
/** 伺服端權威核心。team／foes 存伺服端回傳的完整物件（含名稱、圖、技能狀態），原樣送回。 */
export interface BattleCore<U = Record<string, unknown>, F = Record<string, unknown>> {
  board: Board; magic: MagicGrid; team: U[]; foes: F[]; move: number; attackBoost: number; treasureGuard: number;
}
/** 只影響畫面的資訊（目標、主攻選擇、累計傷害、動作序號）；不進簽章，竄改也不影響戰力。 */
export interface BattleUi { target: number; chosen: Record<string, string>; totalDmg: number; cardAttackKey: number; energyActionKey: number; treasureAction: number }
export interface BattleSessionToken { token: string; seq: number }
export interface BattleSnapshot { v: 1; owner: 'self' | 'guest'; meta: BattleMeta; core: BattleCore; session: BattleSessionToken; savedAt: number; ui: BattleUi }

export type BattleSessionErrorCode = 'disabled' | 'invalid' | 'tampered' | 'stale' | 'expired' | 'settled' | 'closed' | 'device' | 'not-finished' | 'unavailable' | 'lost' | 'rate-limited';
/** 錯誤碼 → 照實寫給玩家的話（繁體中文）。 */
export const BATTLE_SESSION_MESSAGES: Record<BattleSessionErrorCode, string> = {
  disabled: '戰局接回功能尚未開放。',
  invalid: '戰局資料格式不正確，伺服端拒絕記錄。',
  tampered: '這場戰局的紀錄和伺服端不一致（可能被修改過），不能接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。',
  stale: '伺服端已經記下比這個畫面更新的進度：可能是連線中斷時上一步其實已經送達，或別的分頁／裝置正在打這場。這一步沒有被記錄；請按「重新接回」載入伺服端最新的局面。',
  expired: '這場戰局已超過 24 小時沒有進度，不能再接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。',
  settled: '這場戰鬥已經結算過了，不會再記一次帳。',
  closed: '這場戰局已經記為落敗（輸掉或中途離開），不能再接回或出手，也不會發獎勵；勝場不變。',
  device: '這場戰局是在另一台裝置或瀏覽器開始的，這裡不能代打或結算。',
  'not-finished': '伺服端紀錄顯示敵方還沒有全部倒下，不能結算勝利。',
  unavailable: '伺服端目前沒有共用的戰局紀錄儲存，中途接回功能暫停。這一局改用一般模式：可以照常打、照常結算，但重新整理後會重開本關（不扣勝場）。',
  lost: '伺服端已經找不到這場的紀錄（伺服器重新啟動、換了一台，或紀錄已清除），無法確認這場打到哪裡，所以不能接回。這場不發獎勵、勝場不變；已為你準備新的一局。',
  'rate-limited': '送出的速度太快，伺服端暫時不接受。請稍等幾秒再試；盤面與生命都沒有變更。',
};

/** 物件鍵排序後的 JSON：同一份資料不論鍵的順序都得到同一字串（雜湊用）。undefined 欄位與 JSON 相同地略過。 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('invalid');
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) return '[' + value.map(v => v === undefined ? 'null' : canonicalJson(v)).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).filter(k => obj[k] !== undefined && typeof obj[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}

/** 回合請求裡的亂數種子：沿用 Match3Board 原式（開局種子 + 回合 × 2654435761）。伺服端用它核對，瀏覽器不能自選種子重抽補珠。 */
export const orbTurnSeed = (seed: number, move: number) => (seed + move * 2654435761) >>> 0;

type HpLike = { hp: number };
export function battleOutcome(core: Pick<BattleCore<HpLike, HpLike>, 'team' | 'foes'>): 'win' | 'lose' | null {
  if (core.foes.length && core.foes.every(f => f.hp <= 0)) return 'win';
  if (core.team.length && core.team.reduce((s, u) => s + Math.max(0, u.hp), 0) <= 0) return 'lose';
  return null;
}

/** 從瀏覽器回合請求取出核心（伺服端核對簽章用）。 */
export function coreFromTurnInput(p: { board: Board; magic: MagicGrid; team: unknown[]; foes: unknown[]; move: number; attackBoost: number; treasureGuard?: number }): BattleCore {
  return { board: p.board, magic: p.magic, team: p.team as Record<string, unknown>[], foes: p.foes as Record<string, unknown>[], move: p.move, attackBoost: p.attackBoost, treasureGuard: p.treasureGuard ?? 1 };
}

/**
 * 伺服端回合結果 → 下一個權威核心。必須和 Match3Board 套用結果的方式一模一樣（release／endStep、unleash、fireLinkWith、useTreasure）。
 * - 有效連珠：盤面＝res.board，雙方＝反擊後（counter），回合 +1，反攻倍率＝nextBoost，寶器防護＝nextTreasureGuard。
 * - 無效但非空的連線：盤面不變，雙方＝counter（回合起訖技能已結算），回合 +1，反攻倍率不變，寶器防護＝nextTreasureGuard。
 * - 能量技／連結攻擊：只改雙方，不算回合。
 * - 寶器：只改雙方與寶器防護，不算回合。
 */
export function nextCoreAfterOrbTurn(input: BattleCore & { path: Cell[] }, r: { res: { valid: boolean; board: Board; magic: MagicGrid }; counter: { team: unknown[]; foes: unknown[] }; nextBoost: number; nextTreasureGuard: number }): BattleCore {
  const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
  if (r.res.valid) return plain({ board: r.res.board, magic: r.res.magic, team: r.counter.team as Record<string, unknown>[], foes: r.counter.foes as Record<string, unknown>[], move: input.move + 1, attackBoost: r.nextBoost, treasureGuard: r.nextTreasureGuard });
  return plain({ board: input.board, magic: input.magic, team: r.counter.team as Record<string, unknown>[], foes: r.counter.foes as Record<string, unknown>[], move: input.move + 1, attackBoost: input.attackBoost, treasureGuard: r.nextTreasureGuard });
}
export function nextCoreAfterCardAttack(input: BattleCore, r: { team: unknown[]; foes: unknown[] }): BattleCore {
  return JSON.parse(JSON.stringify({ ...input, team: r.team, foes: r.foes }));
}
export function nextCoreAfterTreasure(input: BattleCore, r: { team: unknown[]; foes: unknown[]; guardScale: number }): BattleCore {
  return JSON.parse(JSON.stringify({ ...input, team: r.team, foes: r.foes, treasureGuard: r.guardScale }));
}
