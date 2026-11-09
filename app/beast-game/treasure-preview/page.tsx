import { notFound } from 'next/navigation';
import Match3Board from '@/components/battlefield/Match3Board';
import { emptyTreasureBook, grantTreasure, treasureCatalog } from '@/lib/beast-game/match3/treasures';
import { generateBoard, seededRng, emptyMagic, resolveDrag } from '@/lib/beast-game/match3';
import { ELEMENTS } from '@/lib/beast-game/elements';
import type { TurnInput } from '@/lib/beast-game/match3/resolve-turn';

export default function TreasurePreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const board = generateBoard(seededRng(1), 8, 7, true), magic = emptyMagic(board);
  const path = ELEMENTS.map((_, c) => ({ r:7,c }));
  let book = emptyTreasureBook();
  // Each sample is earned through the same five-shield grant function. No player storage is read or written.
  for (let i = 0; i < 5; i++) {
    path.forEach((p, j) => { board[p.r][p.c] = ELEMENTS[(i+j+1)%5]; magic[p.r][p.c] = 7; });
    const res = resolveDrag(board,path,seededRng(1001),magic,50,true,true,7);
    book = grantTreasure({ board,magic,path,mode:'hard45',actionId:'practice-'+i,treasures:book } as TurnInput,res).book;
  }
  return <main style={{maxWidth:600,margin:'auto'}}><div style={{fontSize:12,textAlign:'center'}}>工程試玩 · 五色盾牌測試樣本 · 不寫入玩家存檔</div><Match3Board seed={1001} mode="hard45" treasurePractice={{board,magic,book,catalog:treasureCatalog(book)}}/></main>;
}
