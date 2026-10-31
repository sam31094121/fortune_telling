/** 寶珠戰・困難 5v5：49 顆寶珠（7×7）。同一套 Match3Board／規則，只換 config.MATCH3_MODES.hard45（數值【待平衡】）。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '五元素・神獸戰鬥（困難 5v5・49 顆）', robots: { index: false } };

export default function Match3HardPage() {
  return <Match3Entry mode="hard45" />;
}
