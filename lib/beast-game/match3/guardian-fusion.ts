/**
 * 寶石捷連線・四象合體（純視覺，不改任何傷害）
 * ============================================================================
 * 主角四象（青龍・朱雀・白虎・玄武）與牠自己統領的星宿（二十八宿歸屬沿用 beast-guardians.ts 的 guardianOf，
 * 不另立對照表），在「同一步」或「緊接的下一步」都實際打出傷害時，判定為一次四象合體。
 *
 * 只吃伺服端已確認的實際命中（actualHits 的 amount > 0），不吃預估值；
 * 回傳的只是「誰和誰合體」的事實，畫面據此播特效。傷害、能量、回合、反擊一律不變。
 */
import { GUARDIANS, guardianOf, type GuardianKey } from '../../beast-guardians';
import type { BeastElement } from '../elements';

export interface GuardianFusion {
  key: GuardianKey;
  /** 簡稱（白虎、朱雀…），用於「白虎合體」印記。 */
  short: string;
  element: BeastElement;
  /** 四象本尊在隊伍裡的卡片 id。 */
  coreId: string;
  /** 一起出手的本象星宿（隊伍順序）。 */
  memberIds: string[];
}

export interface FusionUnit { id: string; hp: number }
export interface FusionHit { attackerId?: string | null; amount: number }

/** 印記簡稱：沿用卡面與玩家口語（青龍，不用「蒼龍」）。 */
export const GUARDIAN_SHORT: Record<GuardianKey, string> = { QINGLONG: '青龍', ZHUQUE: '朱雀', BAIHU: '白虎', XUANWU: '玄武' };

/** 特效顯示時間（毫秒）。只影響畫面，不影響回合鎖定。 */
export const GUARDIAN_FUSION_MS = 1400;

/** 隊伍裡每一位四象本尊（依 GUARDIANS 順序），以及同隊的本象星宿。沒有本尊就沒有合體。 */
export function guardianLineups(team: readonly FusionUnit[]) {
  return GUARDIANS.flatMap(g => {
    const core = team.find(u => u.id === g.cardId);
    if (!core) return [];
    const members = team.filter(u => u.id !== g.cardId && guardianOf(u.id)?.key === g.key).map(u => u.id);
    return [{ guardian: g, coreId: core.id, members }];
  });
}

/** 實際打出傷害的出手者（去重、保留順序）。 */
export function fusionStrikers(hits: readonly FusionHit[]): string[] {
  return [...new Set(hits.filter(h => h.attackerId && h.amount > 0).map(h => h.attackerId as string))];
}

/**
 * 判定本步的四象合體。
 * @param current 本步實際打出傷害的卡（fusionStrikers）。
 * @param carried 上一步留下、尚未合體的出手者（接續合體用；合體後由呼叫端清空）。
 * 規則：本尊與至少一位本象星宿都在 current ∪ carried 裡，且其中至少一位在本步出手（避免同一筆舊紀錄重播），
 * 本尊與參與的星宿此刻都還活著。
 */
export function guardianFusions(team: readonly FusionUnit[], current: readonly string[], carried: readonly string[] = []): GuardianFusion[] {
  if (!current.length) return [];
  const alive = new Set(team.filter(u => u.hp > 0).map(u => u.id));
  const struck = new Set([...current, ...carried].filter(id => alive.has(id)));
  const now = new Set(current);
  return guardianLineups(team).flatMap(({ guardian, coreId, members }) => {
    if (!struck.has(coreId)) return [];
    const memberIds = members.filter(id => struck.has(id));
    if (!memberIds.length) return [];
    if (!now.has(coreId) && !memberIds.some(id => now.has(id))) return [];
    return [{ key: guardian.key, short: GUARDIAN_SHORT[guardian.key], element: guardian.element, coreId, memberIds }];
  });
}

/** 下一步可接續的出手者：本步有合體就清空（一次只算一次），否則只留本步（窗口＝緊接的兩步）。 */
export function nextFusionCarry(current: readonly string[], fused: readonly GuardianFusion[]): string[] {
  return fused.length ? [] : [...current];
}

/**
 * 合體判定的跨步狀態。
 * move＝第幾次拖珠（每次連珠結算＋1；之後由它帶出的連線攻擊、能量技都算同一次拖珠）。
 * quietThrough＝合體冷卻到第幾次拖珠為止（含）；-1＝不冷卻。
 * carry＝上一步留下、尚未合體的出手者。
 */
export interface GuardianFusionState { carry: string[]; move: number; quietThrough: number }
export const GUARDIAN_FUSION_START: GuardianFusionState = Object.freeze({ carry: [], move: 0, quietThrough: -1 }) as GuardianFusionState;

/**
 * 一步一呼叫（連珠、能量技、連線攻擊各算一步；連珠那一步傳 newMove=true）。
 * 冷卻以「拖珠」計：合體那次拖珠剩下的步驟（例如它帶出的自動連線攻擊）＋緊接的下一次拖珠（含它帶出的連線、能量技）都不合體，
 * 冷卻中的出手者也不累積；再下一次拖珠恢復正常判定。玩家看到的就是「連續兩次拖珠不會都亮合體印」。
 */
export function stepGuardianFusion(team: readonly FusionUnit[], current: readonly string[], state: GuardianFusionState = GUARDIAN_FUSION_START, newMove = false): { fusions: GuardianFusion[]; state: GuardianFusionState } {
  const move = state.move + (newMove ? 1 : 0);
  if (move <= state.quietThrough) return { fusions: [], state: { carry: [], move, quietThrough: state.quietThrough } };
  const fusions = guardianFusions(team, current, state.carry);
  return { fusions, state: { carry: nextFusionCarry(current, fusions), move, quietThrough: fusions.length ? move + 1 : state.quietThrough } };
}

/** 給說明與無障礙文字用：「白虎合體：西方白虎＋奎木狼」。 */
export function guardianFusionLabel(f: GuardianFusion, nameOf: (id: string) => string | undefined): string {
  return `${f.short}合體：${[f.coreId, ...f.memberIds].map(id => nameOf(id) ?? '隊友').join('＋')}（僅特效，不加傷害）`;
}

/** 合體印彈出時的最大放大倍率（與 components/battlefield/GuardianFusionTrace.module.css 的 gfSeal 關鍵影格 22% 的 1.08 一致）。 */
export const GUARDIAN_SEAL_PEAK = 1.08;
/** 印的中心在本尊卡的 68% 高度（卡內下段）。 */
export const GUARDIAN_SEAL_Y = 0.18;
/**
 * 合體印縮放係數：讓「最大放大那一格」也完整落在本尊卡內（左右、上下各留 2px）。
 * sealW/sealH 是未縮放的印尺寸（offsetWidth/offsetHeight，不受 transform 影響）。
 */
export function guardianSealFit(card: { w: number; h: number }, seal: { w: number; h: number }, peak = GUARDIAN_SEAL_PEAK, pad = 2): number {
  if (!(seal.w > 0) || !(seal.h > 0) || !(card.w > 0) || !(card.h > 0)) return 1;
  const halfRoomY = card.h * (0.5 - GUARDIAN_SEAL_Y) - pad; // 印中心到卡底的距離（比到卡頂近）
  const fit = Math.min(1, (card.w - pad * 2) / (seal.w * peak), (halfRoomY * 2) / (seal.h * peak));
  return Math.floor(fit * 1000) / 1000; // 只往下取整：寧可小一點，也不出框
}
