export const interfaceLanguages = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko'] as const;
export type InterfaceLanguage = typeof interfaceLanguages[number];
export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return interfaceLanguages.some(language => language === value);
}
export const interfaceCopy = {
  'zh-Hant': {
    more: '更多探索（可稍後）', less: '收合更多探索', deeper: '深入命盤', explore: '繼續探索',
    language: '閱讀語言', scope: '目前切換首頁雙命盤入口與導覽提示；其他內容保留原文。',
    dual: '雙命盤', systems: '八字 × 紫微斗數',
    description: '一份出生資料，查看兩張命盤。可切換彩色／黑白 A4 預覽與下載。',
    password: '需使用已取得的進入密碼', enter: '輸入密碼，開啟雙命盤 →',
  },
  'zh-Hans': {
    more: '更多探索（可稍后）', less: '收起更多探索', deeper: '深入命盘', explore: '继续探索',
    language: '阅读语言', scope: '目前切换首页双命盘入口与导航提示；其他内容保留原文。',
    dual: '双命盘', systems: '八字 × 紫微斗数',
    description: '一份出生资料，查看两张命盘。可切换彩色／黑白 A4 预览与下载。',
    password: '需使用已取得的访问密码', enter: '输入密码，打开双命盘 →',
  },
  en: {
    more: 'Explore more', less: 'Show fewer features', deeper: 'Explore your charts', explore: 'Keep exploring',
    language: 'Reading language', scope: 'Currently translates the home dual-chart entry and this guide. Other content remains in its original language.',
    dual: 'Two birth charts', systems: 'Ba Zi × Zi Wei Dou Shu',
    description: 'Use one set of birth details to view both charts. Preview or download in color or black and white on A4.',
    password: 'Your existing access password is required.', enter: 'Enter password to view charts →',
  },
  ko: {
    more: '더 보기', less: '접기', deeper: '명반 자세히 보기', explore: '계속 둘러보기',
    language: '표시 언어', scope: '현재는 홈의 명반 입구와 이 안내만 번역됩니다. 다른 내용은 원문으로 표시됩니다.',
    dual: '두 가지 명반', systems: '사주팔자 × 자미두수',
    description: '한 번 입력한 출생 정보로 두 가지 명반을 확인하세요. 컬러 또는 흑백 A4 미리보기와 다운로드를 지원합니다.',
    password: '발급받은 접속 비밀번호가 필요합니다.', enter: '비밀번호를 입력하여 명반 보기 →',
  },
  ja: {
    more: 'もっと見る', less: '折りたたむ', deeper: '命盤を詳しく見る', explore: 'さらに探索',
    language: '表示言語', scope: '現在はホームの命盤入口とこの案内のみ切り替わります。その他の内容は原文で表示されます。',
    dual: '2種類の命盤', systems: '八字 × 紫微斗数',
    description: '一組の出生情報から2種類の命盤を確認できます。カラー・白黒のA4プレビューとダウンロードに対応しています。',
    password: '取得済みのアクセスパスワードが必要です。', enter: 'パスワードを入力して命盤を開く →',
  },
} satisfies Record<InterfaceLanguage, Record<string, string>>;
