import type { Metadata } from 'next';

/**
 * 組陣台自己的分享中繼資料。
 *
 * page.tsx 是 client component，不能匯出 metadata，所以放在這一層。
 * 沒有這個檔案時，瀏覽器分頁標題是站台通用的「☯ 太極命理 易經｜天地人智慧分析系統」——
 * 客戶開著好幾個分頁時，找不到哪一個是遊戲；分享出去別人也看不出點進來會得到什麼。
 *
 * 圖沿用站台既有的分享圖，不放沒驗證過的動態圖。
 */
export const metadata: Metadata = {
  title: '二十八宿・神獸決鬥｜六十張神獸卡，選三張入陣',
  description: '從六十張神獸卡挑三隻布陣，前鋒、中軍、後陣各自單挑，三戰兩勝。對手是電腦，勝負由後端算完才演出，動畫不決定結果。',
  alternates: { canonical: '/beast-game' },
  openGraph: {
    title: '二十八宿・神獸決鬥',
    description: '六十張神獸卡，選三張入陣，三局單挑定勝負。',
    url: '/beast-game',
    type: 'article',
    locale: 'zh_TW',
    images: [{ url: '/images/og-taichi-preview.jpg', width: 1024, height: 1024, alt: '二十八宿・神獸決鬥' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '二十八宿・神獸決鬥',
    description: '六十張神獸卡，選三張入陣，三局單挑定勝負。',
    images: ['/images/og-taichi-preview.jpg'],
  },
};

export default function BeastGameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
