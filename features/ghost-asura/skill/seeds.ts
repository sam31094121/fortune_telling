/**
 * 鬼魅阿修羅 Skill — 固定知識（Core Meaning）。
 *
 * 以 asuraId（＝後端規則編號 DUAL_SHENSHA_RULES 的 id）為唯一索引；名稱可改、編號不變。
 * coreMeaning 由本派既有導師話術（lib/iching-shensha-teacher-readings.ts 的本意）精簡而來，
 * 不含原始神煞名；極性（polarity）與該檔的 tone 一致，稽核測試會比對，兩邊飄移就失敗。
 *
 * 這裡只放「固定」的東西；個人化（柱位等）由解析器依已驗證證據在執行時組合。
 */

export type AsuraPolarity = 'positive' | 'dynamic' | 'caution';

export interface AsuraSeed {
  polarity: AsuraPolarity;
  coreMeaning: string;
  domain: readonly string[];
  keywords: readonly string[];
}

const P = 'positive' as const;
const D = 'dynamic' as const;
const C = 'caution' as const;

export const ASURA_SEEDS: Readonly<Record<string, AsuraSeed>> = {
  tiandehe: { polarity: P, coreMeaning: '暗處有人托你一把，福氣在轉角處才現身。', domain: ['貴人', '護佑'], keywords: ['暗助', '轉角', '貴人'] },
  tiande: { polarity: P, coreMeaning: '厚道是護身的底，遇事多半緩而能圓。', domain: ['護佑', '品德'], keywords: ['厚道', '化解', '緩圓'] },
  yuede: { polarity: P, coreMeaning: '溫柔的庇蔭來自家人與身邊人。', domain: ['家庭', '護佑'], keywords: ['庇蔭', '家人', '支持'] },
  longde: { polarity: P, coreMeaning: '有氣勢也有德行，站上舞台時別人願意信你、跟你。', domain: ['事業', '聲望'], keywords: ['德望', '舞台', '信服'] },
  tiangou: { polarity: C, coreMeaning: '提醒守住自己的資源與心力，別讓它被暗中消耗。', domain: ['財務', '心力'], keywords: ['守成', '損耗', '門戶'] },
  jinkui: { polarity: P, coreMeaning: '有聚財與存底的能力，資源留得下來。', domain: ['財庫', '理財'], keywords: ['存底', '聚財', '資源'] },
  wugui: { polarity: C, coreMeaning: '暗處的雜音與算計容易擾亂心神，要看清再動。', domain: ['人際', '情緒'], keywords: ['雜音', '小人', '判斷'] },
  zaisha: { polarity: C, coreMeaning: '提醒意外與風險，這一面的事要多一分預備。', domain: ['風險', '行動'], keywords: ['預備', '意外', '居安思危'] },
  liue: { polarity: C, coreMeaning: '人生有關卡，事情常要多繞一圈才成。', domain: ['事業', '成長'], keywords: ['關卡', '磨練', '繞路'] },
  muyu: { polarity: D, coreMeaning: '洗去舊塵、重整自己，感受重，容易被情緒與感情牽動。', domain: ['感情', '蛻變'], keywords: ['洗滌', '新生', '情緒'] },
  yuepo: { polarity: D, coreMeaning: '環境逼你改變，破的是舊框架。', domain: ['事業', '環境'], keywords: ['突破', '變動', '舊框架'] },
  ripo: { polarity: D, coreMeaning: '與這一面的人事容易有拉扯，也常是突破口。', domain: ['人際', '感情'], keywords: ['衝突', '拉扯', '突破'] },
  jiangxing: { polarity: D, coreMeaning: '有主見、能服眾，適合站在前面帶隊。', domain: ['事業', '領導'], keywords: ['領導', '主見', '服眾'] },
  yima: { polarity: D, coreMeaning: '奔走與變動多，機會多半在移動中出現。', domain: ['行動', '事業'], keywords: ['變動', '遠行', '機會'] },
  gejiao: { polarity: C, coreMeaning: '與這一面的人事隔著一道牆，要有人先敲門。', domain: ['人際', '關係'], keywords: ['隔閡', '敲門', '善意'] },
  yuanchen: { polarity: C, coreMeaning: '心裡的暗潮容易想太多，或一時衝動失了分寸。', domain: ['情緒', '決策'], keywords: ['暗潮', '鑽牛角尖', '分寸'] },
  yangren: { polarity: D, coreMeaning: '有魄力與衝勁，鋒芒太露時容易傷人傷己。', domain: ['行動', '決策'], keywords: ['鋒芒', '魄力', '決斷'] },
  taohua: { polarity: D, coreMeaning: '人緣與魅力旺，走到哪裡都容易被看見。', domain: ['感情', '人際'], keywords: ['人緣', '魅力', '吸引'] },
  waiTaohua: { polarity: P, coreMeaning: '人緣往外走，外面的貴人與好感特別多。', domain: ['人際', '貴人'], keywords: ['外緣', '異性緣', '貴人'] },
  tianyi: { polarity: P, coreMeaning: '命中最重要的貴人，遇到困難時常有人伸手相助。', domain: ['貴人', '護佑'], keywords: ['貴人', '援手', '助力'] },
  wenchang: { polarity: P, coreMeaning: '學得快、表達有條理，文思清楚。', domain: ['學習', '文筆'], keywords: ['文思', '學習', '表達'] },
  huagai: { polarity: D, coreMeaning: '才華與哲思兼備，也帶一份愛獨處的孤高。', domain: ['才藝', '靈性'], keywords: ['才華', '獨處', '靈性'] },
  kuigang: { polarity: D, coreMeaning: '自身帶著剛強之氣，主見強、有決斷、說一不二。', domain: ['性格', '決策'], keywords: ['剛毅', '決斷', '主見'] },
  kongwang: { polarity: C, coreMeaning: '看得見、還沒抓牢，需要多一分經營。', domain: ['事業', '關係'], keywords: ['落空', '經營', '抓牢'] },
  jinyu: { polarity: P, coreMeaning: '生活有依靠、出入有助力，常得身邊人的資源相挺。', domain: ['家庭', '財庫'], keywords: ['依靠', '助力', '伴侶'] },
  xuetang: { polarity: P, coreMeaning: '理解力與模仿力強，學什麼上手快。', domain: ['學習', '氣質'], keywords: ['學習力', '上手', '書卷'] },
  hongyan: { polarity: D, coreMeaning: '自身散發浪漫魅力，容易被欣賞、被喜歡。', domain: ['感情', '形象'], keywords: ['魅力', '浪漫', '欣賞'] },
  lushen: { polarity: P, coreMeaning: '靠自己的本事就有飯吃，衣食有根基。', domain: ['財庫', '事業'], keywords: ['衣食', '自立', '底氣'] },
  tianyiDoctor: { polarity: P, coreMeaning: '懂得照顧與修復，適合往助人與療癒的方向發展。', domain: ['健康', '照護'], keywords: ['照顧', '修復', '療癒'] },
  jiesha: { polarity: C, coreMeaning: '外來的變數與牽連，要多一道防護。', domain: ['風險', '財務'], keywords: ['變數', '防護', '備案'] },
  guchen: { polarity: C, coreMeaning: '獨立內斂，習慣自己消化事情，不太開口求助。', domain: ['心理', '關係'], keywords: ['獨立', '內斂', '孤單'] },
  guasu: { polarity: C, coreMeaning: '安靜自守，對關係謹慎，給人淡淡的距離感。', domain: ['感情', '關係'], keywords: ['自守', '謹慎', '距離'] },
  guoyin: { polarity: P, coreMeaning: '誠信可靠，別人願意把重要的事交到你手上。', domain: ['事業', '信用'], keywords: ['誠信', '掌印', '可靠'] },
  tianchu: { polarity: P, coreMeaning: '口福與生活品味，衣食上較少匱乏。', domain: ['生活', '財庫'], keywords: ['口福', '享受', '衣食'] },
  tianshe: { polarity: P, coreMeaning: '犯錯常有重來的機會，懂得原諒人與自己。', domain: ['護佑', '心理'], keywords: ['寬容', '重來', '原諒'] },
  sanqi: { polarity: P, coreMeaning: '胸襟開闊、多才多藝，常有與眾不同的表現。', domain: ['才藝', '事業'], keywords: ['奇才', '多才', '不同'] },
  wangshen: { polarity: C, coreMeaning: '內在的不安，容易多想、計較得失或被流言影響。', domain: ['情緒', '人際'], keywords: ['不安', '多想', '流言'] },
  yinyangChacuo: { polarity: C, coreMeaning: '親近關係裡容易有「你以為、我以為」的誤會。', domain: ['感情', '溝通'], keywords: ['默契', '誤會', '溝通'] },
  guluan: { polarity: C, coreMeaning: '關係裡特別渴望被理解，也容易覺得對方沒懂自己。', domain: ['感情', '心理'], keywords: ['陪伴', '理解', '期待'] },
  shieDabai: { polarity: C, coreMeaning: '錢來得快也容易去得快，要有理財的紀律。', domain: ['理財', '財務'], keywords: ['紀律', '開銷', '存底'] },
  liuxia: { polarity: C, coreMeaning: '行動快、衝勁足，偶爾因為匆忙而疏忽。', domain: ['行動', '安全'], keywords: ['匆忙', '出入', '留心'] },
  sifei: { polarity: C, coreMeaning: '開頭熱、後段容易鬆，事情常卡在收尾。', domain: ['恆心', '事業'], keywords: ['收尾', '耐心', '恆心'] },
  yuedehe: { polarity: P, coreMeaning: '庇蔭常經由身邊人的善意轉個彎來到你身上。', domain: ['貴人', '家庭'], keywords: ['善意', '轉彎', '庇蔭'] },
  feiren: { polarity: C, coreMeaning: '衝勁外放、反應快，也容易說得太快、做得太急。', domain: ['行動', '溝通'], keywords: ['鋒芒', '急', '外放'] },
  jinshen: { polarity: D, coreMeaning: '剛強有魄力，遇難題敢扛、敢決斷，也需要柔軟來平衡。', domain: ['決策', '性格'], keywords: ['魄力', '決斷', '柔軟'] },
  bazhuan: { polarity: D, coreMeaning: '專注投入，一旦認定就全心全意。', domain: ['感情', '專注'], keywords: ['專一', '深情', '投入'] },
  jiuchou: { polarity: C, coreMeaning: '形象與人際容易被誤解，關係裡多些起伏。', domain: ['形象', '人際'], keywords: ['誤解', '形象', '起伏'] },
  liuxiu: { polarity: P, coreMeaning: '聰明秀氣，有才華與品味，容易給人好印象。', domain: ['才藝', '形象'], keywords: ['聰明', '品味', '好印象'] },
  sangmen: { polarity: C, coreMeaning: '常伴隨結束與轉換，舊的一頁翻過，新的一章才開始。', domain: ['轉換', '家庭'], keywords: ['告別', '轉換', '新章'] },
  baihu: { polarity: C, coreMeaning: '力量強、氣勢足，也要守分寸，衝得太快容易磕碰。', domain: ['行動', '安全'], keywords: ['氣勢', '分寸', '守門'] },
  bingfu: { polarity: C, coreMeaning: '提醒身心需要休息，這一面的人事容易讓你累。', domain: ['健康', '心力'], keywords: ['休息', '疲累', '身心'] },
  pima: { polarity: C, coreMeaning: '容易承擔別人的情緒與重量，要學會卸下不屬於自己的擔子。', domain: ['心理', '人際'], keywords: ['承擔', '放下', '卸擔'] },
  suipo: { polarity: C, coreMeaning: '與大環境、長輩或既定安排有拉扯，需要多一分協調。', domain: ['環境', '家庭'], keywords: ['協調', '拉扯', '大環境'] },
  yuekong: { polarity: P, coreMeaning: '清明有文采，把想法寫下來、說出來就容易得到賞識。', domain: ['文筆', '貴人'], keywords: ['清明', '文采', '賞識'] },
  jielu: { polarity: C, coreMeaning: '行動上容易阻滯，計畫常卡在執行，需要預留彈性。', domain: ['行動', '計畫'], keywords: ['阻滯', '彈性', '執行'] },
  tianzhuan: { polarity: D, coreMeaning: '力量強、轉變快，也提醒不要一時衝得太猛。', domain: ['行動', '時機'], keywords: ['轉變', '時機', '節奏'] },
  dizhuan: { polarity: D, coreMeaning: '根基的力量強，做事扎實，也容易固執己見。', domain: ['事業', '性格'], keywords: ['扎實', '根基', '固執'] },
  shiling: { polarity: P, coreMeaning: '直覺敏銳、反應靈活，常有一點就通的悟性。', domain: ['學習', '直覺'], keywords: ['直覺', '悟性', '靈活'] },
  ride: { polarity: P, coreMeaning: '為人厚道、心地光明，遇事容易逢凶化吉。', domain: ['品德', '護佑'], keywords: ['厚德', '光明', '化吉'] },
  rigui: { polarity: P, coreMeaning: '自帶貴氣，常得長輩或貴人欣賞。', domain: ['貴人', '形象'], keywords: ['貴氣', '賞識', '長輩'] },
  panan: { polarity: D, coreMeaning: '像上馬前先攀住馬鞍，主升遷、受提拔，在位子上站穩。', domain: ['事業', '升遷'], keywords: ['提拔', '升遷', '站穩'] },
  anlu: { polarity: P, coreMeaning: '暗中有人照應，關鍵時刻有意外的資源與援手。', domain: ['財庫', '貴人'], keywords: ['暗助', '資糧', '援手'] },
  jinshenDay: { polarity: D, coreMeaning: '積極進取、敢做敢衝，容易把握先機。', domain: ['行動', '事業'], keywords: ['進取', '先機', '敢衝'] },
  gonglu: { polarity: P, coreMeaning: '福祿藏而不露，越到後來越豐厚。', domain: ['財庫', '晚運'], keywords: ['藏福', '晚來', '豐厚'] },
  tuishen: { polarity: C, coreMeaning: '做事容易猶豫、想退，但懂得退也是一種智慧。', domain: ['決策', '心理'], keywords: ['收斂', '猶豫', '退一步'] },
};
