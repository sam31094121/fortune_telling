import type { Board, Cell } from './board';
import type { MagicGrid } from './drag';
import type { BeastElement } from '../elements';

/** A visible bent route for the next manual move; special beads never change. */
export function comebackBoard(board: Board, magic: MagicGrid, element: BeastElement, minimum: number): {board:Board;path:Cell[]} | null {
  const length=Math.max(3,Math.ceil(minimum));
  for(let row=0;row<board.length-1;row++)for(let col=0;col<=board[0].length-length;col++){
    const path=Array.from({length},(_,i)=>({r:row+i%2,c:col+i}));
    if(path.some(p=>magic[p.r][p.c]!==0))continue;
    const next=board.map(r=>r.slice());path.forEach(p=>{next[p.r][p.c]=element;});
    return {board:next,path};
  }
  return null;
}
