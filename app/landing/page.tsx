/**
 * 鬼魅阿修羅 - Landing Page
 * 首屏：預告片 + 品牌故事 + 行動號召
 */

import { Suspense } from 'react';
import LandingPageClient from './LandingPageClient';

export const metadata = {
  title: '鬼魅阿修羅 - 喚醒內在力量',
  description: '180秒儀式化視覺體驗，純粒子與光效的命理啟蒙',
};

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="bg-black h-screen" />}>
      <LandingPageClient />
    </Suspense>
  );
}
