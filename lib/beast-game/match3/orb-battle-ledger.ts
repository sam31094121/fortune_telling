/**
 * PLAN-v2 A6｜伺服端戰局紀錄（只在伺服端載入：使用 node:crypto）。
 *
 * 做法：
 * 1. 開局（start）：伺服端核對開局數值範圍後發 battleId 與第 0 號簽章收據。收據內含「戰局身分＋核心雜湊＋回合序號＋裝置」。
 * 2. 每一步（orb-turn 帶 session）：瀏覽器送來的核心必須和上一張收據的雜湊完全相同，序號必須是伺服端記得的最新一號；
 *    算完後用「比對後寫入」發下一號收據與新的權威核心。改血量、改盤面、改關卡、重放舊回合，雜湊或序號都會對不上 → 拒絕。
 * 3. 接回（resume）：重新整理後拿本機快照來核對；若伺服端已經多走了一步（重整時回合剛好送出），直接回伺服端最新核心。
 * 4. 結算（settle）：只有伺服端紀錄顯示敵方全滅才發勝利收據；同一場只記一次，別台裝置不能代結。
 *
 * AUDIT-2 第三輪（fix-3）的安全預設：
 * ‧ 紀錄一律經過 BattleLedgerStore（battle-ledger-store.ts）。內建只有記憶體儲存；正式環境沒有共用儲存＋金鑰時
 *   battleLedgerReadiness() 不通過 → 全部回 'unavailable'（503），前端改走一般模式，不會誤傷玩家（X1、X2）。
 * ‧ 不再「本機沒有紀錄就從收據重建」：找不到紀錄一律回 'lost'（照實說紀錄不見了，不說成被竄改），
 *   所以換一台伺服器或重啟後，舊收據不能拿來逃輸局或重放（X3）。
 * ‧ 正式環境沒有設定 M3_BATTLE_SECRET 時拒絕簽章，不再默默用每個行程不同的亂數金鑰（X1）。
 * ‧ 同一 actionId、同一份請求的重送直接回上一次的結果（冪等），不會被判成 stale（H4）。
 */
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { BATTLE_RESUME_MODES, BATTLE_RESUME_POLICY, battleOutcome, canonicalJson, type BattleCore, type BattleMeta, type BattleSessionErrorCode, type BattleSessionToken } from './battle-resume';
import { battleLedgerReadiness, secretConfigured, type BattleLedgerEntry, type BattleLedgerStore } from './battle-ledger-store';
import { isBeastElement } from '../elements';
import { getCard, playableCards } from '../registry';
import { CARD_FACE_STATS } from '../card-face-stats';
import { progressionLineupStats } from './progression';
import { FEED_CHAIN_RULES } from './feed-chain';
import { tierAttackCap } from './merge-tier';

export class BattleSessionError extends Error {
  constructor(public code: BattleSessionErrorCode) { super(code); }
}
const fail = (code: BattleSessionErrorCode): never => { throw new BattleSessionError(code); };

interface Payload { v: 1; b: string; s: number; h: string; d: string; w: number; m: string; sd: number; r: string; st: number; t: number }
type Entry = BattleLedgerEntry;
type G = typeof globalThis & { __m3BattleSecret?: Buffer };
const g = globalThis as G;
const STORE_OPTS = { max: BATTLE_RESUME_POLICY.ledgerMax, ttlMs: BATTLE_RESUME_POLICY.expireMs * 2 };

