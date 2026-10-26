'use client';

/**
 * 白虎等有戰鬥動畫的神獸：這一局「要不要播、從何時開始播」的判斷（選卡列與戰場共用同一份）。
 *
 * 只在「這一局剛收到新戰報、玩家主戰有動畫、出了傷害招式、且沒開減少動態」時播。
 * 動畫不決定結果：何時播取自戰報（isDamagingAction），播多久是固定常數；本檔不算任何戰鬥數值。
 */

import { useEffect, useState } from 'react';
import { COMBAT_BEAT_MS, isDamagingAction } from '@/lib/beast-game/combat-presentation';
import { rigFor, type BeastRig } from '@/lib/beast-game/beast-rig';
import type { Match } from '@/lib/beast-game/interactive';

export interface RigStrikeState {
  /** 目前主戰的動畫；主戰沒有動畫時為 null */
  rig: BeastRig | null;
  /** 隊伍裡任何一隻有動畫的神獸（用來提早載入素材）；沒有時為 null */
  teamRig: BeastRig | null;
  /** 這一局是否要播出擊動畫 */
  strike: boolean;
  /** 這次出擊在戰報裡的起跑延遲（毫秒），與卡片衝鋒的 --action-delay 同一份 */
  delayMs: number;
  /** 每次出擊換一個數字（戰局 revision）；不播時為 null */
  playKey: number | null;
}

export function useRigStrike(match: Match | null, playing: boolean): RigStrikeState {
  const [reduced, setReduced] = useState(false);
  const [playStartRevision, setPlayStartRevision] = useState<number | null>(null);
  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  // 剛開始演出時（還沒收到新戰報）先記下當時的 revision，之後 revision 變了才算「收到新戰報」
  useEffect(() => { setPlayStartRevision(playing ? (match?.revision ?? 0) : null); }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const fighter = match?.player.team[match.player.active];
  const rig = fighter ? rigFor(fighter.cardId) : null;
  const teamRig = rig ?? match?.player.team.map((f) => rigFor(f.cardId)).find(Boolean) ?? null;
  const strike = Boolean(match && rig && !reduced && playing && playStartRevision !== null
    && match.revision !== playStartRevision && match.revision > 0 && isDamagingAction(match, 'player'));
  const delayMs = match && fighter
    ? Math.max(0, match.log.findIndex((entry) => entry.side === 'player' && entry.cardId === fighter.cardId)) * COMBAT_BEAT_MS
    : 0;
  return { rig, teamRig, strike, delayMs, playKey: strike && match ? match.revision : null };
}
