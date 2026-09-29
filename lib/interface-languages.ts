export const interfaceLanguages = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko'] as const;
export type InterfaceLanguage = typeof interfaceLanguages[number];
export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return interfaceLanguages.some(language => language === value);
}
export const interfaceCopy = {
  'zh-Hant': {
    more: '更多探索（可稍後）', less: '收合更多探索', deeper: '深入命盤', explore: '繼續探索',
    language: '閱讀語言', scope: '目前切換首頁易經神煞入口與導覽提示；其他內容保留原文。',
    dual: '易經神煞', systems: '八字 × 紫微斗數 × 易經卜卦',
    description: '一份出生資料，查看三層命盤。以易經為綱、神煞為用，融會貫通。可切換彩色／黑白 A4 預覽與下載。',
    password: '需使用已取得的進入密碼', enter: '輸入密碼，開啟易經神煞 →',
    single: '鬼魅阿修羅', singleSystems: '八字 × 特星神煞 × 易經心理學',
    singleDescription: '個人命盤解讀。以易經為綱、神煞為用，單人視角深入探索命理。支援彩色／黑白 A4 預覽下載。',
    singlePassword: '需使用已取得的進入密碼', singleEnter: '查看鬼魅阿修羅 →',
  },
  'zh-Hans': {
    more: '更多探索（可稍后）', less: '收起更多探索', deeper: '深入命盘', explore: '继续探索',
    language: '阅读语言', scope: '目前切换首页易经神煞入口与导航提示；其他内容保留原文。',
    dual: '易经神煞', systems: '八字 × 紫微斗数 × 易经卜卦',
    description: '一份出生资料，查看三层命盘。以易经为纲、神煞为用，融会贯通。可切换彩色／黑白 A4 预览与下载。',
    password: '需使用已取得的访问密码', enter: '输入密码，打开易经神煞 →',
    single: '鬼魅阿修罗', singleSystems: '八字 × 特星神煞 × 易经心理学',
    singleDescription: '个人命盘解读。以易经为纲、神煞为用，单人视角深入探索命理。支持彩色／黑白 A4 预览下载。',
    singlePassword: '需使用已取得的访问密码', singleEnter: '查看鬼魅阿修罗 →',
  },
  en: {
    more: 'Explore more', less: 'Show fewer features', deeper: 'Explore your charts', explore: 'Keep exploring',
    language: 'Reading language', scope: 'Currently translates the home I-Ching ShenSha entry and this guide. Other content remains in its original language.',
    dual: 'I-Ching ShenSha', systems: 'Ba Zi × Zi Wei Dou Shu × I-Ching Divination',
    description: 'Use one set of birth details to view three integrated charts. I-Ching as framework, ShenSha as application. Preview or download in color or black and white on A4.',
    password: 'Your existing access password is required.', enter: 'Enter password to view ShenSha →',
    single: 'Ghostly Asura', singleSystems: 'Ba Zi × ShenSha × I-Ching Psychology',
    singleDescription: 'Personal chart reading. I-Ching as framework, ShenSha as application. Explore your destiny from an individual perspective. Preview or download in color or black and white on A4.',
    singlePassword: 'Your existing access password is required.', singleEnter: 'View Ghostly Asura →',
  },
  ko: {
    more: '더 보기', less: '접기', deeper: '명반 자세히 보기', explore: '계속 둘러보기',
    language: '표시 언어', scope: '현재는 홈의 이경신살 입구와 이 안내만 번역됩니다. 다른 내용은 원문으로 표시됩니다.',
    dual: '이경신살', systems: '사주팔자 × 자미두수 × 이경점술',
    description: '한 번 입력한 출생 정보로 세 가지 명반을 확인하세요. 이경을 체계로, 신살을 응용으로 합니다. 컬러 또는 흑백 A4 미리보기와 다운로드를 지원합니다.',
    password: '발급받은 접속 비밀번호가 필요합니다.', enter: '비밀번호를 입력하여 신살 보기 →',
    single: '귀신 아수라', singleSystems: '사주팔자 × 신살 × 이경심리학',
    singleDescription: '개인 명반 해석. 이경을 체계로, 신살을 응용으로 합니다. 개인의 관점에서 명리를 깊이 있게 탐색하세요. 컬러 또는 흑백 A4 미리보기와 다운로드를 지원합니다.',
    singlePassword: '발급받은 접속 비밀번호가 필요합니다.', singleEnter: '귀신 아수라 보기 →',
  },
  ja: {
    more: 'もっと見る', less: '折りたたむ', deeper: '命盤を詳しく見る', explore: 'さらに探索',
    language: '表示言語', scope: '現在はホームの易経神殺入口とこの案内のみ切り替わります。その他の内容は原文で表示されます。',
    dual: '易経神殺', systems: '八字 × 紫微斗数 × 易経占卜',
    description: '一組の出生情報から3種類の命盤を確認できます。易経を枠組みとし、神殺を応用とします。カラー・白黒のA4プレビューとダウンロードに対応しています。',
    password: '取得済みのアクセスパスワードが必要です。', enter: 'パスワードを入力して神殺を開く →',
    single: 'ゴーストリーアスラ', singleSystems: '八字 × 特星神殺 × 易経心理学',
    singleDescription: '個人の命盤解釈。易経を枠組みとし、神殺を応用とします。個人の視点から運命を深く探索します。カラー・白黒のA4プレビューとダウンロードに対応しています。',
    singlePassword: '取得済みのアクセスパスワードが必要です。', singleEnter: 'ゴーストリーアスラを見る →',
  },
} satisfies Record<InterfaceLanguage, Record<string, string>>;
