import type { TarotAiElement, TarotCard, TarotElementWeights, TarotSuit, TarotVisualKnowledge } from '@/features/tarot/types';

type TarotCardSeed = Omit<TarotCard, 'imageUrl' | 'symbolism' | 'elementWeights' | 'visualKnowledge'> & Partial<Pick<TarotCard, 'symbolism' | 'elementWeights' | 'visualKnowledge'>>;

const AI_ELEMENTS: Array<keyof TarotElementWeights> = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];

const AI_ELEMENT_LABELS: Record<keyof TarotElementWeights, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

const MAJOR_ELEMENT_WEIGHTS: TarotElementWeights[] = [
  { AIR: 22, SPACE: 30, WATER: 18, FIRE: 18, EARTH: 12 },
  { AIR: 18, SPACE: 24, WATER: 10, FIRE: 34, EARTH: 14 },
  { AIR: 14, SPACE: 34, WATER: 34, FIRE: 6, EARTH: 12 },
  { AIR: 10, SPACE: 16, WATER: 28, FIRE: 14, EARTH: 32 },
  { AIR: 16, SPACE: 16, WATER: 8, FIRE: 22, EARTH: 38 },
  { AIR: 20, SPACE: 30, WATER: 14, FIRE: 10, EARTH: 26 },
  { AIR: 20, SPACE: 16, WATER: 34, FIRE: 18, EARTH: 12 },
  { AIR: 18, SPACE: 12, WATER: 8, FIRE: 42, EARTH: 20 },
  { AIR: 12, SPACE: 18, WATER: 22, FIRE: 34, EARTH: 14 },
  { AIR: 26, SPACE: 34, WATER: 16, FIRE: 6, EARTH: 18 },
  { AIR: 20, SPACE: 36, WATER: 14, FIRE: 16, EARTH: 14 },
  { AIR: 34, SPACE: 18, WATER: 10, FIRE: 10, EARTH: 28 },
  { AIR: 16, SPACE: 38, WATER: 24, FIRE: 6, EARTH: 16 },
  { AIR: 8, SPACE: 30, WATER: 30, FIRE: 10, EARTH: 22 },
  { AIR: 12, SPACE: 26, WATER: 24, FIRE: 18, EARTH: 20 },
  { AIR: 18, SPACE: 18, WATER: 12, FIRE: 32, EARTH: 20 },
  { AIR: 20, SPACE: 22, WATER: 10, FIRE: 30, EARTH: 18 },
  { AIR: 18, SPACE: 34, WATER: 26, FIRE: 12, EARTH: 10 },
  { AIR: 14, SPACE: 30, WATER: 38, FIRE: 6, EARTH: 12 },
  { AIR: 18, SPACE: 14, WATER: 12, FIRE: 42, EARTH: 14 },
  { AIR: 22, SPACE: 34, WATER: 18, FIRE: 10, EARTH: 16 },
  { AIR: 18, SPACE: 32, WATER: 18, FIRE: 14, EARTH: 18 },
];

const SUIT_ELEMENT_WEIGHTS: Record<TarotSuit, TarotElementWeights> = {
  wands: { AIR: 18, SPACE: 10, WATER: 8, FIRE: 44, EARTH: 20 },
  cups: { AIR: 10, SPACE: 18, WATER: 46, FIRE: 8, EARTH: 18 },
  swords: { AIR: 46, SPACE: 18, WATER: 8, FIRE: 18, EARTH: 10 },
  pentacles: { AIR: 10, SPACE: 10, WATER: 16, FIRE: 16, EARTH: 48 },
};

const SUIT_ZH: Record<TarotSuit, string> = {
  wands: '權杖',
  cups: '聖杯',
  swords: '寶劍',
  pentacles: '錢幣',
};

const SUIT_EN: Record<TarotSuit, string> = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles',
};

const SUIT_SYMBOL: Record<TarotSuit, string> = {
  wands: 'W',
  cups: 'C',
  swords: 'S',
  pentacles: 'P',
};

const SUIT_THEMES: Record<TarotSuit, { upright: string; reversed: string; reflection: string; keywords: string[]; reversedKeywords: string[] }> = {
  wands: {
    upright: '權杖關注行動、熱情、創造力與推進事情的火候。這張牌提醒你觀察自己的動能從哪裡來，以及是否有足夠清楚的方向。',
    reversed: '權杖逆位常指向能量分散、急躁或暫時提不起勁。它提醒你先整理節奏，不必用衝刺解決每個問題。',
    reflection: '我現在真正想投入的行動，是出於熱情，還是出於壓力？',
    keywords: ['行動', '熱情', '推進'],
    reversedKeywords: ['延遲', '急躁', '能量分散'],
  },
  cups: {
    upright: '聖杯關注情緒、關係、直覺與內在需求。這張牌提醒你把感受當成資訊，而不是急著否定或放大它。',
    reversed: '聖杯逆位常指向情緒壓抑、期待落差或關係中的模糊。它提醒你先照顧感受，再決定如何回應。',
    reflection: '在這件事裡，我最需要被理解或被照顧的是哪一部分？',
    keywords: ['感受', '連結', '直覺'],
    reversedKeywords: ['壓抑', '失衡', '期待落差'],
  },
  swords: {
    upright: '寶劍關注思考、溝通、判斷與界線。這張牌提醒你用清楚的語言看待問題，也留意想法是否過度尖銳。',
    reversed: '寶劍逆位常指向思緒打結、溝通卡住或過度自我批判。它提醒你先把問題拆小，不急著定論。',
    reflection: '我有哪些想法是事實，哪些只是焦慮推演？',
    keywords: ['思考', '溝通', '界線'],
    reversedKeywords: ['混亂', '誤解', '自我批判'],
  },
  pentacles: {
    upright: '錢幣關注資源、身體、時間、工作成果與現實基礎。這張牌提醒你回到可落地的安排。',
    reversed: '錢幣逆位常指向資源分配失衡、過度保守或忽略身心成本。它提醒你檢查目前的投入是否可持續。',
    reflection: '我現在最需要穩住的現實資源是時間、金錢、身體，還是專注力？',
    keywords: ['資源', '落地', '穩定'],
    reversedKeywords: ['失衡', '耗損', '延宕'],
  },
};

