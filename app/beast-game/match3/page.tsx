/** 神獸戰隊 v0.8｜寶珠戰鬥（獨立入口；旗標 NEXT_PUBLIC_BEAST_MATCH3=1 才開，預設關閉）。先自選五張卡再開戰。 */
import { notFound } from 'next/navigation';
import BeadBattle from '@/components/battlefield/bead/BeadBattle';
import { isMatch3Enabled } from '@/lib/beast-game/match3/config';

/** 旗標在執行期讀取（不在 build 時預先產生 404），預設仍關閉。 */
export const dynamic = 'force-dynamic';

export const metadata = { title: '寶珠戰鬥｜神獸戰鬥', robots: { index: false } };

export default function Match3Page() {
  if (!isMatch3Enabled()) notFound();
  return <BeadBattle />;
}
