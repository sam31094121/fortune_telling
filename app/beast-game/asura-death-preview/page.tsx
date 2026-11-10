import { notFound } from 'next/navigation';
import { asuraDeathPreviewEnabled } from '@/lib/beast-game/match3/asura-death-preview-gate';
import AsuraDeathPreview from './AsuraDeathPreview';
/** 執行時判斷開關（正式環境預設 404；ASURA_DEATH_PREVIEW=1 才開）。 */
export const dynamic = 'force-dynamic';
export const metadata = { title: '阿修羅死亡動畫整合預覽', robots: { index: false, follow: false } };
export default function Page() {
  if (!asuraDeathPreviewEnabled()) notFound();
  return <AsuraDeathPreview />;
}