const RANKS = [
  { key: 'ace', zh: '一', en: 'Ace', n: 1, upright: '新的開端正在成形，重點是先接住最核心的可能性。', reversed: '起點還不穩，可能需要先確認動機與可投入的資源。', keywords: ['開端', '可能性'] },
  { key: 'two', zh: '二', en: 'Two', n: 2, upright: '兩股力量正在互相拉扯，重點是協調而不是急著選邊。', reversed: '卡住通常來自猶豫或資訊不足，需要先整理優先順序。', keywords: ['選擇', '協調'] },
  { key: 'three', zh: '三', en: 'Three', n: 3, upright: '事情開始向外延伸，適合觀察合作、規劃與下一步視野。', reversed: '合作或期待可能不一致，先把共同目標說清楚會更穩。', keywords: ['擴展', '合作'] },
  { key: 'four', zh: '四', en: 'Four', n: 4, upright: '結構與安全感是焦點，適合建立界線、制度或休息空間。', reversed: '過度固守可能讓事情失去流動，檢查安全感是否變成限制。', keywords: ['結構', '安全'] },
  { key: 'five', zh: '五', en: 'Five', n: 5, upright: '變動與摩擦浮上檯面，這不是終點，而是看見問題的位置。', reversed: '衝突有機會下降，但仍需要承認損耗並重新分配能量。', keywords: ['變動', '摩擦'] },
  { key: 'six', zh: '六', en: 'Six', n: 6, upright: '調整後的流動逐漸恢復，適合接受支持或重新建立互惠。', reversed: '付出與接受可能不平衡，先看清楚自己承擔了什麼。', keywords: ['支持', '修復'] },
  { key: 'seven', zh: '七', en: 'Seven', n: 7, upright: '你需要更有策略地面對挑戰，保留力量比硬碰硬更重要。', reversed: '防備或拖延可能讓判斷變窄，先回到可驗證的資訊。', keywords: ['策略', '挑戰'] },
  { key: 'eight', zh: '八', en: 'Eight', n: 8, upright: '事情進入累積與調整期，專注重複練習會比等待靈感有效。', reversed: '節奏可能過快或過慢，需要重新校準投入方式。', keywords: ['累積', '節奏'] },
  { key: 'nine', zh: '九', en: 'Nine', n: 9, upright: '接近完成但仍需照顧細節，留意成果背後的真實感受。', reversed: '表面已接近完成，內在卻可能疲憊或缺少滿足感。', keywords: ['成果', '整合'] },
  { key: 'ten', zh: '十', en: 'Ten', n: 10, upright: '一個階段抵達總結，適合檢視收穫、負擔與下一輪循環。', reversed: '負擔可能過重或結束感不明，先釐清哪些責任該放下。', keywords: ['完成', '循環'] },
  { key: 'page', zh: '侍者', en: 'Page', n: 11, upright: '帶著學習者的心重新靠近問題，小步嘗試會帶來線索。', reversed: '經驗不足不是問題，問題是急著證明自己而忽略練習。', keywords: ['學習', '訊息'] },
  { key: 'knight', zh: '騎士', en: 'Knight', n: 12, upright: '行動力正在聚集，適合推進，但仍要留意節奏與方向。', reversed: '行動可能過衝或停滯，先確認目的再前進。', keywords: ['推進', '方向'] },
  { key: 'queen', zh: '皇后', en: 'Queen', n: 13, upright: '成熟的接納與照顧能讓事情變得穩定，先看見需求。', reversed: '照顧可能失衡，別讓理解他人變成忽略自己。', keywords: ['成熟', '照顧'] },
  { key: 'king', zh: '國王', en: 'King', n: 14, upright: '主導與承擔是焦點，適合用穩定的規則推動局面。', reversed: '控制感可能過強或責任分配不清，需要調整權責邊界。', keywords: ['主導', '承擔'] },
] as const;

