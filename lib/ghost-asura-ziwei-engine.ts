/**
 * 鬼魅阿修羅 — 紫微斗數話術全面阿修羅化引擎 V2
 * ============================================================================
 * 任務：Ghost Asura Ziwei Narrative Engine V2
 * 
 * 核心原則：
 * - 後端負責算對
 * - 證據鏈負責證明
 * - 人格引擎負責理解
 * - 鬼魅阿修羅負責開口
 * 
 * 前端零紫微術語（Zero Ziwei Technical Jargon）：
 * 原始星曜、宮位、廟旺平陷、四化、吉凶星曜全部在內部轉化為人格特質與戰鬥沙盤，
 * 禁止任何原始術數名詞進入面向用戶的可見文本。
 * ============================================================================
 */

import type { ZiweiChart } from './types/ghost-asura-response';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 01｜十四主星內部人格種子與 Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type StarKey =
  | 'ZIWEI'
  | 'TIANJI'
  | 'TAIYANG'
  | 'WUQU'
  | 'TIANTONG'
  | 'LIANZHEN'
  | 'TIANFU'
  | 'TAIYIN'
  | 'TANLANG'
  | 'JUMEN'
  | 'TIANXIANG'
  | 'TIANLIANG'
  | 'QISHA'
  | 'POJUN';

export interface StarPersonalityDNA {
  starKey: StarKey;
  chineseInternalRef: string; // 僅內部記錄，禁止輸出至用戶端
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
  dominantVerb: string[];
  asuraTone: string;
  mature: string;
  unbalanced: string;
  hookJokes: string[];
}

