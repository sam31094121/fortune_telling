import { randomUUID } from 'node:crypto';
import { sealGuestOrb } from '@/lib/beast-game/guest-orb';
import { initialSharedOrb } from '@/lib/beast-game/cultivation-orb-state';
import { newCampaign, campaignCardAttack } from '@/lib/beast-game/match3/hard-campaign';
import { notFound } from 'next/navigation';
import Match3Board from '@/components/battlefield/Match3Board';
import { emptyTreasureBook, grantTreasure, treasureCatalog } from '@/lib/beast-game/match3/treasures';
import { generateBoard, seededRng, emptyMagic, resolveDrag } from '@/lib/beast-game/match3';
import { playableCards } from '@/lib/beast-game/registry';
import { ELEMENTS, type BeastElement } from '@/lib/beast-game/elements';
import type { TurnInput } from '@/lib/beast-game/match3/resolve-turn';

export default async function TreasurePreview({searchParams}: {searchParams: Promise<{element?:string;copies?:string;chain?:string}>}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const query = await searchParams;
  const element: BeastElement = ELEMENTS.includes(query.element as BeastElement) ? query.element as BeastElement : 'WATER';
  const copies = query.copies === '2' ? 2 : 5;
  const pool = playableCards().slice().sort((a,b)=>Number(b.form==='ADULT')-Number(a.form==='ADULT'));
  const selected = [...pool.filter(c=>c.element===element).slice(0,copies),...ELEMENTS.filter(e=>e!==element).slice(0,5-copies).map(e=>pool.find(c=>c.element===e)!)];
  const team = selected.map(c=>({id:c.id,element:c.element,hp:1}));
  const board = generateBoard(seededRng(1), 8, 7, true), magic = emptyMagic(board);
  const book = emptyTreasureBook();
  for(let r=0;r<8;r++){board[r][0]=element;magic[r][0]=7;}
  ELEMENTS.forEach((e,c)=>{board[7][c+2]=e;magic[7][c+2]=7;});
  // ?chain=17：真實試玩 17 顆盾牌連線（從 (0,0) 往下、往右、再往上，共 17 格）→ 後端算出 256 顆落珠。
  const chain = query.chain === '17';
  if (chain) {
    const cells = [...Array.from({length:8},(_,r)=>[r,0]),...Array.from({length:6},(_,i)=>[7,i+1]),...[6,5,4].map(r=>[r,6])];
    for (const [r,c] of cells) { board[r][c]=element; magic[r][c]=7; }
  }
  // Dev-only fixture is signed on the server; it never grants a campaign reward.
  const profile={...newCampaign(),teamIds:selected.map(c=>c.id)};
  const stats=Object.fromEntries(selected.map(c=>[c.id,campaignCardAttack(profile,c.id)]));
  const initial={...initialSharedOrb({...profile,shared:{availableIds:profile.teamIds,cards:[],stats,selectedEntries:[]}},1001,'hard45'),board,magic,treasures:book};
  const id=randomUUID(),start={initial,guestBattleId:id,guestVersion:0,guestBattleToken:sealGuestOrb({kind:'battle',practice:true,id,version:0,seed:1001,input:initial,profile})};
  return <main style={{maxWidth:600,margin:'auto'}}><div style={{fontSize:12,textAlign:'center'}}>工程試玩 · 空庫存／同色4至8盾取得法寶 · 不寫入玩家存檔{chain ? ' · 17 顆盾牌連線：從左上角往下、往右、再往上連到底' : ''}</div><Match3Board teamIds={selected.map(c=>c.id)} seed={1001} mode="hard45" treasurePractice={{start,board,magic,book,catalog:treasureCatalog(book,team),scenario:element+':'+copies}}/></main>;
}
