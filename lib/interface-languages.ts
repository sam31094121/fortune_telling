export const interfaceLanguages = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko'] as const;
export type InterfaceLanguage = typeof interfaceLanguages[number];
export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return interfaceLanguages.some(language => language === value);
}
/** 2026-10-17 language card：BCP 47 語言標記，給 <html lang> 與各選項的 lang 用（台灣／中國／美國／日本／韓國）。 */
export const interfaceLanguageTags: Record<InterfaceLanguage, string> = {
  'zh-Hant': 'zh-Hant', 'zh-Hans': 'zh-Hans', en: 'en-US', ja: 'ja', ko: 'ko',
};
// 2026-10-17 language card：scope＝卡片下方看得到的翻譯範圍說明（r2：簡中改由 I18nDisplayLayer 全頁自動轉換，說明同步更新）；disclaimer＝一般性免責提醒（不是正式法律條款）。
export const interfaceCopy = {
  'zh-Hant': {
    more: '更多探索（可稍後）', less: '收合更多探索', deeper: '深入命盤', explore: '繼續探索',
    language: '閱讀語言', scope: '本站原文為繁體中文。簡體中文由系統自動轉換全站字形與常用詞（不是逐句人工翻譯）。英文、日文、韓文已翻譯首頁大部分文字；其他頁面只翻譯一部分，未翻譯的內容（包含命盤解讀）保留繁體中文原文。',
    disclaimer: '本站內容僅供文化參考與娛樂，不構成醫療、法律或投資建議。',
    dual: '易經神煞', systems: '八字 × 紫微斗數 × 易經卜卦',
    description: '一份出生資料，查看三層命盤。以易經為綱、神煞為用，融會貫通。可切換彩色／黑白 A4 預覽與下載。',
    password: '需使用已取得的進入密碼', enter: '輸入密碼，開啟易經神煞 →',
    single: '鬼魅阿修羅', singleSystems: '八字 × 特星神煞 × 易經心理學',
    singleDescription: '個人命盤解讀。以易經為綱、神煞為用，單人視角深入探索命理。支援彩色／黑白 A4 預覽下載。',
    singlePassword: '需使用已取得的進入密碼', singleEnter: '查看鬼魅阿修羅 →',
  },
  'zh-Hans': {
    more: '更多探索（可稍后）', less: '收起更多探索', deeper: '深入命盘', explore: '继续探索',
    language: '阅读语言', scope: '本站原文为繁体中文。简体中文由系统自动转换全站字形与常用词，并非逐句人工翻译；如有出入，以繁体中文原文为准。',
    disclaimer: '本站内容仅供文化参考与娱乐，不构成医疗、法律或投资建议。',
    dual: '易经神煞', systems: '八字 × 紫微斗数 × 易经卜卦',
    description: '一份出生资料，查看三层命盘。以易经为纲、神煞为用，融会贯通。可切换彩色／黑白 A4 预览与下载。',
    password: '需使用已取得的访问密码', enter: '输入密码，打开易经神煞 →',
    single: '鬼魅阿修罗', singleSystems: '八字 × 特星神煞 × 易经心理学',
    singleDescription: '个人命盘解读。以易经为纲、神煞为用，单人视角深入探索命理。支持彩色／黑白 A4 预览下载。',
    singlePassword: '需使用已取得的访问密码', singleEnter: '查看鬼魅阿修罗 →',
  },
  en: {
    more: 'Explore more', less: 'Show less', deeper: 'Explore your charts', explore: 'Keep exploring',
    language: 'Reading language', scope: 'This site is written in Traditional Chinese. Most of the home page is now in English; other pages are only partly translated, and anything not yet translated (including chart readings) stays in the original Traditional Chinese.',
    disclaimer: 'Content on this site is for cultural reference and entertainment only and is not medical, legal, or investment advice.',
    dual: 'I Ching Shen Sha', systems: 'Ba Zi × Zi Wei Dou Shu × I Ching Divination',
    description: 'Use one set of birth details to view three integrated charts. The I Ching is the framework, and Shen Sha is how it is applied. Preview or download in color or black and white on A4.',
    password: 'Your existing access password is required.', enter: 'Enter password to view Shen Sha →',
    single: 'Ghostly Asura', singleSystems: 'Ba Zi × Shen Sha × I Ching Psychology',
    singleDescription: 'Personal chart reading. The I Ching is the framework, and Shen Sha is how it is applied. Explore your destiny from an individual perspective. Preview or download in color or black and white on A4.',
    singlePassword: 'Your existing access password is required.', singleEnter: 'View Ghostly Asura →',
  },
  ko: {
    more: '더 보기', less: '접기', deeper: '명반 자세히 보기', explore: '계속 둘러보기',
    language: '표시 언어', scope: '이 사이트의 원문은 번체 중국어입니다. 홈 화면은 대부분 한국어로 번역되었으며, 다른 페이지는 일부만 번역되어 있습니다. 번역되지 않은 내용(명반 해석 포함)은 번체 중국어 원문으로 표시됩니다.',
    disclaimer: '본 사이트의 내용은 문화적 참고 및 오락 목적으로만 제공되며, 의료·법률·투자 조언이 아닙니다.',
    dual: '주역신살', systems: '사주팔자 × 자미두수 × 주역점',
    description: '한 번 입력한 출생 정보로 세 가지 명반을 확인하세요. 주역을 바탕으로 하고 신살로 풀이합니다. 컬러 또는 흑백 A4 미리보기와 다운로드를 지원합니다.',
    password: '발급받은 접속 비밀번호가 필요합니다.', enter: '비밀번호를 입력하여 신살 보기 →',
    single: '귀신 아수라', singleSystems: '사주팔자 × 신살 × 주역 심리학',
    singleDescription: '개인 명반을 해석합니다. 주역을 바탕으로 하고 신살로 풀이합니다. 개인의 관점에서 명리를 깊이 있게 탐색하세요. 컬러 또는 흑백 A4 미리보기와 다운로드를 지원합니다.',
    singlePassword: '발급받은 접속 비밀번호가 필요합니다.', singleEnter: '귀신 아수라 보기 →',
  },
  ja: {
    more: 'もっと見る', less: '折りたたむ', deeper: '命盤を詳しく見る', explore: 'さらに探索',
    language: '表示言語', scope: 'このサイトの原文は繁体字中国語です。ホーム画面の大部分は日本語に翻訳済みですが、その他のページは一部のみの翻訳です。未翻訳の内容（命盤の解釈を含む）は繁体字中国語の原文のまま表示されます。',
    disclaimer: '当サイトの内容は文化的な参考および娯楽を目的としたものであり、医療・法律・投資に関する助言ではありません。',
    dual: '易経神殺', systems: '八字 × 紫微斗数 × 易占',
    description: '一度の出生情報入力で、3種類の命盤をまとめて確認できます。易経を軸に、神殺を用いて読み解きます。カラー・白黒のA4プレビューとダウンロードに対応しています。',
    password: '発行済みのアクセスパスワードが必要です。', enter: 'パスワードを入力して易経神殺を開く →',
    single: '鬼魅阿修羅', singleSystems: '八字 × 特星神殺 × 易経心理学',
    singleDescription: '個人向けの命盤解読です。易経を軸に、神殺を用いて読み解き、ひとりの視点から命理を深く掘り下げます。カラー・白黒のA4プレビューとダウンロードに対応しています。',
    singlePassword: '発行済みのアクセスパスワードが必要です。', singleEnter: '鬼魅阿修羅を見る →',
  },
} satisfies Record<InterfaceLanguage, Record<string, string>>;
