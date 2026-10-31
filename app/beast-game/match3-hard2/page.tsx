/** 舊網址相容：寶珠對外統一使用困難入口。 */
import { redirect } from 'next/navigation';

export const metadata = { title: '寶珠戰・困難', robots: { index: false } };

export default function Match3Hard2Page() {
  redirect('/beast-game/match3-hard');
}
