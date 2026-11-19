/** Game-only prediction. Never credits inventory, HP, outcomes or saved progress. */
import { resolveDrag, type MagicGrid } from './drag';
import { seededRng, type Board, type Cell } from './board';
import { buildOrbReplay, type OrbReplayFrame } from './replay';

export function predictOrbBoard(board: Board, magic: MagicGrid, path: Cell[], seed: number, diagonal: boolean, minimum: number) {
  const result = resolveDrag(board, path, seededRng(seed), magic, 50, diagonal, true, minimum);
  return { result, replay: buildOrbReplay(board, magic, path, result, diagonal) };
}

/** Compare all visible board facts, not an untrusted client success flag. */
export function predictionMatches(prediction: ReturnType<typeof predictOrbBoard>, replay: OrbReplayFrame[]) {
  return JSON.stringify(prediction.replay) === JSON.stringify(replay);
}