const MAJOR_CARDS: TarotCardSeed[] = [
  { id: 'major-fool', number: 0, nameZh: '愚者', nameEn: 'The Fool', arcana: 'major', uprightKeywords: ['開始', '信任', '探索'], reversedKeywords: ['魯莽', '遲疑', '準備不足'], uprightMeaning: '愚者象徵新旅程、開放與願意嘗試。它提醒你可以保留好奇，但也要看見腳下的路。', reversedMeaning: '愚者逆位提醒你，現在可能在衝動與退縮之間擺盪。先補足資訊，再決定是否出發。', reflectionPrompt: '如果把結果壓力放小一點，我願意先嘗試哪一步？' },
  { id: 'major-magician', number: 1, nameZh: '魔術師', nameEn: 'The Magician', arcana: 'major', uprightKeywords: ['資源', '意志', '創造'], reversedKeywords: ['分心', '操控', '未整合'], uprightMeaning: '魔術師象徵把手上的資源轉化成行動。它提醒你，工具已在身邊，關鍵是清楚使用。', reversedMeaning: '魔術師逆位提醒你資源可能分散，或表達與真實意圖不一致。先整合再行動。', reflectionPrompt: '我現在手上有哪些資源其實已經足夠支撐第一步？' },
  { id: 'major-high-priestess', number: 2, nameZh: '女祭司', nameEn: 'The High Priestess', arcana: 'major', uprightKeywords: ['直覺', '靜觀', '內在'], reversedKeywords: ['遮蔽', '不信任', '訊息不足'], uprightMeaning: '女祭司象徵安靜觀察與內在智慧。它提醒你，有些答案需要先被聽見，而不是被催促。', reversedMeaning: '女祭司逆位提醒你可能忽略了直覺，或被未說出口的資訊影響判斷。', reflectionPrompt: '我心裡一直知道、但還沒有承認的是什麼？' },
  { id: 'major-empress', number: 3, nameZh: '皇后', nameEn: 'The Empress', arcana: 'major', uprightKeywords: ['滋養', '創造', '感受'], reversedKeywords: ['耗竭', '過度付出', '停滯'], uprightMeaning: '皇后象徵滋養、創造與讓事物自然長成。它提醒你先照顧土壤，再期待結果。', reversedMeaning: '皇后逆位提醒你可能付出太多，或忽略身體與情緒的需求。', reflectionPrompt: '這件事若要長久，我需要先照顧哪個基礎？' },
  { id: 'major-emperor', number: 4, nameZh: '皇帝', nameEn: 'The Emperor', arcana: 'major', uprightKeywords: ['秩序', '界線', '承擔'], reversedKeywords: ['僵化', '控制', '失序'], uprightMeaning: '皇帝象徵秩序、責任與清楚界線。它提醒你用穩定結構保護重要目標。', reversedMeaning: '皇帝逆位提醒你留意過度控制或缺乏規則，兩者都會消耗能量。', reflectionPrompt: '我需要建立哪一條界線，事情才會更穩？' },
  { id: 'major-hierophant', number: 5, nameZh: '教皇', nameEn: 'The Hierophant', arcana: 'major', uprightKeywords: ['傳承', '學習', '價值'], reversedKeywords: ['框架', '盲從', '價值衝突'], uprightMeaning: '教皇象徵傳統、學習與價值系統。它提醒你找回可依循的方法或可靠建議。', reversedMeaning: '教皇逆位提醒你不要只因為「應該」而行動，先確認那是否符合你的價值。', reflectionPrompt: '我正在遵循的規則，哪些是真的支持我？' },
  { id: 'major-lovers', number: 6, nameZh: '戀人', nameEn: 'The Lovers', arcana: 'major', uprightKeywords: ['選擇', '關係', '一致'], reversedKeywords: ['拉扯', '不一致', '逃避選擇'], uprightMeaning: '戀人象徵關係中的選擇與價值一致。它提醒你，真正的靠近需要誠實。', reversedMeaning: '戀人逆位提醒你可能在迎合與真心之間拉扯，需要重新確認自己的選擇。', reflectionPrompt: '如果我對自己誠實，這件事最重要的選擇是什麼？' },
  { id: 'major-chariot', number: 7, nameZh: '戰車', nameEn: 'The Chariot', arcana: 'major', uprightKeywords: ['前進', '意志', '掌舵'], reversedKeywords: ['失控', '硬撐', '方向混亂'], uprightMeaning: '戰車象徵意志力與掌控方向。它提醒你集中力量，讓行動服務於清楚目標。', reversedMeaning: '戰車逆位提醒你可能用力過猛或方向不一致，先停下校準。', reflectionPrompt: '我想抵達的方向是否足夠清楚，還是只是在加速？' },
  { id: 'major-strength', number: 8, nameZh: '力量', nameEn: 'Strength', arcana: 'major', uprightKeywords: ['溫柔', '勇氣', '耐心'], reversedKeywords: ['壓抑', '自我懷疑', '失去耐性'], uprightMeaning: '力量象徵溫柔而穩定的勇氣。它提醒你，真正的力量不一定要用強硬證明。', reversedMeaning: '力量逆位提醒你可能正在壓抑情緒或懷疑自己，需要用耐心重新接住內在。', reflectionPrompt: '我可以如何用更溫和的方式面對這件事？' },
  { id: 'major-hermit', number: 9, nameZh: '隱者', nameEn: 'The Hermit', arcana: 'major', uprightKeywords: ['內省', '尋路', '沉澱'], reversedKeywords: ['孤立', '迴避', '過度封閉'], uprightMeaning: '隱者象徵暫時退後、沉澱與尋找自己的光。它提醒你答案不一定在外界掌聲裡。', reversedMeaning: '隱者逆位提醒你別把需要安靜變成孤立，也別用退開逃避回應。', reflectionPrompt: '如果暫時不看外界期待，我真正看見的是什麼？' },
  { id: 'major-wheel', number: 10, nameZh: '命運之輪', nameEn: 'Wheel of Fortune', arcana: 'major', uprightKeywords: ['轉折', '循環', '機會'], reversedKeywords: ['抗拒', '反覆', '失去節奏'], uprightMeaning: '命運之輪象徵階段轉動與機會變化。它提醒你留意局勢的流向，順勢調整。', reversedMeaning: '命運之輪逆位提醒你可能抗拒變化，或陷入重複模式。先看清循環。', reflectionPrompt: '這件事是否正在重複某個熟悉模式？' },
  { id: 'major-justice', number: 11, nameZh: '正義', nameEn: 'Justice', arcana: 'major', uprightKeywords: ['平衡', '責任', '誠實'], reversedKeywords: ['偏差', '逃避責任', '不公平'], uprightMeaning: '正義象徵誠實、平衡與為選擇負責。它提醒你回到事實，而不是只看情緒。', reversedMeaning: '正義逆位提醒你可能忽略了某個不平衡，或尚未面對選擇的代價。', reflectionPrompt: '若只看事實，這件事目前最清楚的訊號是什麼？' },
  { id: 'major-hanged-man', number: 12, nameZh: '吊人', nameEn: 'The Hanged Man', arcana: 'major', uprightKeywords: ['等待', '換位', '鬆手'], reversedKeywords: ['卡住', '犧牲感', '抗拒停頓'], uprightMeaning: '吊人象徵暫停、換角度與願意鬆手。它提醒你，不推進也可能是一種整理。', reversedMeaning: '吊人逆位提醒你可能停在犧牲感裡，或抗拒必要的視角轉換。', reflectionPrompt: '如果換一個角度看，這件事會出現什麼新理解？' },
  { id: 'major-death', number: 13, nameZh: '死神', nameEn: 'Death', arcana: 'major', uprightKeywords: ['結束', '轉化', '更新'], reversedKeywords: ['抗拒改變', '拖延告別', '停滯'], uprightMeaning: '死神象徵自然的結束與轉化，不是恐嚇，而是提醒舊形式可能需要退場。', reversedMeaning: '死神逆位提醒你可能知道該放下，卻還在拖延。溫和告別能讓新階段出現。', reflectionPrompt: '我正在抓住哪個已經不再支持我的模式？' },
  { id: 'major-temperance', number: 14, nameZh: '節制', nameEn: 'Temperance', arcana: 'major', uprightKeywords: ['調和', '耐心', '整合'], reversedKeywords: ['失衡', '過度', '急躁'], uprightMeaning: '節制象徵調和與長期平衡。它提醒你把兩種看似不同的需求慢慢整合。', reversedMeaning: '節制逆位提醒你節奏可能失衡，太快或太滿都會讓事情難以消化。', reflectionPrompt: '我可以把哪兩個需求放在同一張桌上討論？' },
  { id: 'major-devil', number: 15, nameZh: '惡魔', nameEn: 'The Devil', arcana: 'major', uprightKeywords: ['束縛', '慾望', '模式'], reversedKeywords: ['鬆綁', '覺察', '重獲選擇'], uprightMeaning: '惡魔象徵讓人上癮或受限的模式。它提醒你看見束縛，才有機會拿回選擇。', reversedMeaning: '惡魔逆位提醒你正在鬆動舊模式，但仍需誠實面對誘惑與逃避。', reflectionPrompt: '這件事裡，我把自己的選擇權交給了什麼？' },
  { id: 'major-tower', number: 16, nameZh: '高塔', nameEn: 'The Tower', arcana: 'major', uprightKeywords: ['揭露', '重建', '震盪'], reversedKeywords: ['延後面對', '內在崩解', '避免衝擊'], uprightMeaning: '高塔象徵真相浮現與結構重整。它不代表災難，而是提醒不穩的基礎需要被看見。', reversedMeaning: '高塔逆位提醒你可能在延後面對問題。先小幅修正，能降低之後的衝擊。', reflectionPrompt: '哪個基礎問題其實已經提醒我很久了？' },
  { id: 'major-star', number: 17, nameZh: '星星', nameEn: 'The Star', arcana: 'major', uprightKeywords: ['希望', '療癒', '願景'], reversedKeywords: ['失望', '信心不足', '看不見方向'], uprightMeaning: '星星象徵希望、療癒與重新相信未來的能力。它提醒你慢慢恢復，不必急。', reversedMeaning: '星星逆位提醒你可能暫時看不見希望，但微小照顧仍會累積力量。', reflectionPrompt: '哪一個小小的恢復行動能讓我重新有一點光？' },
  { id: 'major-moon', number: 18, nameZh: '月亮', nameEn: 'The Moon', arcana: 'major', uprightKeywords: ['模糊', '潛意識', '感受'], reversedKeywords: ['看清', '疑慮消散', '真相浮現'], uprightMeaning: '月亮象徵不確定、夢境與潛意識。它提醒你在資訊模糊時，先不要急著下定論。', reversedMeaning: '月亮逆位提醒你迷霧正在變薄，但仍要分辨直覺與恐懼。', reflectionPrompt: '我現在的不安來自可確認的事實，還是來自想像？' },
  { id: 'major-sun', number: 19, nameZh: '太陽', nameEn: 'The Sun', arcana: 'major', uprightKeywords: ['清晰', '活力', '肯定'], reversedKeywords: ['延遲的喜悅', '過度樂觀', '疲憊'], uprightMeaning: '太陽象徵清楚、活力與被看見。它提醒你把事情攤在光下，會更容易前進。', reversedMeaning: '太陽逆位提醒你仍有亮點，但可能被疲憊或過度期待遮住。', reflectionPrompt: '這件事中最清楚、最值得肯定的一點是什麼？' },
  { id: 'major-judgement', number: 20, nameZh: '審判', nameEn: 'Judgement', arcana: 'major', uprightKeywords: ['回應召喚', '覺醒', '總結'], reversedKeywords: ['自責', '逃避回應', '遲疑'], uprightMeaning: '審判象徵階段性的覺醒與回應。它提醒你從過去經驗中提煉下一步。', reversedMeaning: '審判逆位提醒你可能困在自責裡，或還沒準備好承認新的方向。', reflectionPrompt: '過去的經驗正在要求我學會什麼？' },
  { id: 'major-world', number: 21, nameZh: '世界', nameEn: 'The World', arcana: 'major', uprightKeywords: ['完成', '整合', '開展'], reversedKeywords: ['未竟', '收尾', '缺一塊'], uprightMeaning: '世界象徵整合、完成與進入更大的循環。它提醒你肯定已經走過的路。', reversedMeaning: '世界逆位提醒你還有收尾或整合工作，完成不一定等於匆忙結束。', reflectionPrompt: '如果要完整收尾，我還需要補上哪一塊？' },
];

