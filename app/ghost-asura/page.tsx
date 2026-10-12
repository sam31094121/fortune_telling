/**
 * 鬼魅阿修羅 — 獨立解盤頁（080-16）
 *
 * 上鎖卡片：與「易經神煞」同一組密碼，沒輸入就只看到密碼畫面。清單與做法見 lib/locked-cards.ts。
 */

import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { DUAL_COOKIE, gateConfigured, validSession } from '@/lib/dual-chart-auth';
import PasswordGate from '@/components/PasswordGate';
import { LOCKED_CARDS } from '@/lib/locked-cards';
import GhostAsuraPageClient from './GhostAsuraPageClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: { absolute: '鬼魅阿修羅｜阿修羅秘卷' },
  description: '以四柱對應印記，展開阿修羅秘卷與文化反思。',
};

export default async function GhostAsuraPage() {
  const jar = await cookies();
  if (!validSession(jar.get(DUAL_COOKIE)?.value)) {
    const card = LOCKED_CARDS.find((item) => item.route === '/ghost-asura');
    return <PasswordGate title={card?.title ?? '輸入密碼，開啟鬼魅阿修羅'} />;
  }
  return <GhostAsuraPageClient unlocked={true} configured={gateConfigured()} />;
}
