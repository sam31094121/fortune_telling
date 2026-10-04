/**
 * 鬼魅阿修羅 — 獨立解盤頁（080-16）
 *
 * 與紫色 /dual-chart 共用密碼閘，但本頁只渲染阿修羅解盤卡。
 */

import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { DUAL_COOKIE, gateConfigured, validSession } from '@/lib/dual-chart-auth';
import GhostAsuraPageClient from './GhostAsuraPageClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: { absolute: '鬼魅阿修羅｜阿修羅秘卷' },
  description: '以四柱對應印記，展開阿修羅秘卷與文化反思。',
};

export default async function GhostAsuraPage() {
  const jar = await cookies();
  return (
    <GhostAsuraPageClient
      unlocked={validSession(jar.get(DUAL_COOKIE)?.value)}
      configured={gateConfigured()}
    />
  );
}
