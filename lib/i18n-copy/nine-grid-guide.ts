/**
 * 洛書九宮（古籍版）引導話術：每個時刻一句，只說「為什麼會這樣」的機制與概念，不做任何個人解讀。
 * 每句的依據都在技能檔案 docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json（luoshu 段）
 * 與 lib/nine-grid-numbers.ts（luoshuSummary），不另編傳說。
 * 目前只有 zh-TW；zh-Hans／en／ja／ko 為 TODO（待五語翻譯流程）。
 */
export type NineGridGuideMoment = 'birthEntered' | 'awaken' | 'firstFlip' | 'pathLit' | 'allOpen';

export const NINE_GRID_GUIDE: Record<'zh-TW', Record<NineGridGuideMoment, { text: string; source: string }>> = {
  'zh-TW': {
    // lib/nine-grid-numbers.ts luoshuSummary：生日數字（0 不計）落在洛書各宮
    birthEntered: { text: '生日裡的每個數字（0 不計），等一下會各自落進洛書同號的那一宮。', source: 'lib/nine-grid-numbers.ts luoshuSummary（本站計數規則；0 不入宮沒有古籍依據，不寫成古籍說法）' },
    // 九宮格靈動數字.json luoshu.layout.note：《數術記遺》4 9 2／3 5 7／8 1 6
    awaken: { text: '亮起來的宮，是你生日數字落到的位置；九宮依《數術記遺》排成 4 9 2／3 5 7／8 1 6。', source: '九宮格靈動數字.json luoshu.layout.note；古籍：《數術記遺》「九宮算」條「二四為肩，六八為足，左三右七，戴九履一，五居中央」（S-SHUSHU-JIYI-WIKISOURCE，維基文庫 oldid=2026646，A 級）' },
    // 九宮格靈動數字.json luoshu.layout.sumRule
    firstFlip: { text: '每一行、每一列、兩條對角線，三個數加起來都是 15（這是算出來的，不是古籍原文）。', source: '九宮格靈動數字.json luoshu.layout.sumRule（檔案註明：算出來的事實，非古籍原文；依 S-SHUSHU-JIYI-WIKISOURCE 排法）' },
    // 九宮格靈動數字.json luoshu.orderNote：太乙行九宮
    pathLit: { text: '這條線照太乙行九宮的順序走：坎一、坤二、震三、巽四、中五、乾六、兌七、艮八、離九。', source: '九宮格靈動數字.json luoshu.orderNote；古籍：《管城碩記》卷二十七引鄭康成注《易乾鑿度》「太乙下行九宮從坎宮起…而離宮行則周矣」（S-GUANCHENG-SHUOJI-27，B 級）' },
    // 九宮格靈動數字.json luoshu.layout.note＋sumRule
    allOpen: { text: '九宮全開：一到九各占一宮、不重複，橫直斜都合 15。', source: '九宮格靈動數字.json luoshu.layout.note＋sumRule（排法依 S-SHUSHU-JIYI-WIKISOURCE；合 15 為算出來的事實）' },
  },
  // TODO(i18n): 'zh-Hans' | 'en' | 'ja' | 'ko' — 待使用者核准 zh-TW 後再譯
};
