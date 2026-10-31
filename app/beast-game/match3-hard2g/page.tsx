/** 寶珠戰・困難・戰鬥寶珠（hard49g）：困難 II 延伸——7×7＝49 顆、可斜連、四象魔法珠、精簡戰鬥畫面（說明收進「說明」面板）。數值沿用 hard45b【待平衡】。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '戰鬥寶珠（困難・7×7・四象魔法珠）', robots: { index: false } };

export default function Match3Hard2GuardianPage() {
  return <Match3Entry mode="hard49g" />;
}