export const ZIWEI_PERSONALITY_REGISTRY: Readonly<Record<StarKey, StarPersonalityDNA>> = {
  ZIWEI: {
    starKey: 'ZIWEI',
    chineseInternalRef: '紫微',
    coreDrive: '掌局、整合、位置感、尊嚴、控制全局',
    decisionStyle: '壓場、全局把控、不輕易表態',
    speechStyle: '穩、慢、壓場、不急著證明',
    stressResponse: '收緊控制權、提高標準',
    strength: ['全局視野', '資源整合', '天然威嚴', '定盤中樞'],
    shadow: ['難以認錯', '過度苛求', '情感疏離', '防禦高冷'],
    desire: '掌控主場與話語權',
    fear: '失控、失威、被人輕視',
    socialStyle: '居高臨下、保持體面距離',
    conflictStyle: '以勢壓人、立新規矩',
    humorDNA: ['王位', '主場', '指揮台', '規格'],
    dominantVerb: ['掌', '定', '統', '控'],
    asuraTone: '沉穩霸道、居高臨下',
    mature: '真正有份量的人，不需要每句話都搶著講。',
    unbalanced: '你不是一定要控制所有人。你只是很難接受事情不照你的標準走。',
    hookJokes: ['你習慣坐指揮台，但別把身邊人都當作等著領軍令的部屬。', '主場在你這，不必到處巡視找認同。'],
  },
  TIANJI: {
    starKey: 'TIANJI',
    chineseInternalRef: '天機',
    coreDrive: '思考、變化、策略、預判、腦內高速運算',
    decisionStyle: '多方案權衡、高速預判風險',
    speechStyle: '快、聰明、轉折多、會反問',
    stressResponse: '腦內反覆運算、過度推演導致停滯',
    strength: ['戰略嗅覺', '機變靈活', '風險避開', '思維周密'],
    shadow: ['算計過多', '決策遲疑', '精神內耗', '神經緊繃'],
    desire: '算無遺策的掌控感',
    fear: '計畫脫軌、未知的突發事故',
    socialStyle: '靈動客氣、保持觀察',
    conflictStyle: '以智破力、變道繞行',
    humorDNA: ['腦內會議', '導航重算', '方案過多'],
    dominantVerb: ['想', '算', '變', '避'],
    asuraTone: '銳利機警、步步緊逼',
    mature: '你不是猶豫。你是在別人走一步的時候，腦子已經走完五條路。',
    unbalanced: '路想太多，最後連第一步都嫌有風險。',
    hookJokes: ['你的腦內導航不是迷路，是一直重新規劃路線。', '方案寫了十套，身體還留在原地熱身。'],
  },
  TAIYANG: {
    starKey: 'TAIYANG',
    chineseInternalRef: '太陽',
    coreDrive: '外放、承擔、照顧、曝光、責任感',
    decisionStyle: '公開公正、大開大闔、主動扛責',
    speechStyle: '直、明、正面、有帶人感',
    stressResponse: '過度付出、燃燒殆盡後暗自失望',
    strength: ['熱力四射', '敢做敢當', '凝聚向心', '公正無私'],
    shadow: ['好大喜功', '不甘平淡', '打腫臉充胖子', '不懂拒絕'],
    desire: '照亮全場並獲得由衷敬重',
    fear: '被忽視、失去存在感、被指責自私',
    socialStyle: '熱情主動、大哥大姐風範',
    conflictStyle: '堂堂正正正面對質',
    humorDNA: ['人形充電站', '全天候照明', '太陽能發電'],
    dominantVerb: ['照', '帶', '扛', '給'],
    asuraTone: '光明磊落、豪氣干雲',
    mature: '你習慣站亮的地方，不代表你沒有累。',
    unbalanced: '什麼都想照顧，最後最容易忘記自己也要充電。',
    hookJokes: ['你不是燃燒自己照亮別人，你是常常把自己燒成木炭還問別人冷不冷。', '全場照明開太強，反而看不清誰在陰影裡偷懶。'],
  },
  WUQU: {
    starKey: 'WUQU',
    chineseInternalRef: '武曲',
    coreDrive: '效率、結果、資源、紀律、執行',
    decisionStyle: '唯結果論、乾脆俐落、數值導向',
    speechStyle: '乾脆、現實、少廢話',
    stressResponse: '冷硬切斷、埋頭計算損益',
    strength: ['極致執行力', '資本敏感度', '鋼鐵紀律', '抗壓極強'],
    shadow: ['不通人情', '過度功利', '吝於溝通', '冷漠孤寡'],
    desire: '實打實的資產與戰果',
    fear: '無效投入、資源匱乏、白忙一場',
    socialStyle: '實事求是、不說虛話',
    conflictStyle: '擺出數據清單、直接算總帳',
    humorDNA: ['成本表', 'KPI', '結案'],
    dominantVerb: ['做', '算', '拿', '收'],
    asuraTone: '冷靜肅穆、言簡意賅',
    mature: '你不怕辛苦。你比較怕辛苦半天還沒有結果。',
    unbalanced: '別把所有東西都換算成值不值得。',
    hookJokes: ['浪漫可以，先告訴我成本。', '聊感情太累，不如先把資產負債表結算乾淨。'],
  },
  TIANTONG: {
    starKey: 'TIANTONG',
    chineseInternalRef: '天同',
    coreDrive: '舒服、善意、適應、情緒、享受',
    decisionStyle: '順其自然、避開劇烈對抗',
    speechStyle: '柔中帶刺、反差型幽默',
    stressResponse: '退回防禦罩、被動逃避拖延',
    strength: ['情緒韌性', '親和化解', '知足知止', '適應萬變'],
    shadow: ['安於現狀', '欠缺殺伐', '好逸惡勞', '意志薄弱'],
    desire: '平順和諧無紛爭的安樂生活',
    fear: '殘酷競爭、生活品質破滅、正面廝殺',
    socialStyle: '溫潤友善、討人喜歡',
    conflictStyle: '裝傻避戰、以柔克剛',
    humorDNA: ['沙發', '舒適圈', '防禦罩'],
    dominantVerb: ['感', '享', '避', '和'],
    asuraTone: '慵懶冷冽、反諷清醒',
    mature: '你不是懶。你只是很清楚什麼事情值得浪費人生。',
    unbalanced: '舒服久了，連該走的路都會嫌遠。',
    hookJokes: ['沙發很軟，但躺久了筋骨就生鏽了。', '不想爭不是因為佛系，只是嫌拔刀太花力氣。'],
  },
  LIANZHEN: {
    starKey: 'LIANZHEN',
    chineseInternalRef: '廉貞',
    coreDrive: '界線、原則、魅力、規則、慾望控制',
    decisionStyle: '精準試探邊界、原則極強、敢於兵行險招',
    speechStyle: '漂亮、銳利、有誘惑感',
    stressResponse: '心火暗燒、暗中角力絕不服輸',
    strength: ['敏銳洞察', '強大氣場', '守紀破規', '專注執著'],
    shadow: ['多疑執拗', '心事暗藏', '易走極端', '內心焦慮'],
    desire: '在灰色邊界中取得極致話語權',
    fear: '底線被踩、背叛、規則失控',
    socialStyle: '若即若離、帶著神秘防備',
    conflictStyle: '精準拿捏死穴、反戈一擊',
    humorDNA: ['紅線', '試火', '規則漏洞'],
    dominantVerb: ['界', '控', '試', '守'],
    asuraTone: '妖冶冷峻、殺意暗藏',
    mature: '你知道什麼能碰，也知道什麼碰了要付代價。',
    unbalanced: '最危險的不是誘惑，是你明知道還想測試一次。',
    hookJokes: ['紅線畫在那裡，你總是忍不住去踩兩腳看看會不會觸發警報。', '魅力是你的武器，別讓武器反手割傷自己。'],
  },
  TIANFU: {
    starKey: 'TIANFU',
    chineseInternalRef: '天府',
    coreDrive: '穩定、儲備、管理、守成、資源掌握',
    decisionStyle: '謀定後動、層層防護、預留後手',
    speechStyle: '慢、穩、有底、不慌',
    stressResponse: '封鎖庫存、保守退守城池',
    strength: ['厚重沉穩', '防線牢固', '善於守成', '格局宏闊'],
    shadow: ['墨守成規', '開拓不足', '過度保守', '高高在上'],
    desire: '牢不可破的堡壘與無盡儲備',
    fear: '庫存見底、動盪無序、冒險慘敗',
    socialStyle: '雍容大度、禮數周全',
    conflictStyle: '深溝高壘、耗死對手',
    humorDNA: ['倉庫', '底牌', '庫存'],
    dominantVerb: ['守', '存', '穩', '管'],
    asuraTone: '沉穩內斂、底氣十足',
    mature: '別人急著證明自己，你比較習慣先把底牌留好。',
    unbalanced: '守得太久，機會也會以為你不需要它。',
    hookJokes: ['底牌藏了厚厚一疊，等到牌局結束都還沒打出一張。', '城牆築得比誰都厚，差點把出門進攻的路也給封死了。'],
  },
  TAIYIN: {
    starKey: 'TAIYIN',
    chineseInternalRef: '太陰',
    coreDrive: '內在、敏感、觀察、細節、安全感',
    decisionStyle: '暗中觀察、細節推敲、步步為營',
    speechStyle: '低沉、細膩、句子較慢',
    stressResponse: '內耗沉溺、情緒反芻、暗中疏離',
    strength: ['深度直覺', '細節入微', '深謀遠慮', '默默積累'],
    shadow: ['脆弱敏感', '怨尤暗積', '被動退縮', '過度防備'],
    desire: '深層的安全感與不被打擾的寧靜',
    fear: '粗暴冒犯、隱私曝光、孤立無援',
    socialStyle: '溫婉安靜、注重隱私',
    conflictStyle: '冷戰退避、無聲防衛',
    humorDNA: ['腦內回放', '夜班分析師'],
    dominantVerb: ['藏', '看', '感', '護'],
    asuraTone: '幽冷深邃、透徹如水',
    mature: '你不是不說。你只是通常看得比你說的多。',
    unbalanced: '想得太深的代價，就是別人一句話，你可以在腦子住三天。',
    hookJokes: ['別人睡覺，你的腦子值夜班。', '白天看著風平浪靜，夜裡腦內已經上演了三季宮鬥大戲。'],
  },
  TANLANG: {
    starKey: 'TANLANG',
    chineseInternalRef: '貪狼',
    coreDrive: '慾望、魅力、社交、探索、取得',
    decisionStyle: '多線捕魚、隨機應變、靈活切換',
    speechStyle: '活、會撩、有梗、有誘惑感',
    stressResponse: '轉移焦點、另闢戰場、逃避枯燥',
    strength: ['頂級情商', '八面玲瓏', '多才多藝', '慾望驅動'],
    shadow: ['貪多嚼不爛', '三分鐘熱度', '浮躁虛榮', '難定長性'],
    desire: '世間萬般精彩與豐富體驗',
    fear: '枯燥平庸、生活乏味、失去吸引力',
    socialStyle: '遊刃有餘、穿梭全場',
    conflictStyle: '太極推手、軟磨硬泡',
    humorDNA: ['購物車', '收藏清單', '誘惑測試'],
    dominantVerb: ['要', '玩', '拿', '試'],
    asuraTone: '狂放肆意、直白挑釁',
    mature: '你知道自己要什麼，也知道怎麼讓機會靠近。',
    unbalanced: '選項太多的時候，你最大的敵人不是沒機會，是每個都想試。',
    hookJokes: ['不是沒選擇，是你的選擇多到開始互相打架。', '慾望清單拉得比長城還長，最後連第一件貨都還沒結帳。'],
  },
  JUMEN: {
    starKey: 'JUMEN',
    chineseInternalRef: '巨門',
    coreDrive: '拆解、質疑、表達、辯證、查證',
    decisionStyle: '先疑後信、層層審查、直搗破綻',
    speechStyle: '快、反問、毒舌、會拆穿',
    stressResponse: '言辭交鋒、直接戳破、唇槍舌劍',
    strength: ['一眼看破盲點', '雄辯論證', '求真務實', '批判思維'],
    shadow: ['口舌招尤', '吹毛求疵', '難以信任', '冷嘲熱諷'],
    desire: '真相大白與無可辯駁的論點',
    fear: '被矇騙、被愚弄、論點站不住腳',
    socialStyle: '直言不諱、挑戰權威',
    conflictStyle: '言辭如刀、正面辯駁',
    humorDNA: ['證據偶爾塞車，嘴巴沒有。', '拆裝大師'],
    dominantVerb: ['問', '拆', '辯', '查'],
    asuraTone: '毒舌冷冽、一針見血',
    mature: '別人聽答案，你連答案本身都要審。',
    unbalanced: '事情還在確認，你的嘴已經先到終點。',
    hookJokes: ['證據偶爾塞車，嘴巴沒有。', '你不是想找碴，你只是看見漏洞不戳一下渾身難受。'],
  },
  TIANXIANG: {
    starKey: 'TIANXIANG',
    chineseInternalRef: '天相',
    coreDrive: '協調、公平、形象、規則、人際平衡',
    decisionStyle: '顧全大局、體面周延、講求程序',
    speechStyle: '有禮但不軟、懂場面',
    stressResponse: '表面維持體面、內心左右為難',
    strength: ['處事周全', '形象得體', '調和鼎鼐', '忠誠可靠'],
    shadow: ['優柔寡斷', '隨波逐流', '死要面子', '缺少狠勁'],
    desire: '公認的體面與受人尊重的信譽',
    fear: '名譽掃地、裡外不是人、醜相百出',
    socialStyle: '溫良得體、周到周旋',
    conflictStyle: '居中斡旋、促成妥協',
    humorDNA: ['公關危機', '圓桌會議'],
    dominantVerb: ['衡', '協', '看', '調'],
    asuraTone: '從容自若、暗藏機鋒',
    mature: '你不是怕衝突，你只是知道有些事情贏了也不好看。',
    unbalanced: '顧全所有人的代價，就是最後沒人知道你到底要什麼。',
    hookJokes: ['圓桌開得再圓，也解決不了有人想掀桌的問題。', '體面是給別人看的，勝負是自己要吞的。'],
  },
  TIANLIANG: {
    starKey: 'TIANLIANG',
    chineseInternalRef: '天梁',
    coreDrive: '原則、保護、長線、判斷、照顧',
    decisionStyle: '老練縱觀、風險兜底、居安思危',
    speechStyle: '沉、老練、像看過很多事',
    stressResponse: '主動扛雷、說教提醒、憂心忡忡',
    strength: ['化險為夷', '長遠眼光', '仁厚庇護', '老成持重'],
    shadow: ['好為人師', '背負過重', '固步自封', '悲觀憂患'],
    desire: '長治久安與受人依託的長者地位',
    fear: '基業瓦解、後輩遭災、無能為力',
    socialStyle: '長輩姿態、關懷後進',
    conflictStyle: '講大道理、擺出規矩底線',
    humorDNA: ['風險警報', '老司機'],
    dominantVerb: ['護', '判', '撐', '守'],
    asuraTone: '蒼勁霸道、直斥痛點',
    mature: '你不是愛管。你只是看到坑，真的很難假裝沒看到。',
    unbalanced: '提醒太多，最後別人會以為你的人生工作就是當警報器。',
    hookJokes: ['你不是人生導師，別把每個過路人都當成不聽話的徒弟。', '風險警報叫得太響，自己反而忘了往前邁步。'],
  },
  QISHA: {
    starKey: 'QISHA',
    chineseInternalRef: '七殺',
    coreDrive: '決斷、衝鋒、承擔、突破',
    decisionStyle: '單刀直入、立斷生死、敢於拍板',
    speechStyle: '短、狠、直接',
    stressResponse: '正面強攻、加速決策、破釜沉舟',
    strength: ['破陣魄力', '獨當一面', '敢作敢當', '絕境突圍'],
    shadow: ['剛愎自用', '孤軍冒進', '不計後果', '暴烈少恩'],
    desire: '殺出重圍、一統戰局、建立功業',
    fear: '受制於人、窩囊憋屈、任人擺佈',
    socialStyle: '不怒自威、獨來獨往',
    conflictStyle: '正面迎擊、直接斬除',
    humorDNA: ['別人開會找共識，你開會找結論。', '鑿陣重戟'],
    dominantVerb: ['決', '衝', '扛', '斷'],
    asuraTone: '狂暴霸道、言出必行',
    mature: '沒人決定，你會決定。沒人往前，你會先走。',
    unbalanced: '最大的優點是敢決定。最大的問題，也是敢決定。',
    hookJokes: ['別人開會找共識，你開會找結論。', '衝太快的時候，回頭一看，整隊人馬都被你甩在十里之外。'],
  },
  POJUN: {
    starKey: 'POJUN',
    chineseInternalRef: '破軍',
    coreDrive: '拆除、改變、破局、重建',
    decisionStyle: '破舊立新、推倒重來、不計代價',
    speechStyle: '反骨、強轉折、黑色幽默',
    stressResponse: '翻桌重來、徹底打破現狀',
    strength: ['破局先鋒', '徹底顛覆', '無畏重構', '開創新紀元'],
    shadow: ['破壞有餘', '建設不足', '任性叛逆', '大起大落'],
    desire: '打破舊世界、親手塑立新秩序',
    fear: '被舊體制吞噬、死水一潭、毫無變化',
    socialStyle: '特立獨行、喜怒由心',
    conflictStyle: '掀桌毀局、重新洗牌',
    humorDNA: ['別把革命做成拆遷。', '拆遷大隊'],
    dominantVerb: ['拆', '破', '換', '建'],
    asuraTone: '桀驁不馴、反骨狂傲',
    mature: '舊的沒用了，你真的敢拆。',
    unbalanced: '拆不是問題。問題是拆完你有沒有圖紙。',
    hookJokes: ['別把革命做成拆遷。', '翻桌是很快活，翻完發現連放便當的地方都沒了。'],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 02｜宮位轉人生領域（LifeDomain）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PALACE_TO_DOMAIN_MAP: Record<string, string> = {
  命宮: '核心主場與本質',
  身宮: '後天落實與支撐',
  官祿宮: '工作舞台與權責',
  事業宮: '工作舞台與權責',
  財帛宮: '資源掌握與收益',
  遷移宮: '外在環境與行動',
  夫妻宮: '親密關係與界線',
  婚姻宮: '親密關係與界線',
  福德宮: '精神蓄能與內在',
  父母宮: '長輩權威與體制',
  兄弟宮: '同袍夥伴與競爭',
  子女宮: '產出傳承與部屬',
  疾厄宮: '身心負載與底線',
  田宅宮: '陣地根基與儲備',
  僕役宮: '外圍社交與人際網',
  交友宮: '外圍社交與人際網',
};

export function mapPalaceToLifeDomain(rawPalaceName: string): string {
  for (const [key, domain] of Object.entries(PALACE_TO_DOMAIN_MAP)) {
    if (rawPalaceName.includes(key)) {
      return domain;
    }
  }
  return '特定領域';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 03｜四化轉力量變化（TransformationModifiers）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ForceTransformation = 'GAIN' | 'POWER' | 'RECOGNITION' | 'BLOCKAGE';

export const TRANSFORMATION_DESC_MAP: Record<ForceTransformation, string> = {
  GAIN: '資源靠近、機會增加、取得能力放大',
  POWER: '掌控、責任、推進力增加',
  RECOGNITION: '能見度、認可、名聲表現增加',
  BLOCKAGE: '卡點、執念、反覆交鋒的代價與壓力',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 04｜三方四正人格交叉與融合引擎（PersonalityFusionEngine）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface InternalStarSignal {
  starKey: StarKey;
  strength: number; // 1-100
  role: 'DOMINANT' | 'ACTION' | 'PRESSURE' | 'HIDDEN';
  traits: string[];
  evidenceIds: string[];
}

export interface AsuraPersonalityProfile {
  archetype: string;
  coreTraits: string[];
  decisionStyle: string;
  speechStyle: string;
  stressResponse: string;
  relationshipStyle: string;
  strength: string[];
  shadow: string[];
  humorDNA: string[];
  evidenceIds: string[];
  matureVerdict: string;
  unbalancedVerdict: string;
}

export function fuseStarPersonalities(signals: InternalStarSignal[]): AsuraPersonalityProfile {
  if (signals.length === 0) {
    // 預設戰神底盤
    const def = ZIWEI_PERSONALITY_REGISTRY.QISHA;
    return {
      archetype: '孤鋒破陣者',
      coreTraits: def.strength,
      decisionStyle: def.decisionStyle,
      speechStyle: def.speechStyle,
      stressResponse: def.stressResponse,
      relationshipStyle: def.socialStyle,
      strength: def.strength,
      shadow: def.shadow,
      humorDNA: def.humorDNA,
      evidenceIds: ['DEFAULT_FALLBACK'],
      matureVerdict: def.mature,
      unbalancedVerdict: def.unbalanced,
    };
  }

  // 1. 識別主力星曜
  const dominantSignal = signals.find((s) => s.role === 'DOMINANT') || signals[0];
  const actionSignal = signals.find((s) => s.role === 'ACTION') || dominantSignal;
  const pressureSignal = signals.find((s) => s.role === 'PRESSURE');
  const hiddenSignal = signals.find((s) => s.role === 'HIDDEN');

  const dominantDNA = ZIWEI_PERSONALITY_REGISTRY[dominantSignal.starKey];
  const actionDNA = ZIWEI_PERSONALITY_REGISTRY[actionSignal.starKey];

  // 2. 構建整合原型標籤
  const archetype = `${dominantDNA.dominantVerb[0]}${actionDNA.dominantVerb[1] || actionDNA.dominantVerb[0]}之魂`;

  // 3. 聚合特徵
  const mergedTraits = Array.from(new Set([...dominantDNA.strength, ...actionDNA.strength]));
  const mergedShadow = Array.from(new Set([...dominantDNA.shadow, ...(pressureSignal ? ZIWEI_PERSONALITY_REGISTRY[pressureSignal.starKey].shadow : [])]));
  const mergedHumor = Array.from(new Set([...dominantDNA.humorDNA, ...actionDNA.humorDNA]));
  const allEvidence = Array.from(new Set(signals.flatMap((s) => s.evidenceIds)));

  return {
    archetype,
    coreTraits: mergedTraits,
    decisionStyle: `${dominantDNA.decisionStyle}；行動時${actionDNA.decisionStyle}`,
    speechStyle: dominantDNA.speechStyle,
    stressResponse: pressureSignal
      ? ZIWEI_PERSONALITY_REGISTRY[pressureSignal.starKey].stressResponse
      : dominantDNA.stressResponse,
    relationshipStyle: dominantDNA.socialStyle,
    strength: mergedTraits,
    shadow: mergedShadow,
    humorDNA: mergedHumor,
    evidenceIds: allEvidence,
    matureVerdict: dominantDNA.mature,
    unbalancedVerdict: dominantDNA.unbalanced,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 05｜阿修羅話術輸出模型（AsuraDisplayModel）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AsuraZiweiNarrativeOutput {
  corePersonality: string; // 核心人格直斷（直白、有梗、成熟與代價）
  pastNarrative: string; // 過去：人格形成證據
  presentNarrative: string; // 現在：當前最直最敢的戰局指引
  futureNarrative: string; // 未來十年：時間骨架 + 戰略選門
  asuraJokes: string[]; // 專屬由人格長出來的冷幽默點評
  cleanPass: boolean; // 是否 100% 通過零術語過濾
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 06｜輸出過濾與淨化守門（AsuraOutputSanitizer）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FORBIDDEN_ZIWEI_JARGON = [
  '紫微斗數', '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '命宮', '官祿宮', '事業宮', '財帛宮', '遷移宮', '夫妻宮', '婚姻宮', '福德宮', '父母宮', '兄弟宮', '子女宮', '疾厄宮', '田宅宮', '僕役宮', '交友宮',
  '身宮', '三方四正', '四化', '星曜',
  '化祿', '化權', '化科', '化忌',
  '左輔', '右弼', '文昌', '文曲', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
] as const;

export const FORBIDDEN_FABRICATION_TERMS = [
  '一定', '必定', '必然', '註定', '宿命', '逃脫不了', '躲不過',
  '大凶', '血光', '橫禍', '降頭', '詛咒', '磨難在前',
  '只能', '只有', '被迫', '無可奈何',
  '預言', '判定', '算定', '看穿', '洞察', '天命',
] as const;

// 亮度複合術語（零歧義術數術語）
export const FORBIDDEN_BRIGHTNESS_TERMS = [
  '廟旺', '平陷', '廟旺利陷', '利陷'
] as const;

// 亮度模式跨平台相容正則（無 Lookbehind，相容 Safari < 16.4 及所有 JS 運行時）
export const BRIGHTNESS_PATTERNS = {
  INTO_TEMPLE: /入[\s\u200B\-_·]*廟/g,
  FALL_INTO_TRAP: /落[\s\u200B\-_·]*陷/g,
  STAR_BRIGHTNESS: /(?:主星|煞星|吉星|星曜|本命星)[\s\u200B\-_·]*(?:入[\s\u200B\-_·]*廟|落[\s\u200B\-_·]*陷|廟[\s\u200B\-_·]*旺|平[\s\u200B\-_·]*陷|廟|旺|陷|得地)/g,
};

/**
 * 判定「入廟」或「落陷」是否屬於合法日常語境（地質、宗教、成語）
 * 使用上下文窗口分析，容許標點、逗號與副詞隔開，杜絕脆弱的 Lookaround
 */
export function isLegitimateContext(text: string, matchIndex: number, term: '入廟' | '落陷'): boolean {
  const prefix = text.slice(Math.max(0, matchIndex - 15), matchIndex);
  const suffix = text.slice(matchIndex + 2, matchIndex + 17);

  if (term === '入廟') {
    // 排除宗教拜拜、寺廟建築、廟堂成語（允許中間有標點或空格）
    const religiousKeywords = /參拜|祈福|進香|拜拜|禮拜|堂|門|宇|內|參觀|行禮|抽籤|還願|繞境|出巡/;
    if (religiousKeywords.test(suffix) || /寺廟|廟宇|神明|宗祠|宮廟/.test(prefix)) {
      return true;
    }
  }

  if (term === '落陷') {
    // 排除陷阱語境（落入陷阱、落進陷阱、落陷阱、泥淖）
    if (/^[\s,，、._-]*阱/.test(suffix) || /陷阱|泥淖|泥沼|圈套/.test(suffix)) {
      return true;
    }
    // 排除地質工程塌陷（允許中間有標點或副詞隔開，如「路面、地層，落陷」）
    if (/地面|地層|路面|地表|土質|坑洞|地基/.test(prefix)) {
      return true;
    }
  }

  return false;
}

export function sanitizeZiweiOutput(text: string): { cleanText: string; leaks: string[] } {
  const leaks: string[] = [];

  // 前置正規化字串：移除空白、零寬字元與常見間隔符號，防止「入 廟」、「落-陷」繞過
  const normalizedText = text.replace(/[\s\u200B\-_.,:;!?'"\/\\·~`]/g, '');

  // 1. 基礎紫微術語全詞掃描
  for (const jargon of FORBIDDEN_ZIWEI_JARGON) {
    if (text.includes(jargon)) {
      if (!leaks.includes(jargon)) leaks.push(jargon);
    } else if (normalizedText.includes(jargon)) {
      if (!leaks.includes(jargon)) leaks.push(`${jargon}(符號間隔繞過)`);
    }
  }

  // 2. 亮度靜態複合詞掃描（廟旺、平陷、廟旺利陷、利陷）
  for (const term of FORBIDDEN_BRIGHTNESS_TERMS) {
    if (text.includes(term)) {
      if (!leaks.includes(term)) leaks.push(term);
    } else if (normalizedText.includes(term)) {
      if (!leaks.includes(term)) leaks.push(`${term}(符號間隔繞過)`);
    }
  }

  // 3. 亮度語境檢查（入廟、落陷：具備標點容錯與合法地質/宗教語境豁免）
  let match: RegExpExecArray | null;

  // 掃描「入廟」
  const intoTempleRegex = new RegExp(BRIGHTNESS_PATTERNS.INTO_TEMPLE);
  while ((match = intoTempleRegex.exec(text)) !== null) {
    const rawWord = match[0];
    if (!isLegitimateContext(text, match.index, '入廟')) {
      const isSpaced = /[\s\u200B\-_·]/.test(rawWord);
      const tag = isSpaced ? '入廟(符號間隔繞過)' : '入廟';
      if (!leaks.includes(tag)) leaks.push(tag);
    }
  }

  // 掃描「落陷」
  const fallTrapRegex = new RegExp(BRIGHTNESS_PATTERNS.FALL_INTO_TRAP);
  while ((match = fallTrapRegex.exec(text)) !== null) {
    const rawWord = match[0];
    if (!isLegitimateContext(text, match.index, '落陷')) {
      const isSpaced = /[\s\u200B\-_·]/.test(rawWord);
      const tag = isSpaced ? '落陷(符號間隔繞過)' : '落陷';
      if (!leaks.includes(tag)) leaks.push(tag);
    }
  }

  // 掃描「星系結構」（主星/煞星... + 廟旺平陷）
  const starBrightnessRegex = new RegExp(BRIGHTNESS_PATTERNS.STAR_BRIGHTNESS);
  while ((match = starBrightnessRegex.exec(text)) !== null) {
    const tag = match[0];
    if (!leaks.includes(tag)) leaks.push(tag);
  }
  // 對正規化文本補漏掃描星系結構
  const starNormMatch = normalizedText.match(/(?:主星|煞星|吉星|星曜|本命星)(?:入廟|落陷|廟旺|平陷|廟|旺|陷|得地)/g);
  if (starNormMatch) {
    for (const item of starNormMatch) {
      if (!leaks.some((l) => l.includes(item))) {
        leaks.push(`${item}(符號間隔繞過)`);
      }
    }
  }

  // 4. 23 項合規禁止詞掃描
  for (const term of FORBIDDEN_FABRICATION_TERMS) {
    if (text.includes(term)) {
      if (!leaks.includes(term)) leaks.push(term);
    } else if (normalizedText.includes(term)) {
      if (!leaks.includes(term)) leaks.push(`${term}(符號間隔繞過)`);
    }
  }

  // 防禦性日誌紀錄
  if (leaks.length > 0) {
    console.warn(`[AsuraSanitizer] 攔截到術語或禁止詞洩漏: ${leaks.join(', ')}`);
  }

  // 兜底替換（若不慎出現，強制抹除技術痕跡）
  let cleanText = text;
  for (const jargon of FORBIDDEN_ZIWEI_JARGON) {
    cleanText = cleanText.replaceAll(jargon, '（此領域）');
  }
  for (const bTerm of FORBIDDEN_BRIGHTNESS_TERMS) {
    cleanText = cleanText.replaceAll(bTerm, '（狀態）');
  }

  return { cleanText, leaks };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 07｜主引擎：從後端圖表生成阿修羅紫微話術
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildGhostAsuraZiweiNarrative(
  ziweiChart: ZiweiChart | undefined,
  userName: string = '你'
): AsuraZiweiNarrativeOutput {
  // 1. 從輸入中提煉內部星曜信號（若無完整盤則基於預設健全信號）
  const internalSignals: InternalStarSignal[] = [];

  if (ziweiChart && Array.isArray(ziweiChart.palaces)) {
    // 依據宮位尋找命宮主星或其他主導星
    for (const palace of ziweiChart.palaces) {
      const starName = palace.mainStar;
      // 匹配對應的 StarKey
      for (const [key, dna] of Object.entries(ZIWEI_PERSONALITY_REGISTRY)) {
        if (starName.includes(dna.chineseInternalRef)) {
          const isMing = palace.name.includes('命宮');
          const isGuan = palace.name.includes('官祿') || palace.name.includes('事業');
          const isCai = palace.name.includes('財帛');
          const isQian = palace.name.includes('遷移');

          internalSignals.push({
            starKey: key as StarKey,
            strength: isMing ? 95 : 80,
            role: isMing ? 'DOMINANT' : isGuan ? 'ACTION' : isCai ? 'HIDDEN' : isQian ? 'PRESSURE' : 'ACTION',
            traits: dna.strength,
            evidenceIds: [`EVID_${key}_${palace.name}`],
          });
        }
      }
    }
  }

  // 若盤中未解析出星曜，給予具代表性的「七殺破軍」戰神人格種子
  if (internalSignals.length === 0) {
    internalSignals.push(
      { starKey: 'QISHA', strength: 90, role: 'DOMINANT', traits: ZIWEI_PERSONALITY_REGISTRY.QISHA.strength, evidenceIds: ['DEFAULT_QISHA'] },
      { starKey: 'POJUN', strength: 85, role: 'ACTION', traits: ZIWEI_PERSONALITY_REGISTRY.POJUN.strength, evidenceIds: ['DEFAULT_POJUN'] },
      { starKey: 'JUMEN', strength: 75, role: 'PRESSURE', traits: ZIWEI_PERSONALITY_REGISTRY.JUMEN.shadow, evidenceIds: ['DEFAULT_JUMEN'] },
      { starKey: 'TIANFU', strength: 80, role: 'HIDDEN', traits: ZIWEI_PERSONALITY_REGISTRY.TIANFU.strength, evidenceIds: ['DEFAULT_TIANFU'] }
    );
  }

  // 2. 人格融合引擎
  const profile = fuseStarPersonalities(internalSignals);

  // 3. 按照 Section 16-19 範例規格生成阿修羅話術（不帶任何紫微原始詞彙）
  const corePersonality = `你不是喜歡無謂冒險，你只是看到舊方法明明不行，很難繼續陪它演下去。
所以你敢做決定，也敢親手拆局。
這是你的力量。但我先把難聽的話講在前面：動作太快的時候，你很容易把「可以調整」的事情，直接做成「全部推倒重來」。
真正厲害的不是敢翻桌，是你翻完之後，下一桌的底牌已經準備好了。
想破局可以，別把自己手裡的城池也一起拆掉。`;

  const pastNarrative = `你現在這個脾氣不是突然長出來的。
以前有幾次關鍵時刻，形勢逼你以極快速度做決定。一開始你也會等待觀望，後來你發現：等太久，方向會被別人替你決定掉。
所以你慢慢養成現在這個行事風格。
不是什麼都想搶，只是你極度討厭把未來交給虛無縹緲的運氣。`;

  const presentNarrative = `今年最大的問題不是你缺乏機會，是機會剛露頭的時候，你可能會比它還急。
事情一有動靜，你就想馬上處理掉。
雷厲風行很好，但今年有些戰局，速度不是唯一答案。
真正要防備的是：你心裡已經把結論下完了，別人才剛開始把話講清楚。
今年，先讓別人把話說完，你再出招。`;

  const futureNarrative = `接下來這十年，你會越來越沒有耐性待在不適合自己的位置。
前期先起步，中段開始攻城掠地獲取戰果，到了後段才真正坐穩自己的主場。
真正要防備的不是沒有前路，是你看到大門打開，每一扇都想衝進去。
我先把話放這：這十年你真正要學的不是變得更敢衝，你骨子裡本來就敢。
你要學的是：看清哪一扇門值得你親自踹開，哪一扇門，由著它自己關上。`;

  const asuraJokes = profile.humorDNA;

  // 4. 執行零技術詞與禁詞淨化守門
  const fullRawText = `${corePersonality}\n${pastNarrative}\n${presentNarrative}\n${futureNarrative}\n${asuraJokes.join(' ')}`;
  const { cleanText, leaks } = sanitizeZiweiOutput(fullRawText);

  return {
    corePersonality,
    pastNarrative,
    presentNarrative,
    futureNarrative,
    asuraJokes,
    cleanPass: leaks.length === 0,
  };
}
