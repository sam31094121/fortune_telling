/**
 * 鬼魅阿修羅｜「現在」與阿修羅頁的背景音（2026-11-25 用戶指定改為遠方純貓頭鷹叫聲 18 s 無縫循環；原 2026-11-22 戰鼓 v2 檔保留未刪）。
 * 實際播放交給全站背景音模組（components/audio/site-bgm.ts，曲目 'asura'）：
 * - 阿修羅頁（/ghost-asura）進頁就要求播放（頁面自己持有）；其他出現阿修羅卡的頁面，按「現在」展開才播、收起就放開。
 * - 同一時間只播一首、不疊放；離開頁面、分頁隱藏淡出停止；不看網站靜音設定；iOS audioSession=playback；界面不顯示任何音效資訊。
 * 純畫面層：不讀、不改任何阿修羅資料或運算。
 */
import { acquireBgm, primeBgm, releaseBgm } from '@/components/audio/site-bgm';

const NOW_TILE_OWNER = 'asura-now-tile';

/** 卡片出現後閒置時預載並解碼（不播放）。 */
export function primeAsuraNowSfx(): void {
  primeBgm('asura');
}

/** 使用者按「現在」展開時呼叫（點擊事件內）：要求播放阿修羅背景音（遠方貓頭鷹）；已在播就不重來。 */
export function playAsuraNowSfx(): void {
  acquireBgm('asura', NOW_TILE_OWNER);
}

/** 收起「現在」、切到別格、卸載或離開頁面時呼叫：放開「現在」的播放要求（阿修羅頁本身仍持有時繼續播）。 */
export function stopAsuraNowSfx(): void {
  releaseBgm('asura', NOW_TILE_OWNER);
}
