'use client';
/**
 * v4 防掉幀：單格寶珠，以 React.memo 包住，props 全是原始值（布林、數字、字串）。
 * 拖曳時只有「進入／離開路徑」的那一兩格會重畫，不再整盤 42 顆一起重畫。
 */
import { memo, type CSSProperties } from 'react';
import type { BeastElement } from '@/lib/beast-game/elements';
import { MATCH3_ORB_LABEL } from '@/lib/beast-game/match3';
import styles from '../Match3Board.module.css';
import { BeadOrb } from './BeadOrb';
import bp from './BeadPolish.module.css';

export interface BoardCellProps {
  r: number; c: number; e: BeastElement; color: string; mp: number;
  sel: boolean; pop: boolean; shake: boolean; fall: boolean; order: number;
}

function BoardCellImpl({ r, c, e, color, mp, sel, pop, shake, fall, order }: BoardCellProps) {
  const cls = [styles.orb, bp.cell, sel ? bp.sel : '', pop ? bp.pop : '', shake ? styles.shake : '', fall ? bp.fall : '', mp > 0 ? bp.magicCell : ''].join(' ');
  const style = { ['--el' as string]: color, ['--i' as string]: order, ['--row' as string]: r } as CSSProperties;
  return (
    <div role="gridcell" data-r={r} data-c={c} data-el={e} data-magic={mp || undefined} className={cls} style={style}
      aria-label={`${MATCH3_ORB_LABEL[e]}${mp ? `魔法珠威力${mp}` : '珠'}`}>
      <BeadOrb el={e} magicPower={mp} shimmerDelay={((r * 7 + c * 3) * 211) % 7000} />
    </div>
  );
}

export const BoardCell = memo(BoardCellImpl);