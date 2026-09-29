import { cookies } from 'next/headers';
import { DUAL_COOKIE, validSession } from '@/lib/dual-chart-auth';
import SingleShensha from './SingleShensha';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function SingleShenShaPage() {
  const jar = await cookies();
  return <SingleShensha unlocked={validSession(jar.get(DUAL_COOKIE)?.value)} />;
}