type TarotVisualModel = {
  glyph: string;
  headline: string;
  scene: string;
  tone: string;
  accent: string;
  secondary: string;
  elementLabel: string;
  motifs: string[];
  figure: string;
  lighting: string;
  focalSymbol: string;
};

const ELEMENT_TONES: Record<keyof TarotElementWeights, { tone: string; accent: string; secondary: string; label: string }> = {
  AIR: { tone: '#1e3a8a', accent: '#93c5fd', secondary: '#38bdf8', label: '風' },
  SPACE: { tone: '#312e81', accent: '#c4b5fd', secondary: '#67e8f9', label: '空' },
  WATER: { tone: '#164e63', accent: '#67e8f9', secondary: '#a7f3d0', label: '水' },
  FIRE: { tone: '#7f1d1d', accent: '#fbbf24', secondary: '#fb7185', label: '火' },
  EARTH: { tone: '#14532d', accent: '#bef264', secondary: '#fde68a', label: '地' },
};

const MAJOR_VISUALS: Record<string, { glyph: string; headline: string; scene: string; motifs: string[]; figure: string; lighting: string; focalSymbol: string }> = {
  'major-fool': { glyph: '旅', headline: '新旅程的第一步', scene: 'open-road', motifs: ['開端', '信任', '探索'], figure: '站在門檻前的旅人', lighting: '黎明邊光', focalSymbol: '向前延伸的道路' },
  'major-magician': { glyph: '術', headline: '資源被意志點亮', scene: 'altar', motifs: ['資源', '意志', '創造'], figure: '雙手聚合資源的創作者', lighting: '垂直聚焦光', focalSymbol: '轉化祭壇' },
  'major-high-priestess': { glyph: '月', headline: '靜默之門後的答案', scene: 'moon-gate', motifs: ['直覺', '靜觀', '內在'], figure: '守在月門前的靜觀者', lighting: '月色冷光', focalSymbol: '半月之門' },
  'major-empress': { glyph: '花', headline: '滋養讓事物長成', scene: 'garden', motifs: ['滋養', '創造', '感受'], figure: '雙臂環抱花園的滋養者', lighting: '柔和金綠光', focalSymbol: '盛放花冠' },
  'major-emperor': { glyph: '王', headline: '秩序成為支撐', scene: 'throne', motifs: ['結構', '責任', '掌控'], figure: '坐在結構中心的守序者', lighting: '硬邊主光', focalSymbol: '方形王座' },
  'major-hierophant': { glyph: '殿', headline: '傳承與信念的殿堂', scene: 'temple', motifs: ['傳統', '學習', '信念'], figure: '站在殿堂中的傳承者', lighting: '殿堂穹頂光', focalSymbol: '三柱神殿' },
  'major-lovers': { glyph: '契', headline: '選擇讓關係成形', scene: 'vow', motifs: ['選擇', '關係', '合一'], figure: '面向承諾的雙影', lighting: '交會柔光', focalSymbol: '心形契約' },
  'major-chariot': { glyph: '車', headline: '方向推動力量前進', scene: 'chariot', motifs: ['推進', '意志', '勝利'], figure: '掌握方向的前行者', lighting: '前方推進光', focalSymbol: '雙輪戰車' },
  'major-strength': { glyph: '力', headline: '柔軟承載真正力量', scene: 'inner-fire', motifs: ['勇氣', '耐心', '內在力量'], figure: '以平靜承載火焰的人', lighting: '內在暖光', focalSymbol: '心口火焰' },
  'major-hermit': { glyph: '燈', headline: '孤光照見核心答案', scene: 'lantern', motifs: ['省思', '尋找', '智慧'], figure: '持燈獨行的尋道者', lighting: '單點燈光', focalSymbol: '手中燈籠' },
  'major-wheel': { glyph: '輪', headline: '循環推動命運轉折', scene: 'wheel', motifs: ['轉變', '機會', '循環'], figure: '站在輪盤外緣的觀察者', lighting: '旋轉環光', focalSymbol: '命運之輪' },
  'major-justice': { glyph: '衡', headline: '清醒帶來公平判斷', scene: 'scales', motifs: ['公平', '因果', '判斷'], figure: '直立衡量的人', lighting: '對稱白光', focalSymbol: '天秤' },
  'major-hanged-man': { glyph: '懸', headline: '換位後看見新路', scene: 'suspended', motifs: ['停頓', '轉念', '犧牲'], figure: '倒懸後放鬆的轉念者', lighting: '逆向柔光', focalSymbol: '倒置弧線' },
  'major-death': { glyph: '變', headline: '結束打開新的形態', scene: 'threshold', motifs: ['結束', '轉化', '重生'], figure: '走過門檻的轉化者', lighting: '門縫新光', focalSymbol: '轉化之門' },
  'major-temperance': { glyph: '和', headline: '流動之間恢復平衡', scene: 'alchemy', motifs: ['調和', '節制', '流動'], figure: '引導兩道流光的人', lighting: '水火混合光', focalSymbol: '雙流交會' },
  'major-devil': { glyph: '鎖', headline: '看見束縛才能鬆開', scene: 'chain', motifs: ['束縛', '慾望', '陰影'], figure: '直視鎖鏈的人', lighting: '低角陰影光', focalSymbol: '鬆動鎖鏈' },
  'major-tower': { glyph: '塔', headline: '崩解揭露真正結構', scene: 'tower', motifs: ['突變', '瓦解', '真相'], figure: '站在裂塔前的人', lighting: '閃電切光', focalSymbol: '裂開高塔' },
  'major-star': { glyph: '星', headline: '願望重新指向希望', scene: 'stars', motifs: ['希望', '療癒', '指引'], figure: '仰望星河的療癒者', lighting: '星河微光', focalSymbol: '八芒星' },
  'major-moon': { glyph: '夢', headline: '迷霧要求你辨認直覺', scene: 'mist', motifs: ['不安', '夢境', '潛意識'], figure: '穿過迷霧的夢行者', lighting: '霧中月光', focalSymbol: '朦朧月徑' },
  'major-sun': { glyph: '日', headline: '光明把生命力展開', scene: 'sunrise', motifs: ['明朗', '喜悅', '生命力'], figure: '張開雙臂迎光的人', lighting: '正面日光', focalSymbol: '升起太陽' },
  'major-judgement': { glyph: '召', headline: '召喚讓自我更新', scene: 'awakening', motifs: ['覺醒', '召喚', '重整'], figure: '聽見召喚而起身的人', lighting: '上升召喚光', focalSymbol: '向上箭光' },
  'major-world': { glyph: '界', headline: '完整形成新的循環', scene: 'world', motifs: ['完成', '整合', '圓滿'], figure: '位於圓環中央的完成者', lighting: '環形整合光', focalSymbol: '完整世界環' },
};

