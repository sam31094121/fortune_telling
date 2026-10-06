import { handleHomeTrustRead } from '@/lib/home-trust-counters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/home-trust
 * 讀取目前的正式數字（唯一來源是資料庫）。
 * 回應：{ ok, agreeCount, disagreeCount, viewCount, source: 'database' | 'floor' }
 */
export async function GET() {
  return handleHomeTrustRead();
}
