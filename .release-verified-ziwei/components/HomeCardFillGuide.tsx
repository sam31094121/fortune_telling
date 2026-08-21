export type HomeGuideModule =
  | 'tarot'
  | 'number'
  | 'ziwei'
  | 'match'
  | 'music'
  | 'nameology'
  | 'bazi'
  | 'zodiac';

const HOME_FILL_GUIDES: Record<HomeGuideModule, { title: string; fields: string[]; example: string }> = {
  tarot: {
    title: '填寫：問題一句話',
    fields: ['選分類', '輸入問題', '抽牌'],
    example: '例：我現在最需要看清楚的是什麼？',
  },
  number: {
    title: '填寫：阿拉伯數字',
    fields: ['4/6/8/10 碼', '只輸入 0-9', '立即判定'],
    example: '例：1688、8888、0912345678',
  },
  ziwei: {
    title: '填寫：姓名＋生日＋時辰',
    fields: ['姓名', '出生日期', '血型/性別/時辰'],
    example: '例：林佩君，1979-09-02，寅時',
  },
  match: {
    title: '填寫：兩個人的資料',
    fields: ['A 姓名生日', 'A 時辰', 'B 姓名生日'],
    example: '一步一步填，不用一次看完。',
  },
  music: {
    title: '填寫：人生主題＋基本資料',
    fields: ['歌曲目標', '音樂風格', '姓名生日'],
    example: '例：把現在的心情唱成一首歌。',
  },
  nameology: {
    title: '填寫：完整姓名',
    fields: ['姓名', '生日', '血型/性別'],
    example: '例：王小明，至少 2 個字。',
  },
  bazi: {
    title: '填寫：出生年月日地點',
    fields: ['姓名', '生日', '性別/時辰', '出生地'],
    example: '例：台灣、台北、寅時。',
  },
  zodiac: {
    title: '填寫：西元出生日期',
    fields: ['生日必填', '時間可選', '城市可選'],
    example: '例：1979-09-02，可先只算太陽星座。',
  },
};

type HomeCardFillGuideProps = {
  module: HomeGuideModule;
};

export default function HomeCardFillGuide({ module }: HomeCardFillGuideProps) {
  const guide = HOME_FILL_GUIDES[module];

  return (
    <div className="home-card-fill-guide" aria-label={`${guide.title}，${guide.example}`}>
      <strong>{guide.title}</strong>
      <span>{guide.fields.join(' / ')}</span>
      <small>{guide.example}</small>
    </div>
  );
}
