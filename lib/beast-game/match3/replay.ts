/** Server-owned replay facts. Rendering may measure cells, never discover matches. */
import type { Board, Cell } from './board';
import type { DragResult, MagicGrid } from './drag';
import { findRuns } from './match';
import { refillDisplaySteps } from './refill-presentation';
import { MATCH3_ORB_LABEL } from './config';

const key = (p: Cell) => p.r * 1000 + p.c;
export function buildOrbReplay(board: Board, magic: MagicGrid, path: readonly Cell[], result: DragResult, diagonal: boolean) {
  const steps = refillDisplaySteps(result);
  return steps.map((step, index) => {
    const before = index ? steps[index - 1].boardAfter : board;
    const magicBefore = index ? steps[index - 1].magicAfter : magic;
    const emptyBefore = index ? steps[index - 1].emptyCells ?? [] : [];
    const excluded = new Set(emptyBefore.map(key));
    magicBefore.forEach((row, r) => row.forEach((power, c) => { if (power >= 7) excluded.add(key({ r, c })); }));
    const runs = index ? findRuns(before, diagonal, excluded) : [];
    const groups = step.groups.map(group => {
      const cells = new Set(group.cells.map(key));
      const retained = group.cells.filter(p => !(step.clearedCells ?? group.cells).some(q => key(p) === key(q)));
      // A shield clear-all is an effect, not a made-up line through unrelated beads.
      const paths = index ? runs.filter(run => run.element === group.element && run.cells.every(p => cells.has(key(p)))).map(run => run.cells)
        : !result.shieldFusion && !result.magicTriggered.some(t => t.chain === 1 && t.power >= 7) ? [path.map(p => ({ ...p }))] : [];
      return { element: group.element, count: group.size, cells: group.cells, paths, retained,
        label: `${group.size} 顆`, description: `${MATCH3_ORB_LABEL[group.element]} ${group.size} 顆${retained.length ? `，保留 ${retained.length} 顆${step.rewards?.some(reward => reward.element === group.element && reward.power >= 7) ? '盾牌' : '數字珠'}` : ''}` };
    });
    return { ...step, boardBefore: before, magicBefore, emptyBefore, matches: groups,
      kind: index >= result.steps.length ? 'shuffle' as const : groups.length ? 'match' as const : 'refill' as const };
  });
}
export type OrbReplayFrame = ReturnType<typeof buildOrbReplay>[number];
