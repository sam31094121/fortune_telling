/**
 * 紫微人格庫 - INTERNAL_REFERENCE ONLY
 *
 * 禁止輸出到前端。
 * 用途：後端理解人格種子，轉換為阿修羅語言系統。
 *
 * 十四主星 → 人格DNA（內部專用）
 */

export interface StarPersonalityDNA {
  starKey: string;
  coreDrive: string;
  decisionStyle: string;
  speechStyle: string;
  stressResponse: string;
  strength: string[];
  shadow: string[];
  desire: string;
  fear: string;
  socialStyle: string;
  conflictStyle: string;
  humorDNA: string[];
  dominantVerb: string;
  asuraTone: string;
  // 梗生成的根源（必須可追溯到人格特徵）
  memeSeeds: string[];
}

// ===== 十四主星人格資料庫 =====

export const ZIWEI_PERSONALITY_REGISTRY: Record<string, StarPersonalityDNA> = {
  // 【紫微】
  ZIWEI: {
    starKey: 'ZIWEI',
    coreDrive: '掌局、整合、位置感、尊嚴、控制全局',
    decisionStyle: '穩、慢、壓場、不急著證明',
    speechStyle: '分寸感強，話很值錢',
    stressResponse: '更沉、話變少',
    strength: ['掌全局', '位置感清', '標準明確', '人服氣'],
    shadow: ['要求高', '難接受不按規則', '控制欲強'],
    desire: '被尊重、被認可為「有份量的人」',
    fear: '失去控制、位置被動搖',
    socialStyle: '指揮型，別人跟著走',
    conflictStyle: '不急著贏，靜靜壓場',
    humorDNA: ['王位梗', '主場梗', '指揮台梗', '格局梗'],
    dominantVerb: '掌/定/統/控',
    asuraTone: '穩、慢、壓場',
    memeSeeds: ['真正有份量的人，不需要每句話都搶著講', '位置', '標準', '尊嚴'],
  },

  // 【天機】
  TIANJI: {
    starKey: 'TIANJI',
    coreDrive: '思考、變化、策略、預判、腦內高速運算',
    decisionStyle: '快、聰明、轉折多、會反問',
    speechStyle: '靈活、會轉向、句子有層次',
    stressResponse: '話變多、邏輯走得更快',
    strength: ['想得快', '預判強', '變通能力', '反應敏'],
    shadow: ['想太多', '優柔寡斷', '容易過度分析'],
    desire: '被認可為「聰明人」',
    fear: '被低估、慢人一拍',
    socialStyle: '策略型，提前佈局',
    conflictStyle: '反問，讓對方自己走進去',
    humorDNA: ['導航重算梗', '腦內會議梗', '過度分析梗', '方案爆炸梗'],
    dominantVerb: '想/算/變/避',
    asuraTone: '快、聰明、有反問感',
    memeSeeds: ['你的腦內導航不是迷路，是一直重新規劃路線', '走路數', '方案'],
  },

  // 【太陽】
  TAIYANG: {
    starKey: 'TAIYANG',
    coreDrive: '外放、承擔、照顧、曝光、責任感',
    decisionStyle: '直、明、正面、有帶人感',
    speechStyle: '開朗、煽動力強、會帶人',
    stressResponse: '更亮、反而更照顧別人',
    strength: ['照顧力', '承擔能力', '領導感', '能量足'],
    shadow: ['容易過度承擔', '充電不足', '被消耗'],
    desire: '被需要、被感謝',
    fear: '被忽視、無人可照顧',
    socialStyle: '主導照顧型',
    conflictStyle: '直接講，幫對方解決',
    humorDNA: ['人形充電站', '全天候照明', '無限供電梗', '被吸血梗'],
    dominantVerb: '照/帶/扛/給',
    asuraTone: '直、有溫度但有力',
    memeSeeds: ['你習慣站亮的地方，不代表你沒有累', '充電', '照顧'],
  },

  // 【武曲】
  WUQU: {
    starKey: 'WUQU',
    coreDrive: '效率、結果、資源、紀律、執行',
    decisionStyle: '乾脆、現實、少廢話',
    speechStyle: '簡潔、直指重點、有結果導向感',
    stressResponse: '更快、更狠、效率優先',
    strength: ['執行力強', '成本意識', '結果為王', '不軟'],
    shadow: ['太功利', '忽視過程', '冷硬'],
    desire: '有成果、有回報',
    fear: '白忙一場、浪費',
    socialStyle: '執行型，見面就幹',
    conflictStyle: '直接算帳，不拖',
    humorDNA: ['成本表梗', 'KPI梗', '結案梗', '值不值得梗'],
    dominantVerb: '做/算/拿/收',
    asuraTone: '乾脆、現實、無廢話',
    memeSeeds: ['浪漫可以，先告訴我成本', '結果', '成本', '效率'],
  },

  // 【天同】
  TIANTONG: {
    starKey: 'TIANTONG',
    coreDrive: '舒服、善意、適應、情緒、享受',
    decisionStyle: '柔中帶刺、反差型幽默',
    speechStyle: '溫柔但有毒舌、反差萌',
    stressResponse: '更軟、內縮、默默躲',
    strength: ['舒服力', '善意強', '包容度高', '反差'],
    shadow: ['太逃避', '該動時躲', '軟弱'],
    desire: '被善待、被舒服對待',
    fear: '被強迫、被打擾',
    socialStyle: '親善調和型',
    conflictStyle: '軟軟躲開，或反差毒舌',
    humorDNA: ['沙發梗', '舒適圈梗', '防禦罩梗', '躲避大師梗'],
    dominantVerb: '感/享/避/和',
    asuraTone: '溫柔中帶反差、有刺感',
    memeSeeds: ['你不是懶，你只是很清楚什麼事情值得浪費人生', '舒服', '躲'],
  },

  // 【廉貞】
  LIANZHEN: {
    starKey: 'LIANZHEN',
    coreDrive: '界線、原則、魅力、規則、慾望控制',
    decisionStyle: '漂亮、銳利、有誘惑感',
    speechStyle: '有殺傷力的漂亮、會撩',
    stressResponse: '更銳利、下手更狠',
    strength: ['界線感', '魅力強', '說服力', '控制感'],
    shadow: ['界線太硬', '容易傷人', '欲望難控'],
    desire: '被吸引、被渴望',
    fear: '界線被破、失控',
    socialStyle: '魅力吸附型',
    conflictStyle: '銳利一刀，不留情',
    humorDNA: ['紅線梗', '試火梗', '規則漏洞梗', '界線遊戲梗'],
    dominantVerb: '界/控/試/守',
    asuraTone: '漂亮但銳利、有吸引力',
    memeSeeds: ['你知道什麼能碰，也知道什麼碰了要付代價', '界線', '試'],
  },

  // 【天府】
  TIANFU: {
    starKey: 'TIANFU',
    coreDrive: '穩定、儲備、管理、守成、資源掌握',
    decisionStyle: '慢、穩、有底、不慌',
    speechStyle: '沉穩、有把握感、像看過大場面',
    stressResponse: '更穩、資源更守緊',
    strength: ['防禦強', '資源掌握', '穩定感', '有底氣'],
    shadow: ['守得太死', '失去機會', '躲在後面'],
    desire: '安全感、充足感',
    fear: '失去、沒有底牌',
    socialStyle: '穩健支撐型',
    conflictStyle: '不動聲色，防守完美',
    humorDNA: ['倉庫梗', '底牌梗', '庫存梗', '存貨梗'],
    dominantVerb: '守/存/穩/管',
    asuraTone: '沉穩、有把握、不急',
    memeSeeds: ['別人急著證明自己，你比較習慣先把底牌留好', '底', '存'],
  },

  // 【太陰】
  TAIYIN: {
    starKey: 'TAIYIN',
    coreDrive: '內在、敏感、觀察、細節、安全感',
    decisionStyle: '低沉、細膩、句子較慢',
    speechStyle: '深邃、有層次、會卡殼',
    stressResponse: '更內向、更多內耗',
    strength: ['洞察強', '敏感度', '細節控', '深思'],
    shadow: ['想太多', '內耗重', '悶悶的'],
    desire: '被理解、被看見',
    fear: '被忽視、被傷害',
    socialStyle: '內觀察型',
    conflictStyle: '內化很久，有時會爆',
    humorDNA: ['腦內回放梗', '夜班分析師梗', '想三天梗', '內耗大師梗'],
    dominantVerb: '藏/看/感/護',
    asuraTone: '低沉、細膩、有深度',
    memeSeeds: ['別人睡覺，你的腦子值夜班', '想', '看', '內'],
  },

  // 【貪狼】
  TANLANG: {
    starKey: 'TANLANG',
    coreDrive: '慾望、魅力、社交、探索、取得',
    decisionStyle: '活、會撩、有梗、有誘惑感',
    speechStyle: '靈活、會調氣氛、充滿能量',
    stressResponse: '更活躍、拚命尋求出口',
    strength: ['魅力強', '社交強', '探索力', '取得能力'],
    shadow: ['慾望難滿', '選項麻痹', '衝動'],
    desire: '擁有、體驗、被吸引',
    fear: '被限制、選項被拿走',
    socialStyle: '魅力驅動型',
    conflictStyle: '快速轉向，不糾纏',
    humorDNA: ['購物車梗', '收藏清單梗', '誘惑測試梗', '選項爆炸梗'],
    dominantVerb: '要/玩/拿/試',
    asuraTone: '活力充沛、有吸引力',
    memeSeeds: ['不是沒選擇，是你的選擇多到開始互相打架', '要', '玩'],
  },

  // 【巨門】
  JUMEN: {
    starKey: 'JUMEN',
    coreDrive: '拆解、質疑、表達、辯證、查證',
    decisionStyle: '快、反問、毒舌、會拆穿',
    speechStyle: '銳利、會拆、邏輯強',
    stressResponse: '話更快、更狠、質疑更多',
    strength: ['邏輯強', '表達力', '洞察力', '不信邪'],
    shadow: ['太毒舌', '傷人', '不信任'],
    desire: '被驗證、被認可為聰明',
    fear: '被騙、被看低',
    socialStyle: '質問者型',
    conflictStyle: '反問、拆穿、直指要害',
    humorDNA: ['證據梗', '嘴快梗', '拆穿梗', '審判官梗'],
    dominantVerb: '問/拆/辯/查',
    asuraTone: '快、毒舌、有反問力',
    memeSeeds: ['證據偶爾塞車，嘴巴沒有', '問', '查', '拆'],
  },

  // 【天相】
  TIANXIANG: {
    starKey: 'TIANXIANG',
    coreDrive: '協調、公平、形象、規則、人際平衡',
    decisionStyle: '有禮但不軟、懂場面',
    speechStyle: '圓融、有分寸、會看人',
    stressResponse: '更謹慎、更照顧場面',
    strength: ['協調力', '公平感', '形象力', '人際'],
    shadow: ['討好過度', '沒有立場', '隱忍'],
    desire: '被認可、不引發衝突',
    fear: '失去形象、被評判',
    socialStyle: '平衡協調型',
    conflictStyle: '協商、找共贏',
    humorDNA: ['公關危機梗', '圓桌會議梗', '場面話梗', '心機梗'],
    dominantVerb: '衡/協/看/調',
    asuraTone: '圓融、有分寸、懂場面',
    memeSeeds: ['你不是怕衝突，你只是知道有些事情贏了也不好看', '平衡', '協'],
  },

  // 【天梁】
  TIANLIANG: {
    starKey: 'TIANLIANG',
    coreDrive: '原則、保護、長線、判斷、照顧',
    decisionStyle: '沉、老練、像看過很多事',
    speechStyle: '重量級、有阿公感、會提醒',
    stressResponse: '更沉、責任感更強',
    strength: ['判斷力', '保護力', '長線眼光', '經歷'],
    shadow: ['管太多', '被當警報器', '嚴厲'],
    desire: '被信任、被需要',
    fear: '被不信任、無法保護',
    socialStyle: '長輩保護型',
    conflictStyle: '直言、提醒、不多廢話',
    humorDNA: ['風險警報梗', '老司機梗', '阿公感梗', '人生導師梗'],
    dominantVerb: '護/判/撐/守',
    asuraTone: '沉穩、有分量、像老師',
    memeSeeds: ['你不是愛管，你只是看到坑，真的很難假裝沒看到', '護', '判'],
  },

  // 【七殺】
  QISHA: {
    starKey: 'QISHA',
    coreDrive: '決斷、衝鋒、承擔、突破、快速行動',
    decisionStyle: '短、狠、直接',
    speechStyle: '簡短、有力、沒有廢話',
    stressResponse: '更快、更狠、馬上行動',
    strength: ['決斷力', '承擔力', '行動快', '衝鋒力'],
    shadow: ['太快', '不思考', '蠻幹'],
    desire: '馬上結果、被跟隨',
    fear: '被拖延、無法動',
    socialStyle: '先鋒衝鋒型',
    conflictStyle: '直接開幹，不廢話',
    humorDNA: ['決策速度梗', '先衝梗', '行動派梗', '無廢話梗'],
    dominantVerb: '決/衝/扛/斷',
    asuraTone: '短、有力、決斷感',
    memeSeeds: ['別人開會找共識，你開會找結論', '決', '衝'],
  },

  // 【破軍】
  POJUN: {
    starKey: 'POJUN',
    coreDrive: '拆除、改變、破局、重建、革新',
    decisionStyle: '反骨、強轉折、黑色幽默',
    speechStyle: '拆台感、反向操作、會反套路',
    stressResponse: '更反骨、更拆',
    strength: ['突破力', '改變力', '創新感', '不守規'],
    shadow: ['太拆', '沒有建', '亂局'],
    desire: '被認可為革命者',
    fear: '被困在舊的裡',
    socialStyle: '破局革新型',
    conflictStyle: '打破格局、重新定義',
    humorDNA: ['拆遷梗', '革命梗', '推倒重來梗', '反套路梗'],
    dominantVerb: '拆/破/換/建',
    asuraTone: '反骨、黑色幽默、有反差',
    memeSeeds: ['舊的沒用了，你真的敢拆', '拆', '破', '重建'],
  },
};

// ===== 導出 =====

export function getStarPersonality(starKey: string): StarPersonalityDNA | undefined {
  return ZIWEI_PERSONALITY_REGISTRY[starKey];
}

export function getAllStarPersonalities(): StarPersonalityDNA[] {
  return Object.values(ZIWEI_PERSONALITY_REGISTRY);
}
