/** 寶珠戰・困難 II（提案名）：9×5、可斜連、數值同 hard45【待平衡】，只換敵方五隻（enemies.ts HARD2_ENEMY_NAMES）。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '寶珠戰・困難 II（5v5・45 顆・可斜連）', robots: { index: false } };

export default function Match3Hard2Page() {
  return <Match3Entry mode="hard45b" />;
}
