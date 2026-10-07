import { handleHomeTrustRead } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return handleHomeTrustRead();
}