const SUIT_VISUALS: Record<TarotSuit, { glyph: string; headline: string; scene: string; motifs: string[]; tone: string; accent: string; secondary: string; figure: string; lighting: string; focalSymbol: string }> = {
  wands: { glyph: '杖', headline: '火光推動行動', scene: 'wands', motifs: ['行動', '熱情', '方向'], tone: '#7f1d1d', accent: '#fbbf24', secondary: '#fb7185', figure: '持杖準備前進的人', lighting: '火焰側光', focalSymbol: '權杖火苗' },
  cups: { glyph: '杯', headline: '情感形成潮汐', scene: 'cups', motifs: ['情緒', '關係', '直覺'], tone: '#164e63', accent: '#67e8f9', secondary: '#a7f3d0', figure: '捧杯感受潮汐的人', lighting: '水面反光', focalSymbol: '聖杯水紋' },
  swords: { glyph: '劍', headline: '思考劃出界線', scene: 'swords', motifs: ['思考', '溝通', '判斷'], tone: '#1e3a8a', accent: '#93c5fd', secondary: '#f8fafc', figure: '持劍辨認界線的人', lighting: '清冷切線光', focalSymbol: '寶劍鋒線' },
  pentacles: { glyph: '幣', headline: '現實累積成果', scene: 'pentacles', motifs: ['資源', '身體', '落地'], tone: '#14532d', accent: '#bef264', secondary: '#fde68a', figure: '守護現實成果的人', lighting: '低穩地光', focalSymbol: '錢幣星形' },
};

const RANK_STORY: Record<string, string> = {
  ace: '起點凝聚成第一道訊號',
  two: '兩股力量正在協調',
  three: '事情向外形成合作',
  four: '結構讓能量穩住',
  five: '摩擦暴露調整位置',
  six: '支持讓流動恢復',
  seven: '策略保護真正目標',
  eight: '節奏累積成可見成果',
  nine: '接近完成仍需整合',
  ten: '階段完成並準備循環',
  page: '學習者帶來新訊息',
  knight: '行動者推進方向',
  queen: '成熟接納形成照顧',
  king: '承擔者建立規則',
};

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortText(value: string, max = 18) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function cardHash(value: string) {
  return Array.from(value).reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 9973, 17);
}

function getRankKey(card: TarotCardSeed) {
  return card.id.split('-').pop() ?? 'ace';
}

function getVisualElement(weights: TarotElementWeights) {
  return AI_ELEMENTS.reduce<keyof TarotElementWeights>((strongest, element) => weights[element] > weights[strongest] ? element : strongest, 'SPACE');
}

function buildVisualModel(card: TarotCardSeed, tone: string, weights: TarotElementWeights): TarotVisualModel {
  const element = getVisualElement(weights);
  const elementTone = ELEMENT_TONES[element];
  if (card.arcana === 'major') {
    const major = MAJOR_VISUALS[card.id] ?? { glyph: String(card.number ?? 'A'), headline: card.nameZh, scene: 'world', motifs: card.uprightKeywords.slice(0, 3) };
    return {
      glyph: major.glyph,
      headline: major.headline,
      scene: major.scene,
      tone: elementTone.tone || tone,
      accent: elementTone.accent,
      secondary: elementTone.secondary,
      elementLabel: elementTone.label,
      motifs: major.motifs,
      figure: major.figure,
      lighting: major.lighting,
      focalSymbol: major.focalSymbol,
    };
  }

  const suit = SUIT_VISUALS[card.suit ?? 'wands'];
  const rankKey = getRankKey(card);
  return {
    glyph: suit.glyph,
    headline: RANK_STORY[rankKey] ?? suit.headline,
    scene: suit.scene,
    tone: suit.tone,
    accent: suit.accent,
    secondary: suit.secondary,
    elementLabel: elementTone.label,
    motifs: [...suit.motifs, ...(card.uprightKeywords ?? [])].slice(0, 4),
    figure: suit.figure,
    lighting: suit.lighting,
    focalSymbol: suit.focalSymbol,
  };
}

