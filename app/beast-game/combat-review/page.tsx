import { notFound } from 'next/navigation';
import { combatReviewPageData } from '@/lib/server/beast-review';
import CombatReview from './review';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CombatReview {...combatReviewPageData()} />;
}
