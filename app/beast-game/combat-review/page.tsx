import { notFound } from 'next/navigation';
import { interactiveCatalog } from '@/lib/beast-game/interactive';
import { buildGuideBook } from '@/lib/beast-game/guide-book';
import CombatReview from './review';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CombatReview cards={interactiveCatalog()} book={buildGuideBook()} />;
}
