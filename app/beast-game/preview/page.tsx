import { notFound } from 'next/navigation';
import { playableCards, getCard, buildLineup, createRng, playSeries } from '@/lib/beast-game';
import Preview from './Preview';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const sweep = (await searchParams).scenario === 'sweep';
  const ids = playableCards().map((card) => card.id);
  for (let seed = 0; seed < 1000; seed++) {
    const rng = createRng(seed);
    const player = buildLineup(ids, rng), opponent = buildLineup(ids, rng);
    const result = playSeries(player, opponent, seed);
    const tied = result.pairs[1].score.player === 1 && result.pairs[1].score.opponent === 1;
    if (sweep ? tied : !tied) continue;
    const map = (id: string) => { const card = getCard(id)!; return { id, name: card.name, element: card.element, thumbnail: card.art.thumbnail }; };
    return <Preview player={player.map(map)} opponent={opponent.map(map)} pairs={result.pairs} />;
  }
  return <p>演示資料尚未就緒</p>;
}
