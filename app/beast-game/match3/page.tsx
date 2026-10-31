/** 舊寶珠網址退役：書籤一律進入目前唯一的困難寶珠版本。 */
import { permanentRedirect } from 'next/navigation';

export const metadata = { title: '寶珠戰鬥｜神獸戰鬥', robots: { index: false } };

export default function Match3Page() {
  permanentRedirect('/beast-game/match3-hard');
}
