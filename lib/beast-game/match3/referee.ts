/**
 * 寶石捷連線「裁判」：前端先演、後端判決（棒球比喻：球員先動作，裁判當場判）。
 * 前端只送「我演的這一場長什麼樣」的指紋（claim）；後端用自己算的權威結果比對，
 * 回 PASS（演得對，維持）或 FOUL（演錯，恢復原盤、改播後端版本）。
 * 判決只決定「前端先演的動畫留不留」，不碰傷害、獎勵、掉珠——那些永遠只由後端結算。
 * 指紋是一致性檢查，不是防作弊簽章：作弊防線是後端權威結算本身。
 */
import type { OrbReplayFrame } from './replay';

export type RefereeVerdict = 'PASS' | 'FOUL' | 'NO_CLAIM';
export type RefereeAction = 'KEEP_ANIMATION' | 'RESTORE_AND_REPLAY' | 'PLAY_SERVER';
export interface RefereeRuling {
  verdict: RefereeVerdict;
  action: RefereeAction;
  reason: string;
  serverDigest: string;
  claimDigest: string | null;
}

/** FNV-1a 32 位元，輸出定長十六進位；同內容必同指紋。 */
export function digestOf(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).padStart(8, '0') + text.length.toString(16);
}

export const replayDigest = (replay: OrbReplayFrame[]) => digestOf(replay);

/** 後端判決：claim 為前端先演那場的指紋；沒送＝不是預演（直接播後端版）。 */
export function judgeClaim(serverReplay: OrbReplayFrame[], claim?: unknown): RefereeRuling {
  const serverDigest = replayDigest(serverReplay);
  if (typeof claim !== 'string' || !/^[0-9a-f]{9,16}$/.test(claim)) {
    return { verdict: 'NO_CLAIM', action: 'PLAY_SERVER', reason: '前端沒有預演，直接播放後端確認的結果。', serverDigest, claimDigest: null };
  }
  if (claim === serverDigest) {
    return { verdict: 'PASS', action: 'KEEP_ANIMATION', reason: '前端演的跟後端算的逐格一致，維持畫面。', serverDigest, claimDigest: claim };
  }
  return { verdict: 'FOUL', action: 'RESTORE_AND_REPLAY', reason: '前端演的跟後端算的不同：恢復原盤，改播後端確認的結果。', serverDigest, claimDigest: claim };
}

/** 掛在後端回應上；只有帶 replay 的回合才有判決。 */
export function withReferee<T>(result: T, claim?: unknown): T & { referee?: RefereeRuling } {
  const replay = (result as { replay?: unknown } | null)?.replay;
  if (!Array.isArray(replay)) return result as T & { referee?: RefereeRuling };
  return { ...(result as object), referee: judgeClaim(replay as OrbReplayFrame[], claim) } as T & { referee?: RefereeRuling };
}
