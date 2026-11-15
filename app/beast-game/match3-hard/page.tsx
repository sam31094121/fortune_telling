/** 寶珠戰・困難 5v5：56 顆寶珠（7×8）。同一套 Match3Board／規則，只換 config.MATCH3_MODES.hard45（數值【待平衡】）。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '五元素・神獸戰鬥（困難 5v5・56 顆）', robots: { index: false } };

export default function Match3HardPage() {
  // AUDIT-2 H8：頁面主內容地標（axe landmark-one-main）。用 role 而不是 <main>，避免套到全站 lx-cards.css 的 main 規則、改到外觀。
  return <div role="main"><Match3Entry mode="hard45" /></div>;
}