function secret(): Buffer {
  const env = process.env.M3_BATTLE_SECRET;
  if (secretConfigured()) return Buffer.from(env as string, 'utf8');
  // 正式環境一定要設定共用金鑰；不默默用亂數（多執行個體會互相判成竄改）。
  if (process.env.NODE_ENV === 'production') return fail('unavailable');
  // 開發／測試：每個行程隨機產生（行程重啟後舊收據全部失效＝安全地作廢）。
  return (g.__m3BattleSecret ??= randomBytes(32));
}
/** 取得可用的儲存；正式環境沒有共用儲存＋金鑰時丟 'unavailable'。 */
export function battleStore(): BattleLedgerStore {
  const r = battleLedgerReadiness(STORE_OPTS);
  if (!r.ok) return fail('unavailable');
  return r.store;
}
/** 給 API 與健康檢查用：照實回報能不能啟用，以及原因。 */
export function battleLedgerStatus() { const r = battleLedgerReadiness(STORE_OPTS); if (r.ok === true) return { ok: true as const, mode: r.mode }; return { ok: false as const, reason: (r as Extract<typeof r, { ok: false }>).reason }; }
/** 測試用：模擬伺服器重啟（清除記憶體紀錄；可選擇換金鑰）。 */
export async function __resetBattleLedgerForTest(opts: { rotateSecret?: boolean } = {}) { await battleStore().clear?.(); if (opts.rotateSecret) g.__m3BattleSecret = randomBytes(32); }

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
export function hashBattleCore(meta: BattleMeta, core: BattleCore): string {
  return createHash('sha256').update(canonicalJson({ meta, core })).digest('base64url');
}
function sign(p: Payload): string {
  const body = b64(JSON.stringify(p));
  return body + '.' + b64(createHmac('sha256', secret()).update(body).digest());
}
function decode(token: unknown): Payload {
  if (typeof token !== 'string' || token.length > 2000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) fail('tampered');
  const [body, mac] = (token as string).split('.');
  const want = createHmac('sha256', secret()).update(body).digest(), got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) fail('tampered');
  let p: Payload;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return fail('tampered'); }
  if (!p || p.v !== 1 || typeof p.b !== 'string' || !Number.isSafeInteger(p.s) || typeof p.h !== 'string') fail('tampered');
  return p;
}
const deviceOk = (d: unknown): d is string => typeof d === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(d);
function makeEntry(meta: BattleMeta, core: BattleCore, seq: number, device: string, startAt: number, now: number, status: Entry['status'] = 'open'): Entry {
  const token = sign({ v: 1, b: meta.battleId, s: seq, h: hashBattleCore(meta, core), d: device, w: meta.wins, m: meta.mode, sd: meta.seed, r: meta.rule, st: startAt, t: now });
  return { meta, core: JSON.parse(JSON.stringify(core)), seq, token, device, startAt, lastAt: now, status };
}

const int = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
function validMeta(m: Partial<BattleMeta>): asserts m is BattleMeta {
  if (!m || typeof m !== 'object' || !(BATTLE_RESUME_MODES as readonly string[]).includes(m.mode as string) || !int(m.wins, 0, 1_000_000) || !int(m.seed, 0, 4294967295) || !['tap-lead', 'first-attacks', 'all-attack'].includes(m.rule as string)) fail('invalid');
}
function validCoreShape(c: BattleCore) {
  if (!c || typeof c !== 'object' || !Array.isArray(c.board) || c.board.length !== 8 || c.board.some(r => !Array.isArray(r) || r.length !== 7 || r.some(e => !isBeastElement(e)))) fail('invalid');
  if (!Array.isArray(c.magic) || c.magic.length !== 8 || c.magic.some(r => !Array.isArray(r) || r.length !== 7 || r.some(n => !int(n, 0, 1_000_000)))) fail('invalid');
  if (!Array.isArray(c.team) || c.team.length !== 5 || !Array.isArray(c.foes) || c.foes.length !== 5 || !int(c.move, 0, 1_000_000) || ![1, 1.5].includes(c.attackBoost) || ![1, 0.5].includes(c.treasureGuard)) fail('invalid');
  if (canonicalJson(c).length > BATTLE_RESUME_POLICY.maxSnapshotChars) fail('invalid');
}

type Fighter = { id: string; element: string; hp: number; maxHp: number; attack: number; energy?: number };
/**
 * 開局只能是「剛開打」的樣子：回合 0、盤面沒有魔法珠、雙方滿血；敵方數值必須等於關卡公式。
 * 我方（AUDIT-2 M1）：攻擊在「卡面」與「卡面＋跨層級天花板 tierAttackCap」之間（成獸不超過同方位四大神獸）；
 * 每張開局能量 ≤ cardEnergyCap，全隊合計 ≤ teamEnergyCap。
 * 誠實限制：伺服端不知道玩家真正的勝場與強化（進度在瀏覽器，見 DECISION-persistence），所以只能擋「不可能的數字」，擋不住「範圍內的虛報」。
 */