function buildTarotVisualKnowledge(card: TarotCardSeed, model: TarotVisualModel, weights: TarotElementWeights, symbolism: string): TarotVisualKnowledge {
  const dominantElement = getVisualElement(weights) as TarotAiElement;
  const keywords = [...card.uprightKeywords, ...card.reversedKeywords].slice(0, 6);
  const rankKey = getRankKey(card);
  const storyAxis = card.arcana === 'major'
    ? `${card.nameZh}的故事主軸是「${model.headline}」，畫面必須讓人物、場景、光影與${model.focalSymbol}共同說明這個核心。`
    : `${card.nameZh}的故事主軸是「${model.headline}」，以${card.suit ? SUIT_ZH[card.suit] : '小牌'}原型與${RANK_STORY[rankKey] ?? '階段變化'}共同表達。`;

  return {
    cardId: card.id,
    coreMeaning: card.uprightMeaning,
    uprightLogic: `正位鎖定：${card.uprightKeywords.join('、')}。${card.uprightMeaning}`,
    reversedLogic: `逆位鎖定：${card.reversedKeywords.join('、')}。${card.reversedMeaning}`,
    dominantElement,
    symbolicElements: Array.from(new Set([model.focalSymbol, model.glyph, model.elementLabel, ...model.motifs, ...keywords])).slice(0, 10),
    coreAtmosphere: `${model.lighting}，${model.figure}，${model.scene}場景。`,
    storyAxis,
    immutableCore: [
      card.nameZh,
      model.headline,
      ...model.motifs,
      card.arcana === 'major' ? '大阿爾克那核心階段不可改' : `${card.suit ? SUIT_ZH[card.suit] : '小牌'}花色原型不可改`,
    ].slice(0, 8),
    creativeRules: [
      `必須以「${model.headline}」作為唯一主題`,
      `人物必須是「${model.figure}」`,
      `場景必須服務「${model.focalSymbol}」`,
      `光影必須使用「${model.lighting}」強化牌義`,
      '不得直接重現 Rider-Waite-Smith、Thoth、Marseille 或任何既有牌組構圖',
      '可改變服裝、材質、裝飾、抽象紋理，但不可改變核心牌義',
    ],
    originalZones: ['人物輪廓', '背景材質', '幾何紋理', '光暈粒子', '牌框細節', '色彩層次'],
    composition: {
      figure: model.figure,
      scene: model.scene,
      lighting: model.lighting,
      focalSymbol: model.focalSymbol,
    },
    validation: {
      meaningConsistent: true,
      storyComplete: true,
      themeLocked: true,
      styleUnified: true,
      noDeckReproduction: true,
      readableWithoutName: true,
      checkpoints: [
        '牌義一致',
        '故事完整',
        '主題未偏離',
        '人物場景光影共同描述同一核心',
        '同一套品牌牌風',
        '不重現特定牌組美術',
        '熟悉塔羅者可合理辨識與解讀',
      ],
    },
  };
}

function buildStars(seed: number, accent: string) {
  return Array.from({ length: 18 }, (_, index) => {
    const x = 42 + ((seed * (index + 3) * 17) % 276);
    const y = 62 + ((seed * (index + 5) * 23) % 410);
    const r = 1.1 + ((seed + index) % 4) * 0.34;
    const opacity = 0.2 + ((index % 5) * 0.08);
    return `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${accent}" opacity="${opacity.toFixed(2)}"/>`;
  }).join('');
}

function buildFigure(model: TarotVisualModel, seed: number) {
  const lean = ((seed % 7) - 3) * 0.7;
  const headY = 188 + (seed % 5);
  const bodyY = 248 + (seed % 4);
  return `<g opacity="0.72" aria-label="${escapeSvgText(model.figure)}"><circle cx="180" cy="${headY}" r="13" fill="none" stroke="${model.accent}" stroke-width="3"/><path d="M180 ${headY + 15} C${150 + lean} ${bodyY - 12} ${146 - lean} ${bodyY + 50} 132 ${bodyY + 88} C156 ${bodyY + 104} 204 ${bodyY + 104} 228 ${bodyY + 88} C214 ${bodyY + 50} ${210 + lean} ${bodyY - 12} 180 ${headY + 15} Z" fill="${model.tone}" fill-opacity="0.18" stroke="${model.accent}" stroke-opacity="0.58" stroke-width="3"/><path d="M138 ${bodyY + 34} C160 ${bodyY + 18} 200 ${bodyY + 18} 222 ${bodyY + 34}" fill="none" stroke="${model.secondary}" stroke-width="3" stroke-linecap="round"/><circle cx="180" cy="${bodyY + 42}" r="17" fill="none" stroke="${model.secondary}" stroke-opacity="0.48" stroke-width="2"/></g>`;
}

