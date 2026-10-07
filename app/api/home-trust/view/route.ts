import { NextRequest } from 'next/server';
import { handleHomeTrustIncrement } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return handleHomeTrustIncrement('view', request);
}