export function validateBattleStart(meta: BattleMeta, core: BattleCore) {
  validMeta(meta); validCoreShape(core);
  if (core.move !== 0 || core.attackBoost !== 1 || core.treasureGuard !== 1 || core.magic.some(r => r.some(n => n !== 0))) fail('invalid');
  const team = core.team as unknown as Fighter[], foes = core.foes as unknown as Fighter[];
  if (new Set(team.map(u => u.id)).size !== 5 || new Set(foes.map(f => f.id)).size !== 5) fail('invalid');
  let teamEnergy = 0;
  for (const u of team) {
    const card = getCard(u.id), face = CARD_FACE_STATS[u.id];
    if (!card || !face || card.element !== u.element || u.hp !== face.hp || u.maxHp !== face.hp || !int(u.attack, face.attack, face.attack + tierAttackCap(u.id)) || !int(u.energy, 0, FEED_CHAIN_RULES.cardEnergyCap)) fail('invalid');
    teamEnergy += u.energy as number;
  }
  if (teamEnergy > FEED_CHAIN_RULES.teamEnergyCap) fail('invalid');
  const pool = playableCards().filter(c => CARD_FACE_STATS[c.id]);
  const cards = foes.map(f => getCard(f.id));
  if (cards.some((c, i) => !c || c.element !== foes[i].element)) fail('invalid');
  let expected: ReturnType<typeof progressionLineupStats>;
  try { expected = progressionLineupStats(cards as NonNullable<typeof cards[number]>[], meta.wins, pool); } catch { return fail('invalid'); }
  foes.forEach((f, i) => { if (f.hp !== expected[i].hp || f.maxHp !== expected[i].maxHp || f.attack !== expected[i].attack) fail('invalid'); });
}

export async function startBattle(input: { meta: Omit<BattleMeta, 'battleId'>; core: BattleCore; device: unknown; now?: number }): Promise<{ meta: BattleMeta; session: BattleSessionToken }> {
  const store = battleStore();
  const now = input.now ?? Date.now();
  if (!deviceOk(input.device)) fail('invalid');
  const meta = { ...input.meta, battleId: randomUUID() } as BattleMeta;
  validateBattleStart(meta, input.core);
  const entry = makeEntry(meta, input.core, 0, input.device as string, now, now);
  if (!(await store.put(entry, null))) fail('invalid');
  return { meta, session: { token: entry.token, seq: 0 } };
}

/** 驗證簽章、裝置、戰局身分、核心雜湊與期限（不碰儲存）。 */
function verifyToken(token: unknown, meta: BattleMeta, core: BattleCore, device: unknown, now: number): Payload {
  validMeta(meta); validCoreShape(core);
  const p = decode(token);
  if (!deviceOk(device) || p.d !== device) fail('device');
  if (p.b !== meta.battleId || p.w !== meta.wins || p.m !== meta.mode || p.sd !== meta.seed || p.r !== meta.rule) fail('tampered');
  if (p.h !== hashBattleCore(meta, core)) fail('tampered');
  if (now - p.t > BATTLE_RESUME_POLICY.expireMs) fail('expired');
  return p;
}
/** 找紀錄。找不到＝'lost'（不從收據重建：換台或重啟後的舊收據不能用來逃輸局或重放）。 */
async function loadEntry(store: BattleLedgerStore, p: Payload): Promise<Entry> {
  const entry = await store.get(p.b);
  if (!entry) return fail('lost');
  if (entry.device !== p.d) fail('device');
  return entry;
}
function checkLatest(entry: Entry, p: Payload, token: unknown, allow: { settled?: boolean } = {}) {
  if (entry.status === 'closed') fail('closed');
  if (entry.status !== 'open' && !(allow.settled && entry.status === 'settled')) fail('settled');
  if (entry.seq !== p.s || entry.token !== token) fail('stale');
}

type TurnOut<R> = { result: R; nextCore: BattleCore; session: BattleSessionToken; replayed?: boolean };
/**
 * 回合：核對 → 計算 → 比對後寫入下一號收據。compute 丟錯時不前進序號。
 * requestKey（actionId＋請求內容的雜湊）相同的重送：伺服端已經記下這一步時，直接回上一次的結果（replayed: true）。
 */
