'use client';

/**
 * 頁面背景配音掛載點（不渲染任何畫面）。
 * 進頁即嘗試播放；瀏覽器擋自動播放時，由 site-bgm 在第一次點擊／觸控／按鍵時開始。
 * 離開頁面（元件卸載）即淡出停止。
 */
import { useEffect } from 'react';
import { acquireBgm, releaseBgm, type BgmTrackId } from './site-bgm';

export default function PageBgm({ track, owner }: { track: BgmTrackId; owner: string }) {
  useEffect(() => {
    acquireBgm(track, owner);
    return () => releaseBgm(track, owner);
  }, [track, owner]);
  return null;
}
