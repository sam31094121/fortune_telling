/** 神獸戰隊 v0.8｜中等模式三消（獨立入口；旗標 NEXT_PUBLIC_BEAST_MATCH3=1 才開，預設關閉）。 */
import { notFound } from 'next/navigation';
import Match3Entry from '@/components/battlefield/Match3TeamPicker';
import { isMatch3Enabled } from '@/lib/beast-game/match3/config';

/** 旗標在執行期讀取（不在 build 時預先產生 404），預設仍關閉。 */
export const dynamic = 'force-dynamic';

export const metadata = { title: '五元素三消｜神獸戰鬥', robots: { index: false } };

export default function Match3Page() {
  if (!isMatch3Enabled()) notFound();
  return <Match3Entry />;
}