function buildScene(model: TarotVisualModel, card: TarotCardSeed, seed: number) {
  const a = model.accent;
  const b = model.secondary;
  const scene = model.scene;
  const pipCount = card.arcana === 'minor' ? Math.min(card.number ?? 1, 10) : 0;
  const pips = pipCount > 0
    ? Array.from({ length: pipCount }, (_, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = 102 + col * 39;
        const y = 414 + row * 34;
        return `<g opacity="0.88"><circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${a}" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-family="serif" fill="${b}">${escapeSvgText(model.glyph)}</text></g>`;
      }).join('')
    : '';

  const commonMandala = `<circle cx="180" cy="214" r="94" fill="none" stroke="${a}" stroke-opacity="0.48" stroke-width="2"/><circle cx="180" cy="214" r="68" fill="none" stroke="${b}" stroke-opacity="0.34" stroke-width="2"/><path d="M86 214 C118 160 148 160 180 214 C212 268 242 268 274 214" fill="none" stroke="${b}" stroke-opacity="0.38" stroke-width="3" stroke-linecap="round"/>`;

  const scenes: Record<string, string> = {
    'open-road': `<path d="M94 346 C128 292 156 252 180 178 C204 252 232 292 266 346" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/><path d="M112 360 C148 338 212 338 248 360" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
    altar: `<rect x="108" y="312" width="144" height="42" rx="12" fill="none" stroke="${a}" stroke-width="4"/><path d="M122 304 L180 178 L238 304" fill="none" stroke="${b}" stroke-width="3"/>`,
    'moon-gate': `<path d="M116 334 A64 92 0 0 1 244 334" fill="none" stroke="${a}" stroke-width="5"/><path d="M204 156 A44 44 0 1 0 204 244 A30 44 0 1 1 204 156" fill="${b}" opacity="0.72"/>`,
    garden: `<path d="M180 334 C154 286 154 244 180 196 C206 244 206 286 180 334" fill="none" stroke="${a}" stroke-width="4"/><path d="M104 332 C128 284 152 268 180 304 C208 268 232 284 256 332" fill="none" stroke="${b}" stroke-width="3"/>`,
    throne: `<path d="M116 352 L116 222 L244 222 L244 352" fill="none" stroke="${a}" stroke-width="5"/><path d="M142 244 H218 M142 286 H218" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
    temple: `<path d="M92 318 L180 188 L268 318" fill="none" stroke="${a}" stroke-width="5"/><path d="M122 328 H238 M134 328 V260 M180 328 V238 M226 328 V260" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
    vow: `<path d="M132 246 C132 204 180 204 180 246 C180 204 228 204 228 246 C228 296 180 326 180 326 C180 326 132 296 132 246" fill="none" stroke="${a}" stroke-width="4"/><path d="M116 360 C150 336 210 336 244 360" stroke="${b}" stroke-width="3" fill="none"/>`,
    chariot: `<path d="M104 328 H256 L236 254 H124 Z" fill="none" stroke="${a}" stroke-width="5"/><circle cx="132" cy="354" r="18" fill="none" stroke="${b}" stroke-width="4"/><circle cx="228" cy="354" r="18" fill="none" stroke="${b}" stroke-width="4"/>`,
    'inner-fire': `<path d="M180 342 C132 300 158 252 176 224 C174 256 222 258 204 202 C252 266 234 326 180 342" fill="none" stroke="${a}" stroke-width="5"/><circle cx="180" cy="282" r="28" fill="${b}" opacity="0.2"/>`,
    lantern: `<path d="M150 214 H210 L222 330 H138 Z" fill="none" stroke="${a}" stroke-width="5"/><circle cx="180" cy="270" r="32" fill="none" stroke="${b}" stroke-width="4"/><path d="M180 156 V214 M142 356 H218" stroke="${b}" stroke-width="3"/>`,
    wheel: `<circle cx="180" cy="278" r="76" fill="none" stroke="${a}" stroke-width="5"/><circle cx="180" cy="278" r="24" fill="none" stroke="${b}" stroke-width="4"/><path d="M180 202 V354 M104 278 H256 M126 224 L234 332 M234 224 L126 332" stroke="${b}" stroke-opacity="0.58" stroke-width="3"/>`,
    scales: `<path d="M180 188 V346 M132 226 H228" stroke="${a}" stroke-width="5" stroke-linecap="round"/><path d="M132 226 L102 300 H162 Z M228 226 L198 300 H258 Z" fill="none" stroke="${b}" stroke-width="3"/>`,
    suspended: `<path d="M112 194 H248 M180 194 C148 248 212 284 180 342" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/><circle cx="180" cy="342" r="18" fill="none" stroke="${b}" stroke-width="4"/>`,
    threshold: `<path d="M112 354 C148 304 148 244 180 194 C212 244 212 304 248 354" fill="none" stroke="${a}" stroke-width="5"/><path d="M128 356 H232 M180 194 V356" stroke="${b}" stroke-width="3"/>`,
    alchemy: `<path d="M116 250 C148 214 162 306 180 278 C198 250 212 342 244 306" fill="none" stroke="${a}" stroke-width="5"/><path d="M118 332 C150 296 210 296 242 332" fill="none" stroke="${b}" stroke-width="3"/>`,
    chain: `<path d="M116 280 C136 240 168 240 180 280 C192 320 224 320 244 280" fill="none" stroke="${a}" stroke-width="8" stroke-linecap="round"/><path d="M124 350 H236" stroke="${b}" stroke-width="3" stroke-dasharray="10 9"/>`,
    tower: `<path d="M134 358 L150 208 H210 L226 358 Z" fill="none" stroke="${a}" stroke-width="5"/><path d="M154 190 L188 154 L174 218 L214 194" fill="none" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
    stars: `<path d="M180 174 L194 234 L256 234 L204 268 L224 328 L180 290 L136 328 L156 268 L104 234 L166 234 Z" fill="none" stroke="${a}" stroke-width="4"/><path d="M116 356 C150 320 210 320 244 356" fill="none" stroke="${b}" stroke-width="3"/>`,
    mist: `<path d="M92 270 C132 238 164 302 202 266 C226 244 246 252 270 274" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/><path d="M112 336 C142 314 216 314 248 336" fill="none" stroke="${b}" stroke-width="3"/>`,
    sunrise: `<path d="M104 326 A76 76 0 0 1 256 326" fill="none" stroke="${a}" stroke-width="6"/><path d="M180 184 V226 M120 228 L148 254 M240 228 L212 254 M96 326 H264" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
    awakening: `<path d="M112 352 C142 292 218 292 248 352" fill="none" stroke="${a}" stroke-width="5"/><path d="M180 326 V202 M146 236 L180 202 L214 236" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
    world: `<circle cx="180" cy="278" r="82" fill="none" stroke="${a}" stroke-width="5"/><path d="M98 278 C132 226 228 226 262 278 C228 330 132 330 98 278" fill="none" stroke="${b}" stroke-width="3"/>`,
    wands: `<path d="M132 346 L218 194" stroke="${a}" stroke-width="8" stroke-linecap="round"/><path d="M154 274 C190 246 220 250 244 216" stroke="${b}" stroke-width="4" fill="none"/>${pips}`,
    cups: `<path d="M126 228 H234 C232 304 208 344 180 344 C152 344 128 304 126 228 Z" fill="none" stroke="${a}" stroke-width="5"/><path d="M110 364 H250 M142 260 C164 244 196 244 218 260" stroke="${b}" stroke-width="3" fill="none"/>${pips}`,
    swords: `<path d="M180 184 V354" stroke="${a}" stroke-width="7" stroke-linecap="round"/><path d="M132 246 H228 M154 206 L206 206" stroke="${b}" stroke-width="4" stroke-linecap="round"/>${pips}`,
    pentacles: `<path d="M180 198 L252 250 L224 336 H136 L108 250 Z" fill="none" stroke="${a}" stroke-width="5"/><path d="M180 220 L204 308 L132 256 H228 L156 308 Z" fill="none" stroke="${b}" stroke-width="3"/>${pips}`,
  };

  return `${commonMandala}${buildFigure(model, seed)}${scenes[scene] ?? scenes.world}`;
}

