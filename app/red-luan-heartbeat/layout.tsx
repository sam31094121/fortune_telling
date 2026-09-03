import type { Metadata } from 'next';

/**
 * 這張卡自己的分享中繼資料。
 *
 * page.tsx 是 client component，不能匯出 metadata，所以放在這一層。
 * 沒有這個檔案時，分享出去顯示的是站台通用文案（「一站式命理智慧平台」），
 * 講的不是這張卡在講的事，對方看不出點進來會得到什麼。
 *
 * 圖沿用站台既有的分享圖。動態產生「你的月份」那種專屬預覽圖需要中文字型，
 * 專案裡沒有字型檔，向 Google Fonts 取子集的做法我無法在本機驗證成功，
 * 所以先不放沒驗證過的圖——文案本身已經把「點進來會得到什麼」講清楚了。
 */
export const metadata: Metadata = {
  title: '桃花・紅鸞心動｜算出你下一次紅鸞心動是哪個月',
  description: '用八字與紫微算出下一次紅鸞、天喜、桃花或貴人落在哪一個月，還有會跟你來電的是哪一型的人。不知道出生時辰也算得出來。',
  alternates: { canonical: '/red-luan-heartbeat' },
  openGraph: {
    title: '下一次紅鸞心動，是哪個月？',
    description: '八字＋紫微算出月份，易經起卦告訴你會碰到哪一型的人。',
    url: '/red-luan-heartbeat',
    type: 'article',
    locale: 'zh_TW',
    images: [{ url: '/images/og-taichi-preview.jpg', width: 1024, height: 1024, alt: '桃花・紅鸞心動' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '下一次紅鸞心動，是哪個月？',
    description: '八字＋紫微算出月份，易經起卦告訴你會碰到哪一型的人。',
    images: ['/images/og-taichi-preview.jpg'],
  },
};

export default function RedLuanHeartbeatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
