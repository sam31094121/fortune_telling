/**
 * 社群分享預覽（Open Graph / Twitter）的唯一來源。
 * 全站與各子頁面的 metadata 都從這裡取，要改圖或文案只改這一個檔案。
 * 換圖時記得同步更新 SHARE_IMAGE_VERSION，否則 Facebook、LINE 會繼續顯示快取的舊圖。
 */

export const SHARE_IMAGE_VERSION = '20261009-1';
export const SHARE_IMAGE = `/images/og-tiandiren.jpg?v=${SHARE_IMAGE_VERSION}`;
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;

/**
 * 凡是「交給別人的連結」（分享鈕、複製連結、LINE、系統分享面板）都要過這個函式，
 * 補上 ?v=版本號。LINE、Facebook 以「整串網址」當快取鍵：版本號一變，
 * 平台就把它當新連結重抓預覽，不會繼續顯示舊圖、舊文案。
 * 版本號與圖片共用 SHARE_IMAGE_VERSION，所以換圖時改一個常數，連結跟著換。
 * 原有的查詢參數與 # 片段會保留；網址已有 v 就覆蓋成最新版本。
 */
export function withShareVersion(url: string): string {
  if (!url) return url;
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = beforeHash.indexOf('?');
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const params = new URLSearchParams(queryAt >= 0 ? beforeHash.slice(queryAt + 1) : '');
  params.set('v', SHARE_IMAGE_VERSION);
  return `${path}?${params.toString()}${hash}`;
}

export const SHARE_TITLE = '所學所悟，隨緣分享｜天地人';
export const SHARE_DESCRIPTION =
  '累積、體會與淬鍊。智慧不獨享，因分享而流動，因傳承而延續。有緣得之。真心放進去，空間留給你。';
export const SHARE_IMAGE_ALT = '所學所悟，隨緣分享｜天地人';

/** 各頁 openGraph.images 共用的圖片描述。 */
export const SHARE_OG_IMAGES = [
  {
    url: SHARE_IMAGE,
    secureUrl: SHARE_IMAGE,
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    type: 'image/jpeg',
    alt: SHARE_IMAGE_ALT,
  },
];

export const SHARE_TWITTER_IMAGES = [SHARE_IMAGE];
