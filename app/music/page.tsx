import { cookies } from 'next/headers';
import { DUAL_COOKIE, validSession } from '@/lib/dual-chart-auth';
import PasswordGate from '@/components/PasswordGate';
import { LOCKED_CARDS } from '@/lib/locked-cards';
import MusicClient from './MusicClient';

/**
 * 人格音樂（生成一首歌）：上鎖卡片。沒有輸入密碼就只看到密碼畫面，輸入後直接進去。
 * 密碼與「易經神煞」同一組；它用到的三支 API 也同樣上鎖。清單與做法見 lib/locked-cards.ts。
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function MusicPage() {
  const jar = await cookies();
  if (!validSession(jar.get(DUAL_COOKIE)?.value)) {
    const card = LOCKED_CARDS.find((item) => item.route === '/music');
    return <PasswordGate title={card?.title ?? '輸入密碼，開啟人格音樂'} />;
  }
  return <MusicClient />;
}
