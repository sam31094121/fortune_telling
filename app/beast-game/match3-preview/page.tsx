/** 入口卡 → 正式神獸卡 5v5 三消（自選隊伍 → Match3Board）。舊 Match3Preview.tsx 保留未刪。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '五元素・神獸戰鬥（5v5）', robots: { index: false } };

export default function Match3PreviewPage() {
  return <Match3Entry />;
}