export async function runBattleTurn<R>(input: { token: unknown; meta: BattleMeta; core: BattleCore; device: unknown; now?: number; requestKey?: string }, compute: () => { result: R; nextCore: BattleCore }): Promise<TurnOut<R>> {
  const store = battleStore();
  const now = input.now ?? Date.now();
  const p = verifyToken(input.token, input.meta, input.core, input.device, now);
  const entry = await loadEntry(store, p);
  const replay = () => {
    const last = entry.last;
    if (input.requestKey && last && last.requestKey === input.requestKey && last.fromSeq === p.s && entry.seq === p.s + 1 && entry.status !== 'closed') return { ...(last.response as TurnOut<R>), replayed: true };
    return null;
  };
  const cached = replay(); if (cached) return cached;
  checkLatest(entry, p, input.token);
  if (battleOutcome(input.core as BattleCore<{ hp: number }, { hp: number }>)) fail('settled');
  const { result, nextCore } = compute();
  const next = makeEntry(entry.meta, nextCore, p.s + 1, p.d, p.st, now);
  const out: TurnOut<R> = { result, nextCore: next.core, session: { token: next.token, seq: next.seq } };
  if (input.requestKey) next.last = { requestKey: input.requestKey, fromSeq: p.s, response: out };
  if (!(await store.put(next, { seq: entry.seq, status: entry.status }))) {
    // 同時有另一個請求搶先寫入：若那正是同一份請求的重送，回它的結果；否則照實回 stale。
    const now2 = await store.get(p.b);
    const l = now2?.last;
    if (input.requestKey && now2 && l && l.requestKey === input.requestKey && l.fromSeq === p.s && now2.seq === p.s + 1) return { ...(l.response as TurnOut<R>), replayed: true };
    return fail('stale');
  }
  return out;
}

/** 接回：簽章、裝置、雜湊、期限都要對；伺服端若已多走一步，回伺服端最新核心（advanced）。 */
export async function resumeBattle(input: { token: unknown; meta: BattleMeta; core: BattleCore; device: unknown; now?: number }): Promise<{ meta: BattleMeta; core: BattleCore; session: BattleSessionToken; advanced: boolean }> {
  const store = battleStore();
  const now = input.now ?? Date.now();
  const p = verifyToken(input.token, input.meta, input.core, input.device, now);
  const entry = await loadEntry(store, p);
  if (entry.status === 'closed') fail('closed');
  if (entry.status === 'settled') return { meta: entry.meta, core: entry.core, session: { token: entry.token, seq: entry.seq }, advanced: entry.seq !== p.s };
  if (entry.seq < p.s) fail('tampered');
  if (now - entry.lastAt > BATTLE_RESUME_POLICY.expireMs) fail('expired');
  return { meta: entry.meta, core: entry.core, session: { token: entry.token, seq: entry.seq }, advanced: entry.seq !== p.s };
}

/** 勝利結算：伺服端核心必須敵方全滅；同一場只發一次（同一裝置重送＝重複，不再記帳）。 */
export async function settleBattle(input: { token: unknown; meta: BattleMeta; core: BattleCore; device: unknown; now?: number }): Promise<{ battleId: string; wins: number; duplicate: boolean }> {
  const store = battleStore();
  const now = input.now ?? Date.now();
  const p = verifyToken(input.token, input.meta, input.core, input.device, now);
  const entry = await loadEntry(store, p);
  checkLatest(entry, p, input.token, { settled: true });
  if (battleOutcome(entry.core as BattleCore<{ hp: number }, { hp: number }>) !== 'win') fail('not-finished');
  if (entry.status === 'settled') return { battleId: entry.meta.battleId, wins: entry.meta.wins, duplicate: true };
  const ok = await store.put({ ...entry, status: 'settled', lastAt: now }, { seq: entry.seq, status: 'open' });
  if (!ok) { const again = await store.get(p.b); if (again?.status === 'settled') return { battleId: entry.meta.battleId, wins: entry.meta.wins, duplicate: true }; fail('stale'); }
  return { battleId: entry.meta.battleId, wins: entry.meta.wins, duplicate: false };
}

/** 落敗或放棄：關閉這場，之後任何回合、接回、結算都會被拒絕。 */
export async function closeBattle(input: { token: unknown; meta: BattleMeta; core: BattleCore; device: unknown; now?: number }): Promise<{ battleId: string; outcome: 'lose' | 'forfeit' }> {
  const store = battleStore();
  const now = input.now ?? Date.now();
  const p = verifyToken(input.token, input.meta, input.core, input.device, now);
  const entry = await loadEntry(store, p);
  checkLatest(entry, p, input.token);
  const result = battleOutcome(entry.core as BattleCore<{ hp: number }, { hp: number }>);
  if (result === 'win') fail('not-finished');
  if (!(await store.put({ ...entry, status: 'closed', lastAt: now }, { seq: entry.seq, status: 'open' }))) fail('stale');
  return { battleId: entry.meta.battleId, outcome: result === 'lose' ? 'lose' : 'forfeit' };
}
