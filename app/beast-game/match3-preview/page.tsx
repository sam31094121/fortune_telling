/** 舊簡單寶珠入口退役；保留網址相容，統一進入新版。 */
import { permanentRedirect } from 'next/navigation';

export const metadata = { title: '寶珠戰・困難', robots: { index: false } };

export default function Match3PreviewPage() {
  permanentRedirect('/beast-game/match3-hard');
}
