/** 入口卡 → 正式神獸卡 5v5 三消（自選隊伍 → Match3Board）。舊 Match3Preview.tsx 保留未刪。 */
import Match3Entry from '@/components/battlefield/Match3TeamPicker';

export const metadata = { title: '寶珠戰・簡單（5v5・35 顆）', robots: { index: false } };

export default function Match3PreviewPage() {
  return <Match3Entry />;
}
