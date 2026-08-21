'use client';

import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiCoreProps = {
  step24?: number;
  onCoreClick?: () => void;
};

/**
 * 圖騰不再自行計算 24 響；只讀 TaijiSystem 的旅程步數。
 * 這避免第 13 層後外層深場繼續、內層圖騰卻停在舊步數的斷層。
 */
export default function TaijiCore({ step24 = 0, onCoreClick }: TaijiCoreProps) {
  return <UnifiedTaijiCore step24={step24} onCoreClick={onCoreClick} active />;
}
