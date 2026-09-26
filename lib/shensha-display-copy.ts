/** Presentation only: source governance and eligibility remain on the server. */
export const shenShaDisplayCopy = {
  zh: {
    adopted: '依袁樹珊《增訂命理探原》取法；本書核對不表示各書各派一致。',
    compactAdopted: '採袁樹珊《增訂命理探原》取法，不代表各派共識。',
    compactScope: '未顯示不代表不存在。',
    compactConflict: '取法分歧，暫不提供：',
    conflict: '部分神煞因取法分歧暫不提供：',
    pending: '以下神煞尚待完成來源與取法核對：',
    scope: '未顯示不代表不存在；結果限於本頁已核對並採用的取法。',
    details: '查看取法與來源差異',
    method: '本書取法', checked: '本書取法已核對', withheld: '本書取法暫未放行',
    missing: '來源對照資料待補，請重新排盤。',
    pendingComparison: '跨書對照待核', variant: '跨書異說已查證', matched: '限定範圍一致',
  },
  en: {
    adopted: 'Method: Yuan Shushan’s Zengding Mingli Tanyuan. Checks against this book do not establish agreement across schools.',
    compactAdopted: 'Yuan Shushan’s Zengding Mingli Tanyuan; no school-wide consensus.',
    compactScope: 'Omission ≠ absence.',
    compactConflict: 'Confirmed differences; shensha withheld: ',
    conflict: 'Some shensha are currently withheld because the consulted sources differ in method: ',
    pending: 'Source and method checks are pending for: ',
    scope: 'Omission does not establish absence. Results are limited to the methods checked and used on this page.',
    details: 'View methods and source differences',
    method: 'Selected method', checked: 'Checked against the selected book', withheld: 'Selected method withheld',
    missing: 'Source comparison data is missing. Please calculate again.',
    pendingComparison: 'Cross-source pending', variant: 'Documented source variant', matched: 'Limited agreement',
  },
} as const;

export const shenShaDisplayNames = {
  zh: { tianyi: '天乙', wenchang: '文昌', taohua: '桃花', yima: '驛馬', huagai: '華蓋' },
  en: { tianyi: 'Tianyi', wenchang: 'Wenchang', taohua: 'Taohua', yima: 'Yima', huagai: 'Huagai' },
} as const;
