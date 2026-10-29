import { notFound } from 'next/navigation';
import { getCard, playableCards } from '@/lib/beast-game/registry';
import { playSeries } from '@/lib/beast-game/series';
import Preview from '../preview/Preview';

export const dynamic = 'force-dynamic';

/** Developer-only, real series engine; never reads or writes a customer's collection. */
export default async function RitualReview({ searchParams }: { searchParams: Promise<{ beast?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { beast } = await searchParams;
  const guardian = ['baihu', 'qinglong', 'zhuque', 'xuanwu'].includes(beast ?? '') ? beast! : 'baihu';
  const card = getCard(`beast_g_${guardian}`)!;
  const support = playableCards().filter(c => c.form !== 'GUARDIAN').sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id)).slice(0, 2);
  const player = [card, ...support];
  const opponent = [getCard('beast_g_baihu')!, ...support];
  const result = playSeries(player.map(c => c.id), opponent.map(c => c.id), 29);
  const show = (c: typeof card) => ({ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail });
  return <>
    <p>開發驗收・真實三局運算・不押卡、不改收藏</p>
    <nav>{['baihu', 'qinglong', 'zhuque', 'xuanwu'].map((id, index) => <a key={id} href={`?beast=${id}`} style={{ marginRight: 16 }}>{['白虎', '青龍', '朱雀', '玄武'][index]}</a>)}</nav>
    <Preview player={player.map(show)} opponent={opponent.map(show)} pairs={result.pairs} />
  </>;
}
