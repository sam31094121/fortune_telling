/**
 * 鬼魅阿修羅 — 獨立解盤頁（080-16）
 *
 * 與紫色 /dual-chart 共用密碼閘，但本頁只渲染阿修羅解盤卡。
 */

import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { DUAL_COOKIE, gateConfigured, validSession } from '@/lib/dual-chart-auth';
import GhostAsuraPageClient from './GhostAsuraPageClient';
import PageBgm from '@/components/audio/PageBgm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: { absolute: '鬼魅阿修羅｜阿修羅秘卷' },
  description: '以四柱對應印記，展開阿修羅秘卷與文化反思。',
};

export default async function GhostAsuraPage() {
  return (
    <>
      {/* 阿修羅戰鼓 v2（3 分鐘無縫循環）：進頁播放，被擋時第一次點擊開始；不顯示任何音訊介面 */}
      <PageBgm track="asura" owner="asura-page" />
      <GhostAsuraPageClient
        unlocked={true}
        configured={true}
      />
    </>
  );
}
