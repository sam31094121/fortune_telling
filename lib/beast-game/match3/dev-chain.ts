/**
 * 開發用捷徑：把起始盤面換成「17 顆盾牌連線」（從左上角往下、往右、再往上，共 17 格），
 * 其餘流程（選主角、選夥伴、開戰、落珠、結算）都走真實路徑。
 * 只在 NODE_ENV=development 才會被呼叫，見 app/api/beast-game/orb-guest/route.ts。
 */
import type { TurnInput } from './resolve-turn';

export const DEV_CHAIN_CELLS: ReadonlyArray<readonly [number, number]> = [
  ...Array.from({ length: 8 }, (_, r) => [r, 0] as const),
  ...Array.from({ length: 6 }, (_, i) => [7, i + 1] as const),
  ...[6, 5, 4].map(r => [r, 6] as const),
];

export function withDevChain17(initial: TurnInput): TurnInput {
  const element = initial.team[0]?.element;
  if (!element) return initial;
  const board = initial.board.map(row => row.slice());
  const magic = initial.magic.map(row => row.slice());
  for (const [r, c] of DEV_CHAIN_CELLS) { board[r][c] = element; magic[r][c] = 7; }
  return { ...initial, board, magic };
}
