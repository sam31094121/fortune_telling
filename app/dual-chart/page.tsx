import { cookies } from 'next/headers';
import { DUAL_COOKIE, gateConfigured, validSession } from '@/lib/dual-chart-auth';
import DualChart from './DualChart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function DualChartPage() {
  const jar = await cookies();
  return <DualChart unlocked={validSession(jar.get(DUAL_COOKIE)?.value)} configured={gateConfigured()} />;
}