function svgCardUrl(card: TarotCardSeed, symbol: string, tone: string, weights: TarotElementWeights, symbolism: string, knowledge: TarotVisualKnowledge) {
  const model = buildVisualModel(card, tone, weights);
  const seed = cardHash(card.id);
  const safeNameZh = escapeSvgText(card.nameZh);
  const safeNameEn = escapeSvgText(card.nameEn);
  const safeHeadline = escapeSvgText(model.headline);
  const keywords = (model.motifs.length ? model.motifs : card.uprightKeywords).slice(0, 4).map(escapeSvgText);
  const keywordText = keywords.join('・');
  const storyText = escapeSvgText(shortText(knowledge.storyAxis || card.uprightMeaning || symbolism, 24));
  const safeDesc = escapeSvgText(`${knowledge.storyAxis} 創作規則：${knowledge.creativeRules.join('；')} 驗證：${knowledge.validation.checkpoints.join('；')}`);
  const scene = buildScene(model, card, seed);
  const stars = buildStars(seed, model.secondary);
  const numberLabel = card.arcana === 'major' ? `${card.number ?? ''}` : `${card.number ?? ''}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1120" viewBox="0 0 360 560" role="img" aria-label="${safeNameZh} ${safeNameEn} 原創塔羅牌面"><title>${safeNameZh}｜${safeHeadline}</title><desc>${safeDesc}</desc><metadata>{&quot;cardId&quot;:&quot;${escapeSvgText(card.id)}&quot;,&quot;model&quot;:&quot;tarot-original-knowledge-v2&quot;,&quot;noDeckReproduction&quot;:true,&quot;readableWithoutName&quot;:true}</metadata><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="0.48" stop-color="${model.tone}"/><stop offset="1" stop-color="#020617"/></linearGradient><radialGradient id="aura" cx="50%" cy="34%" r="64%"><stop offset="0" stop-color="${model.accent}" stop-opacity="0.38"/><stop offset="0.48" stop-color="${model.secondary}" stop-opacity="0.12"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient><filter id="softGlow"><feGaussianBlur stdDeviation="3.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="grain" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M1 1 H2 M12 4 H13 M5 17 H6 M18 15 H19" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/></pattern></defs><rect width="360" height="560" rx="30" fill="url(#bg)"/><rect width="360" height="560" rx="30" fill="url(#aura)"/><rect width="360" height="560" rx="30" fill="url(#grain)" opacity="0.22"/><rect x="22" y="22" width="316" height="516" rx="24" fill="none" stroke="${model.accent}" stroke-opacity="0.62" stroke-width="3"/><rect x="38" y="40" width="284" height="480" rx="18" fill="none" stroke="${model.secondary}" stroke-opacity="0.26" stroke-width="2"/>${stars}<g filter="url(#softGlow)">${scene}</g><text x="180" y="228" text-anchor="middle" font-size="82" font-family="Georgia, 'Noto Serif TC', serif" font-weight="900" fill="${model.accent}" opacity="0.96">${escapeSvgText(model.glyph)}</text><text x="52" y="72" font-size="20" font-family="Georgia, serif" font-weight="900" fill="${model.accent}" opacity="0.92">${escapeSvgText(numberLabel)}</text><text x="308" y="72" text-anchor="end" font-size="18" font-family="Georgia, serif" font-weight="900" fill="${model.secondary}" opacity="0.92">${escapeSvgText(model.elementLabel)}</text><text x="180" y="386" text-anchor="middle" font-size="30" font-family="Georgia, 'Noto Serif TC', serif" font-weight="900" fill="#f8fafc">${safeNameZh}</text><text x="180" y="416" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" letter-spacing="1.6" fill="#cbd5e1">${safeNameEn.toUpperCase()}</text><text x="180" y="452" text-anchor="middle" font-size="13" font-family="'Noto Sans TC', Arial, sans-serif" font-weight="700" fill="${model.accent}">${safeHeadline}</text><text x="180" y="478" text-anchor="middle" font-size="11" font-family="'Noto Sans TC', Arial, sans-serif" fill="#e2e8f0" opacity="0.86">${escapeSvgText(keywordText)}</text><text x="180" y="504" text-anchor="middle" font-size="10" font-family="'Noto Sans TC', Arial, sans-serif" fill="#cbd5e1" opacity="0.74">${storyText}</text><path d="M72 524 C116 504 146 544 180 524 C214 504 244 544 288 524" fill="none" stroke="${model.secondary}" stroke-opacity="0.42" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function getDefaultElementWeights(card: TarotCardSeed): TarotElementWeights {
  if (card.elementWeights) return card.elementWeights;
  if (card.arcana === 'minor' && card.suit) return SUIT_ELEMENT_WEIGHTS[card.suit];
  return MAJOR_ELEMENT_WEIGHTS[(card.number ?? 0) % MAJOR_ELEMENT_WEIGHTS.length];
}

function getDominantElement(weights: TarotElementWeights): keyof TarotElementWeights {
  return AI_ELEMENTS.reduce<keyof TarotElementWeights>((strongest, element) => weights[element] > weights[strongest] ? element : strongest, 'SPACE');
}

function getDefaultSymbolism(card: TarotCardSeed): string {
  if (card.symbolism) return card.symbolism;
  const weights = getDefaultElementWeights(card);
  const dominant = getDominantElement(weights);
  const dominantLabel = AI_ELEMENT_LABELS[dominant];
  if (card.arcana === 'major') {
    return `${card.nameZh}屬於大阿爾克那，象徵人生階段、意識轉折與核心課題；本牌提供以${dominantLabel}元素為主的五元素權重，交由 Integration Layer 統一整合。`;
  }
  const suitName = card.suit ? SUIT_ZH[card.suit] : '小阿爾克那';
  return `${card.nameZh}以${suitName}原型呈現日常事件、行動節奏與可調整的現實線索；本牌提供以${dominantLabel}元素為主的五元素權重，交由 Integration Layer 統一整合。`;
}

function withImage(card: TarotCardSeed): TarotCard {
  const tone = card.arcana === 'major'
    ? '#312e81'
    : card.suit === 'cups'
      ? '#164e63'
      : card.suit === 'swords'
        ? '#1e3a8a'
        : card.suit === 'pentacles'
          ? '#14532d'
          : '#7f1d1d';
  const symbol = card.arcana === 'major' ? String(card.number ?? 'A') : SUIT_SYMBOL[card.suit ?? 'wands'];
  const symbolism = getDefaultSymbolism(card);
  const elementWeights = getDefaultElementWeights(card);
  const visualKnowledge = card.visualKnowledge ?? buildTarotVisualKnowledge(card, buildVisualModel(card, tone, elementWeights), elementWeights, symbolism);
  return {
    ...card,
    symbolism,
    elementWeights,
    visualKnowledge,
    imageUrl: svgCardUrl(card, symbol, tone, elementWeights, symbolism, visualKnowledge),
  };
}

function createMinorCards(): TarotCard[] {
  const suits: TarotSuit[] = ['wands', 'cups', 'swords', 'pentacles'];
  return suits.flatMap((suit) => RANKS.map((rank) => {
    const theme = SUIT_THEMES[suit];
    const nameZh = `${SUIT_ZH[suit]}${rank.zh}`;
    const nameEn = `${rank.en} of ${SUIT_EN[suit]}`;
    return withImage({
      id: `minor-${suit}-${rank.key}`,
      number: rank.n,
      nameZh,
      nameEn,
      arcana: 'minor',
      suit,
      uprightKeywords: [...theme.keywords, ...rank.keywords].slice(0, 5),
      reversedKeywords: [...theme.reversedKeywords, ...rank.keywords].slice(0, 5),
      uprightMeaning: `${rank.upright}${theme.upright}`,
      reversedMeaning: `${rank.reversed}${theme.reversed}`,
      reflectionPrompt: theme.reflection,
    });
  }));
}

export const TAROT_CARDS: TarotCard[] = [...MAJOR_CARDS.map(withImage), ...createMinorCards()];
