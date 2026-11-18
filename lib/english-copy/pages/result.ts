/**
 * English display-only dictionary: soul-match result, dual chart (Ba Zi + Zi Wei) and print view.
 * Keys are byte-identical to the Traditional Chinese source text. Conventions: see ./numerology.ts.
 * The five-element "who needs what first" sentences are many fixed templates; they are built below
 * from the same element table so every combination reads the same way.
 * Display only: never use these strings as calculation input.
 */

// Five elements. Void=金 Metal, Air=木 Wood, Water=水, Fire=火, Earth=土.
const EL = ['空', '風', '水', '火', '地'] as const;
type El = (typeof EL)[number];
const EN: Record<El, string> = { 空: 'Void', 風: 'Air', 水: 'Water', 火: 'Fire', 地: 'Earth' };
/** Short theme in parentheses, e.g. "（穩定、承諾與落地）". */
const THEME: Record<El, string> = {
  地: 'stability, commitment and grounding', 水: 'emotion, empathy and repair', 火: 'warmth, initiative and momentum',
  風: 'communication, understanding and a change of view', 空: 'boundaries, perspective and sense of distance',
};
const THEME_ZH: Record<El, string> = {
  地: '穩定、承諾與落地', 水: '情緒、共感與修復', 火: '熱度、主動與推進', 風: '溝通、理解與轉念', 空: '界線、視野與距離感',
};
/** Where to start, e.g. "可以先從…開始". */
const START: Record<El, { zh: string; en: string }> = {
  地: { zh: '關係的穩定感、承諾感與安全感', en: "the relationship's sense of stability, commitment and security" },
  水: { zh: '溝通柔軟度、情緒理解與換位思考', en: 'softness in communication, understanding emotions and seeing from the other side' },
  火: { zh: '主動表達、熱情互動與關係推進力', en: 'speaking up, warm interaction and moving the relationship forward' },
  風: { zh: '共同成長、生活節奏與未來規劃', en: 'growing together, daily rhythm and planning the future' },
  空: { zh: '邊界感、尊重感與決策清晰度', en: 'a sense of boundaries, respect and clear decisions' },
};
// 相生: 空→水→風→火→地→空. 相剋: 空→風→地→水→火→空.
const GEN: Array<[El, El]> = [['空', '水'], ['水', '風'], ['風', '火'], ['火', '地'], ['地', '空']];
const CTRL: Array<[El, El]> = [['空', '風'], ['風', '地'], ['地', '水'], ['水', '火'], ['火', '空']];

const elementPairCopy: Record<string, string> = {};
const put = (zh: string, en: string) => { elementPairCopy[zh] = en; };

for (const e of EL) {
  const n = EN[e];
  // Same element on both sides
  put(`兩人都是${e}`, `Both are ${n}`);
  put(`兩人各自最需要補的元素，在五行裡是「兩人都是${e}」。`, `The element each of you most needs to build up is, in the five elements, "both are ${n}".`);
  put(`兩人最需要補的元素相同（兩人都是${e}）：同一件事一起做，彼此最容易感受到變化。`, `You both most need the same element (both are ${n}). Doing the same thing together is where you will each feel the change most easily.`);
  put(`把${e}元素當成兩人的共同練習。`, `Treat the ${n} element as a practice you share.`);
  const same = `兩人最需要補的都是${e}元素；一起做同一件事，彼此最容易感受到變化。`;
  put(same, `You both most need the ${n} element. Doing the same thing together is where you will each feel the change most easily.`);
  put(`鬼魅將它標記為「同頻補強格局」：${same}`, `The ghost marks this as a "same-frequency reinforcement pattern": you both most need the ${n} element. Doing the same thing together is where you will each feel the change most easily.`);
  put(`兩人最需要補的都是${e}元素，所以一起先補${e}元素。`, `You both most need the ${n} element, so build up the ${n} element together first.`);
  put(`兩人共同先補${e}元素（${THEME_ZH[e]}）。兩人最需要補的都是${e}元素，所以一起先補${e}元素。`, `Build up the ${n} element together first (${THEME[e]}). You both most need the ${n} element, so build up the ${n} element together first.`);
  // Shared first element, general
  put(`兩人共同先補${e}元素：可以先從${START[e].zh}開始。`, `Build up the ${n} element together first: you can start with ${START[e].en}.`);
  put(`補的時候，可以先從${START[e].zh}開始。`, `When building it up, you can start with ${START[e].en}.`);
  put(`先一起補好${e}元素，再輪流照顧各自最缺的元素。`, `First build up the ${n} element together, then take turns caring for what each of you lacks most.`);
  put(`先一起把${e}元素補起來，再各自補自己的第二順位。`, `First build up the ${n} element together, then each work on your own second priority.`);
  // Two people needing opposing elements: sum view
  put(`兩人最需要補的元素相剋，所以改看兩人補強需求加總：最高的是${e}元素。`, `The elements you each most need clash, so the totals of both people's needs are used instead: the highest is the ${n} element.`);
  put(`兩人共同先補${e}元素（${THEME_ZH[e]}）。兩人最需要補的元素相剋，所以改看兩人補強需求加總：最高的是${e}元素。`, `Build up the ${n} element together first (${THEME[e]}). The elements you each most need clash, so the totals of both people's needs are used instead: the highest is the ${n} element.`);
}
// Traditional generating and controlling cycle, one sentence per element
put('傳統五行生剋：生地的是火，地再生空（金）；剋地的是風（木），地剋水。這是元素之間的關係圖，不是兩人之間正在發生的事。', 'Traditional five-element cycle: Fire generates Earth, and Earth generates Void (Metal). Air (Wood) controls Earth, and Earth controls Water. This is a map of how the elements relate, not something happening between the two of you.');
put('傳統五行生剋：生水的是空（金），水再生風（木）；剋水的是地（土），水剋火。這是元素之間的關係圖，不是兩人之間正在發生的事。', 'Traditional five-element cycle: Void (Metal) generates Water, and Water generates Air (Wood). Earth controls Water, and Water controls Fire. This is a map of how the elements relate, not something happening between the two of you.');
put('傳統五行生剋：生火的是風（木），火再生地（土）；剋火的是水，火剋空（金）。這是元素之間的關係圖，不是兩人之間正在發生的事。', 'Traditional five-element cycle: Air (Wood) generates Fire, and Fire generates Earth. Water controls Fire, and Fire controls Void (Metal). This is a map of how the elements relate, not something happening between the two of you.');
put('傳統五行生剋：生風的是水，風再生火；剋風的是空（金），風剋地（土）。這是元素之間的關係圖，不是兩人之間正在發生的事。', 'Traditional five-element cycle: Water generates Air, and Air generates Fire. Void (Metal) controls Air, and Air controls Earth. This is a map of how the elements relate, not something happening between the two of you.');
put('傳統五行生剋：生空的是地（土），空再生水；剋空的是火，空剋風（木）。這是元素之間的關係圖，不是兩人之間正在發生的事。', 'Traditional five-element cycle: Earth generates Void, and Void generates Water. Fire controls Void, and Void controls Air (Wood). This is a map of how the elements relate, not something happening between the two of you.');
put('本站五元素對應傳統五行：空＝金、風＝木、水＝水、火＝火、地＝土。', 'This site maps its five elements to the traditional ones: Void = Metal, Air = Wood, Water = Water, Fire = Fire, Earth = Earth.');
for (const [a, b] of GEN) {
  const r = `${a}生${b}`;
  put(r, `${EN[a]} generates ${EN[b]}`);
  put(`兩人各自最需要補的元素，在五行裡是「${r}」。`, `The element each of you most needs to build up is, in the five elements, "${EN[a]} generates ${EN[b]}".`);
  put(`兩人最需要補的元素在五行裡相生（${r}）：一方補起來，也比較容易帶動另一方。`, `The elements you most need generate each other in the five elements (${EN[a]} generates ${EN[b]}): when one of you builds up, it is also easier to lift the other.`);
  for (const t of [a, b]) {
    const line = `兩人最需要補的元素相生（${r}）；先一起把${t}元素補起來，會比各補各的更順手。`;
    put(line, `The elements you most need generate each other (${EN[a]} generates ${EN[b]}). Building up the ${EN[t]} element together first goes more smoothly than each doing your own.`);
    put(`鬼魅將它標記為「相生共建格局」：${line}`, `The ghost marks this as a "mutual-generation building pattern": the elements you most need generate each other (${EN[a]} generates ${EN[b]}). Building up the ${EN[t]} element together first goes more smoothly than each doing your own.`);
  }
}
for (const [a, b] of CTRL) {
  const r = `${a}剋${b}`;
  put(r, `${EN[a]} controls ${EN[b]}`);
  put(`兩人各自最需要補的元素，在五行裡是「${r}」。`, `The element each of you most needs to build up is, in the five elements, "${EN[a]} controls ${EN[b]}".`);
  put(`兩人最需要補的元素在五行裡相剋（${r}）。這說的是補強的先後，不代表感情一定有摩擦：一起補的時候要輪流，別讓一方的補法壓過另一方。`, `The elements you most need control each other in the five elements (${EN[a]} controls ${EN[b]}). This is about the order of building up and does not mean there must be friction: take turns when building up, and do not let one person's way override the other's.`);
  put(`兩人最需要補的元素在五行裡相剋（${r}）：一起補的時候要輪流，別讓一方的補法壓過另一方。`, `The elements you most need control each other in the five elements (${EN[a]} controls ${EN[b]}): take turns when building up, and do not let one person's way override the other's.`);
  for (const t of EL) {
    const line = `兩人最需要補的元素相剋（${r}），這是補的先後，不代表感情一定有摩擦；先一起補好${t}元素，再輪流照顧各自最缺的。`;
    put(line, `The elements you most need control each other (${EN[a]} controls ${EN[b]}). This is about the order of building up and does not mean there must be friction. First build up the ${EN[t]} element together, then take turns caring for what each of you lacks most.`);
    put(`鬼魅將它標記為「輪流補強格局」：${line}`, `The ghost marks this as a "take-turns reinforcement pattern": the elements you most need control each other (${EN[a]} controls ${EN[b]}). This is about the order of building up and does not mean there must be friction. First build up the ${EN[t]} element together, then take turns caring for what each of you lacks most.`);
  }
}

export const enResultCopy: Record<string, string> = {
  ...elementPairCopy,

  // Matching result: teachers and ritual
  "Google 解盤老師": "Google reading teacher",
  "這段由 Google AI 依同一份配對資料改寫。": "This part was rewritten by Google AI from the same matching data.",
  "鬼魅回應・封印低語": "Ghost's response · whisper of the seal",
  "鬼魅留下唯一出口：兩人一起拿到下方的五元素封印寶珠，解除結界。": "The ghost leaves one way out: the two of you take the five-element seal orb below together and break the barrier.",
  "下一步：兩人一起拿到下方的五元素封印寶珠，解除結界，完成這一局的共同任務。": "Next: the two of you take the five-element seal orb below together, break the barrier and complete this round's shared task.",
  "空": "Void", "風": "Air", "水": "Water", "火": "Fire", "地": "Earth",
  "第一位・我的八字神獸": "Person 1 · My Ba Zi beast",
  "第二位・對方的八字神獸": "Person 2 · Their Ba Zi beast",
  "兩人八字・二十八宿神獸": "Both Ba Zi · 28 lunar-mansion beasts",
  "同一份出生資料，會和八字頁的日柱神獸完全一致。": "The same birth data gives exactly the same day-pillar beast as the Ba Zi page.",
  "八字配對神獸卡": "Ba Zi matching beast card",
  "先看本命神獸；神獸幼子需主動深入查看。": "Look at the natal beast first. The young beast needs to be opened on purpose.",
  "配對順序：先各自定位神獸，再交叉解讀兩人的互動。": "Matching order: first locate each person's beast, then read the interaction between the two.",
  "先看可核對的八字年度訊號；出生時辰完整後，再展開紫微本命夫妻宮資料。不判定感情好壞，也不保證事件。": "First look at the verifiable yearly Ba Zi signals. Once the birth hour is complete, the Zi Wei natal Spouse Palace data opens up. It does not judge whether a relationship is good or bad and guarantees no events.",
  "時辰尚未提供，因此不以預設時辰排紫微。補上時辰後，才能解鎖本命夫妻宮與三方四正資料。": "The birth hour has not been provided, so Zi Wei is not laid out with a default hour. After the hour is added, the natal Spouse Palace and the three-and-four-direction data can be unlocked.",
  "紅鸞": "Red Phoenix",
  "天喜": "Heavenly Joy",
  "星淵虛空珠": "Star-abyss void orb",
  "蒼嵐御風珠": "Azure-gale wind-riding orb",
  "潮汐回音珠": "Tidal echo orb",
  "燼星業火珠": "Ember-star karma-fire orb",
  "地脈琥珀珠": "Earth-vein amber orb",
  "界線與視野": "Boundaries and perspective",
  "溝通與理解": "Communication and understanding",
  "情緒與修復": "Emotion and repair",
  "熱度與推進": "Warmth and momentum",
  "穩定與承諾": "Stability and commitment",
  "第一位先補": "Person 1 builds up first",
  "第二位先補": "Person 2 builds up first",
  "儀式完成・五元素封印寶珠已收下": "Ritual complete · five-element seal orb taken",
  "五元素封印寶珠・靜止等待先行者": "Five-element seal orb · still, waiting for the first mover",
  "五元素封印寶珠・本局已解除": "Five-element seal orb · broken this round",
  "五元素封印寶珠・結界解除中": "Five-element seal orb · barrier being broken",
  "五顆封印寶珠・從這一顆開始解除": "Five seal orbs · start breaking them from this one",
  "這一顆是兩人目前共同要補的元素。兩位老師會先解讀原因，最後由你們一起拿到這顆五元素封印寶珠、解除結界並收下它。": "This orb is the element the two of you most need to build up together right now. The two teachers explain the reason first, and in the end you take this five-element seal orb together, break the barrier and keep it.",
  "五元素共有五顆封印寶珠：空、風、水、火、地。本局只解除兩人共同先補的這一顆；其餘四顆保留封印作為對照。": "The five elements have five seal orbs: Void, Air, Water, Fire and Earth. This round only breaks the one you both need first, and the other four stay sealed for comparison.",
  "把兩人八字五行的補強需求換成五顆星：數字是兩人的平均補強值，越高越需要補。亮起的那顆是兩人共同先補的元素；點星可看它代表什麼、可以先做什麼。": "Your two Ba Zi five-element reinforcement needs are turned into five stars. The number is the two-person average need, and the higher it is the more it needs building up. The lit star is the element you both build up first. Tap a star to see what it stands for and what to do first.",
  "鬼魅・神祕・靈異磁場遊戲": "Ghost · Mystery · Supernatural-field game",
  "鬼魅儀式・虛構遊戲劇情": "Ghost ritual · fictional game story",
  "本命神獸": "Natal beast",
  "神獸幼子": "Young beast",
  "深入查看神獸幼子": "Look closer at the young beast",
  "返回本命神獸": "Back to the natal beast",
  "易經生成一首歌": "I Ching makes a song",
  "用文字或錄音整理你的狀態，生成更貼近自己的專屬音樂。": "Organize your state with text or a recording and create personal music that fits you more closely.",
  "靈魂配對": "Soul matching",
  "輸入兩個人的資料，分析相處節奏、互補方向與關係功課。": "Enter the details of two people to analyze their rhythm together, complementary directions and relationship lessons.",
  "紫微斗數": "Zi Wei Dou Shu",
  "從年度命盤、宮位重點與人生主軸，整理更長期的方向。": "Sort out a longer-term direction from the yearly chart, palace highlights and life themes.",
  "繼續完成更多分析": "Keep completing more analyses",
  "每完成一張卡片，易經個人成長中心就會多一份資料，最後統整出本週行動與本月能量色。": "Each card you complete adds more data to your I Ching Personal Growth Center, and in the end it pulls together this week's action and this month's energy color.",
  "查看 易經個人成長中心": "View your I Ching Personal Growth Center",
  "開啟解封儀式聲音": "Turn on unsealing ritual sound",
  "關閉解封儀式聲音": "Turn off unsealing ritual sound",
  "解封聲音：關": "Unseal sound: off",
  "解封聲音：開": "Unseal sound: on",
  "恢復標準解封音量": "Restore standard unseal volume",
  "增強解封音量": "Boost unseal volume",
  "音量：": "Volume: ",
  "增強": "Boosted",
  "標準": "Standard",

  // Zodiac signs and animals
  "牡羊座": "Aries", "金牛座": "Taurus", "雙子座": "Gemini", "巨蟹座": "Cancer", "獅子座": "Leo", "處女座": "Virgo",
  "天秤座": "Libra", "天蠍座": "Scorpio", "射手座": "Sagittarius", "摩羯座": "Capricorn", "水瓶座": "Aquarius", "雙魚座": "Pisces",
  "鼠": "Rat", "牛": "Ox", "虎": "Tiger", "兔": "Rabbit", "龍": "Dragon", "蛇": "Snake", "馬": "Horse", "羊": "Goat", "猴": "Monkey", "雞": "Rooster", "狗": "Dog", "豬": "Pig",
  "血型不知道": "Blood type unknown",

  // Match basis
  "雙方皆已提供出生時辰，使用完整四柱八字合盤。": "Both birth hours were provided, so a full four-pillar Ba Zi comparison is used.",
  "至少一方未填出生時辰，因此以可用的完整四柱與三柱資料合盤；未知時柱不作推定。": "At least one birth hour was not entered, so the comparison uses the available full four-pillar and three-pillar data. An unknown hour pillar is not assumed.",
  "雙方未填出生時辰，因此以年、月、日三柱建立基礎合盤；時柱不作推定。": "Neither birth hour was entered, so a basic comparison is built from the year, month and day pillars. The hour pillar is not assumed.",
  "八字年度訊號與紫微本命夫妻宮資料皆已各自核對；請分開閱讀證據，不合併成感情結果。": "Both the Ba Zi yearly signals and the Zi Wei natal Spouse Palace data have been checked separately. Please read the evidence separately and do not merge it into a love verdict.",
  "八字年度訊號已核對；紫微本命資料仍待補出生時辰，暫不進行跨系統推論。": "The Ba Zi yearly signals are checked. Zi Wei natal data still needs the birth hour, so no cross-system inference is made for now.",
  "交叉摘要只說明資料是否可並列閱讀，不新增分數、不以 AI 補足缺項，也不保證關係事件。": "The cross summary only states whether the data can be read side by side. It adds no score, fills no gaps with AI and guarantees no relationship events.",
  "雙人合卦目前還沒有能查證出處的起卦規則，所以這裡不產生卦，也不借別的卦來湊。": "There is currently no verifiable casting rule for a two-person combined hexagram, so none is produced here and no other hexagram is borrowed to fill in.",
  "相處共鳴指數與四項指標，依兩人的星座、生日、出生季節、血型（不知道就用預設值）與姓名首字，套用固定規則計算；同樣資料每次結果都一樣。這不是八字合盤，也不是準確率。": "The compatibility resonance index and four indicators are calculated by fixed rules from both people's zodiac signs, birthdays, birth seasons, blood types (a default is used if unknown) and the first character of their names. The same data always gives the same result. This is not a Ba Zi comparison and not an accuracy rate.",
  "情感表達的節奏相近，比較容易有共鳴": "Your rhythm of expressing feelings is similar, so it is easier to resonate",
  "社交節奏一致，相處自在舒適": "Your social rhythm matches, so being together feels easy and comfortable",
  "對親密與陪伴的需求相近，比較不容易因此不安": "Your needs for closeness and company are similar, so you are less likely to feel uneasy about it",
  "安全感標準一致，不易因此起摩擦": "Your standards for security match, so friction is less likely",
  "思考邏輯相近，對話不費力": "Your ways of thinking are similar, so conversation takes little effort",
  "理性與感性互補，決策時能平衡對方盲點": "Reason and feeling complement each other, so you can balance each other's blind spots when deciding",
  "創意與執行力的搭配，一個想點子一個落地": "A pairing of creativity and execution, one comes up with ideas and the other lands them",
  "一人引路、一人穩固，主導與支持自然分工": "One leads and one steadies, so leading and supporting divide naturally",
  "謹慎與勇敢的平衡，互相制衡也互相鼓勵": "A balance of caution and courage, checking and encouraging each other",
  "情感表達深淺不同，多說「我現在的感受是…」能減少誤會": "You express feelings at different depths. Saying \"What I'm feeling right now is...\" more often reduces misunderstandings",
  "社交需求有落差，需協商獨處與共處的比例": "Your social needs differ, so you need to negotiate the balance of time alone and together",
  "對風險的接受度不同，重大決定前多留緩衝時間": "You accept risk differently, so leave extra buffer time before big decisions",
  "說話邏輯比例不同，「先聽感受還是先給建議」容易摩擦": "You differ in how you talk things through, and \"listen to feelings first or give advice first\" easily causes friction",
  "安全感需求差距大，一方覺得被束縛，一方覺得不被在乎": "Your needs for security differ greatly: one feels restricted while the other feels uncared for",
  "親密需求強弱相差太多，容易形成「追逃模式」": "Your needs for intimacy differ so much that a \"chase and withdraw\" pattern can form",
  "雙方主導欲都強，決策時易出現「誰說了算」的對峙": "You both have a strong need to lead, so decisions can turn into a standoff over who has the final say",
  "情感表達方式差異極大，需刻意學習對方的溝通語言": "Your ways of expressing feeling differ greatly, so you need to deliberately learn each other's way of communicating",
  "風險容忍度差距極大，對未來方向可能產生根本分歧": "Your tolerance for risk differs greatly, which may cause a basic split over future direction",
  "兩人個性差異明顯，但差異也是成長的起點": "Your personalities differ clearly, but the difference is also the starting point of growth",
  "這組規則沒有找到明顯的分工互補；兩人各自要補的方向，看下方五元素補強": "These rules found no clear complementary division of roles. For what each of you needs to build up, see the five-element reinforcement below.",
  "主要的磨合點就是下方「注意衝突」那一項；其他面向這組規則沒有找到明顯落差": "The main point of adjustment is the \"watch for conflict\" item below. In other areas these rules found no clear gap.",
  "這組規則沒有找到明顯的磨合點；日常仍要把話說清楚": "These rules found no clear point of friction. In daily life, still say things clearly.",
  "這組規則沒有找到高衝突提醒，維持日常溝通即可": "These rules found no high-conflict warning. Keeping up everyday communication is enough.",
  "整體指標偏高，共鳴與相處節奏是這組配對的優勢；持續把話說清楚，是讓這份默契維持下去的關鍵。": "Overall indicators are high, and resonance and shared rhythm are this pairing's strengths. Keeping things clearly said is the key to keeping this understanding going.",
  "整體配對基礎不錯，但溝通節奏仍需要磨合。放慢情緒反應、把話說清楚，比較能維持穩定並慢慢加深。": "The overall foundation is good, but your communication rhythm still needs fitting together. Slowing your emotional reactions and saying things clearly helps keep things steady and slowly deepen them.",
  "雙方有一定吸引力與互補性，但安全感與生活節奏仍需協調。先把日常規則談清楚，會比只靠感覺更穩。": "You have a fair amount of attraction and complementarity, but security and daily rhythm still need coordinating. Talking through everyday rules first is steadier than relying on feeling alone.",
  "這組配對有不錯的共鳴基礎，互補性也足夠。持續照顧彼此的感受與節奏，比較容易往穩定的方向走。": "This pairing has a good foundation of resonance and enough complementarity. Continuing to care for each other's feelings and pace makes it easier to move toward stability.",
  "這段關係不是沒有可能，而是特別需要耐心。吸引力存在，但衝突點也明顯，越早建立界線與溝通方式，越能減少摩擦。": "This relationship is not impossible, but it especially needs patience. The attraction is there, but so are clear conflict points. The earlier you set boundaries and ways of communicating, the less friction there will be.",
  "整體屬於中段配對，彼此之間有可發展空間，但需要更多理解與調整。若願意慢慢磨合，仍有機會走向穩定。": "Overall this is a middle-range pairing with room to develop, but it needs more understanding and adjustment. If you are willing to fit together slowly, it can still move toward stability.",
  "目前這組配對的衝突敏感度偏高，互動時容易因節奏不同而累積壓力。想走得長久，最好先建立清楚的溝通規則。": "This pairing's sensitivity to conflict is currently high, and pressure can build when your rhythms differ. To last long, it is best to set clear communication rules first.",
  "這組配對目前的磨合壓力較大，彼此看待事情的方式差異明顯。若想繼續靠近，建議先從理解與尊重彼此節奏開始。": "This pairing currently faces more pressure to adjust, and you see things quite differently. If you want to keep growing closer, start by understanding and respecting each other's pace.",

  // Game scenes
  "旅人": "Traveler",
  "沉水回聲館": "Sunken Echo Hall",
  "燼火密室": "Ember-Fire Chamber",
  "無聲風廊": "Silent Wind Corridor",
  "封印地窖": "Sealed Cellar",
  "空域觀測塔": "Void Observation Tower",
  "相生共建格局": "Mutual-generation building pattern",
  "輪流補強格局": "Take-turns reinforcement pattern",
  "同頻補強格局": "Same-frequency reinforcement pattern",
  "回音明顯": "Echo is clear",
  "回音存在": "Echo is present",
  "回音微弱": "Echo is faint",
  "目前這組分數的回音較淡，不能從分數推定誰一定在想誰。先用一次真誠、無壓力的聯絡，讓關係有重新被聽見的機會。": "The echo for this score is faint, and the score cannot show who is thinking of whom. Start with one sincere, pressure-free contact so the relationship has a chance to be heard again.",
  "鬼魅的低語：沉默正在替你們把門鎖上。先有人伸手，封印才會開始鬆動。": "The ghost whispers: silence is locking the door for you both. Once someone reaches out, the seal begins to loosen.",
  "鬼魅的低語：你們已經聽見彼此的回音；別讓它停在門後，留下可以一起解開的封印。": "The ghost whispers: you have already heard each other's echo. Don't let it stay behind the door. Leave a seal that you can open together.",
  "依八字合盤選場景": "Scene chosen from the Ba Zi comparison",
  "虛構遊戲情境": "Fictional game scenario",
  "第一幕・靈異磁場啟動": "Act 1 · The supernatural field awakens",
  "第二幕・情感壓力逼近": "Act 2 · Emotional pressure closes in",
  "第三幕・鬼魅低語回應": "Act 3 · The ghost's whisper answers",
  "第四幕・神祕封印出口": "Act 4 · The way out of the mysterious seal",
  "這週可以一起做的一件事": "One thing you can do together this week",
  "使用者": "User",
  "五元素補強方向依兩人各自的八字五行強弱與用神喜神計算，是給相處的參考方向，不是關係結果的預測。": "The five-element reinforcement directions are calculated from each person's Ba Zi five-element strengths and favorable elements. They are a reference for how you get along and not a prediction of how the relationship turns out.",
  "兩個卦是各自依自己的生辰起的。雙人合卦目前沒有能查證出處的起卦規則，所以不把兩個卦硬合成一個結論；卦是給自己看的一面鏡子，不是對這段關係的預測。": "The two hexagrams were each cast from their own birth time. There is currently no verifiable casting rule for a two-person combined hexagram, so the two are not forced into one conclusion. A hexagram is a mirror for yourself and not a prediction of this relationship.",
  "兩人這次都沒有起卦；補上出生時辰後，才會各自依生辰起卦。雙人合卦目前沒有能查證出處的起卦規則，所以不把兩個卦硬合成一個結論；卦是給自己看的一面鏡子，不是對這段關係的預測。": "Neither of you cast a hexagram this time. After the birth hour is added, each is cast from their own birth time. There is currently no verifiable casting rule for a two-person combined hexagram, so the two are not forced into one conclusion. A hexagram is a mirror for yourself and not a prediction of this relationship.",

  // Zi Wei palaces
  "兄弟宮": "Siblings Palace", "夫妻宮": "Spouse Palace", "子女宮": "Children Palace", "財帛宮": "Wealth Palace", "疾厄宮": "Health Palace",
  "遷移宮": "Travel Palace", "交友宮": "Friends Palace", "官祿宮": "Career Palace", "田宅宮": "Property Palace", "福德宮": "Fortune Palace", "父母宮": "Parents Palace",

  // Dual chart page
  "連線失敗，請稍後再試。": "The connection failed. Please try again later.",
  "暫時無法鎖定，請再試一次。": "Cannot lock in for now. Please try again.",
  "連線失敗。": "Connection failed.",
  "請完成生日、性別及出生時辰。時辰不明時，暫不產生雙命盤。": "Please complete birthday, gender and birth hour. If the hour is unknown, the dual chart is not produced for now.",
  "PDF 製作失敗，請再試一次。": "PDF creation failed. Please try again.",
  "列印專用版操作": "Print view actions",
  "← 返回命盤": "← Back to chart",
  "列印專用版": "Print view",
  "輸出色彩": "Output color",
  "黑白日常版": "Black-and-white daily version",
  "彩色客戶版": "Color client version",
  "正在製作 PDF…": "Creating PDF...",
  "瀏覽器列印": "Browser print",
  "黑白": "Black and white",
  "彩色": "Color",
  "← 返回首頁": "← Back to home",
  "鎖定離開": "Lock and leave",
  "生辰排盤 · 密碼保護": "Birth chart layout · password protected",
  "雙命盤": "Dual chart",
  "填寫一份出生資料，查看八字與紫微斗數命盤。": "Enter one set of birth details to view your Ba Zi and Zi Wei Dou Shu charts.",
  "輸入密碼，開啟雙命盤": "Enter the password to open the dual chart",
  "雙命盤暫未開放登入": "Dual chart sign-in is not open yet",
  "網站的登入設定尚未完成，目前無法驗證密碼。這不是您輸入錯誤，請聯絡網站管理員啟用後再試。": "The site's sign-in setup is not finished, so the password cannot be verified right now. This is not a mistake on your part. Please contact the site administrator to enable it and try again.",
  "重新檢查入口": "Check the entrance again",
  "先返回首頁": "Back to home first",
  "請輸入您已取得的進入密碼。解鎖後即可填寫一份出生資料，查看八字與紫微命盤。": "Please enter the access password you were given. After unlocking you can enter one set of birth details and view your Ba Zi and Zi Wei charts.",
  "進入密碼": "Access password",
  "隱藏密碼": "Hide password",
  "顯示密碼": "Show password",
  "正在驗證，請稍候…": "Verifying, please wait...",
  "解鎖雙命盤": "Unlock the dual chart",
  "若密碼不符，請重新輸入後再試；不必重新整理頁面。": "If the password does not match, enter it again and retry. You do not need to refresh the page.",
  "沿用系統萬年曆：國曆或農曆生日會統一換算後排盤。採台灣標準時間（UTC+8），未做真太陽時校正；時辰卡採代表時間，若只知子時，請補選午夜前後。": "Uses the system's perpetual calendar: Gregorian or lunar birthdays are converted uniformly before the chart is laid out. Taiwan Standard Time (UTC+8) is used with no true solar time correction. Hour cards use a representative time, so if you only know the Zi hour, please also choose before or after midnight.",
  "排出雙命盤": "Lay out the dual chart",
  "正在排盤…": "Laying out the chart...",
  "子時跨日確認": "Zi hour date-crossing check",
  "請確認午夜前或午夜後": "Please confirm before or after midnight",
  "晚子時：23:00–23:59（出生當日）": "Late Zi hour: 23:00–23:59 (on the birth date)",
  "早子時：00:00–00:59（出生當日）": "Early Zi hour: 00:00–00:59 (on the birth date)",
  "雙命盤結果": "Dual chart result",
  "點選任一宮位，下方會顯示完整星曜、亮度、四化與大限。": "Tap any palace to see its full stars, brightness, Four Transformations and major limit below.",
  "紫微十二宮傳統方盤": "Zi Wei twelve-palace traditional square chart",
  "命主資料": "Chart owner details",
  "身主": "Body Star",
  "空宮": "Empty palace",
  "身宮": "Body Palace",
  "小限": "Minor limit",
  "選中宮位詳情": "Selected palace details",
  " · 身宮": " · Body Palace",
  "無十四主星（空宮）": "No main stars (empty palace)",
  "無": "None",
  "命宮：實線框 · 身宮：虛線框": "Life Palace: solid frame · Body Palace: dashed frame",
  "亮度：廟、旺、得、利、平、不、陷；無標記表示引擎未提供。": "Brightness: Temple, Prosperous, Gained, Favorable, Neutral, Weak, Fallen. No mark means the engine did not provide it.",
  "木": "Wood", "土": "Earth", "金": "Metal",
  "斜線": "Diagonal lines", "點紋": "Dots", "方格": "Grid", "橫線": "Horizontal lines", "直線": "Vertical lines",
  "五行加權比例": "Weighted five-element proportions",
  "五行": "Five elements",
  "加權比例": "Weighted proportion",
  "含天干、地支、藏干與月令權重": "Includes Heavenly Stems, Earthly Branches, Hidden Stems and seasonal weighting",
  "請先生成兩張命盤，再開啟列印專用版。": "Please generate both charts first, then open the print view.",
  "八字與紫微斗數命盤": "Ba Zi and Zi Wei Dou Shu charts",
  "目前內容超出 A4 紙張，請使用瀏覽器列印分頁；PDF 未輸出，避免裁切命盤。": "The content currently exceeds A4 paper. Please use the browser's print pagination. No PDF was produced so the chart is not cut off.",
  "時": "Hour",
  "中央八字摘要": "Central Ba Zi summary",
  "八字四柱時日月年主表": "Ba Zi four-pillar main table (hour, day, month, year)",
  "項目": "Item",
  "主星": "Main stars",
  "地支": "Earthly Branch",
  "副星": "Minor stars",
  "十二運": "Twelve Life Stages",
  "神煞": "Shen Sha",
  "無命中": "No match",
  "大運年齡干支表": "Major cycle age and stem-branch table",
  "歲": "yrs",
  "男": "Male",
  "女": "Female",
  "旺衰、格局與用喜忌沿用本系統規則，流派口徑可能不同。": "Strength, pattern and favorable/unfavorable elements follow this system's rules. Other schools may use different standards.",
  "上列依次為干支、干十神、支主氣十神；立春換年。流年神煞未提供。": "The rows above are, in order: stem-branch, stem Ten God, and branch main-qi Ten God. The year changes at Start of Spring. Yearly Shen Sha is not provided.",
  "起運資料未提供": "Cycle start data not provided",
  "命局合沖刑害破": "Chart combine, clash, punish, harm, break",
  "本系統規則未命中": "No match under this system's rules",
  "神煞按各柱命中顯示；現有規則含天乙、文昌、桃花、驛馬、華蓋，非所有流派全集。": "Shen Sha are shown by the pillar they match. Current rules include Tian Yi, Wen Chang, Peach Blossom, Travelling Horse and Canopy, and are not the full set of every school.",
  "台灣標準時間 UTC+8 · 年以立春、月以節氣為界 · 晚子時日柱不換日 · 未做真太陽時校正": "Taiwan Standard Time UTC+8 · year changes at Start of Spring, month at solar terms · late Zi hour does not change the day pillar · no true solar time correction",
  "年空": "Year void",
  "日空": "Day void",
  "旺衰": "Strength",
  "用神": "Favorable element",
  "喜神": "Joyful element",
  "本局關卡・": "This round's gate · ",
  "靈魂回音・": "Soul echo · ",
  "交叉核對摘要・": "Cross-check summary · ",
  "試聽五元素解封聲音": "Preview the five-element unseal sounds",
  "試聽解封聲音": "Preview the unseal sound",
  "只播放聲音，不會解封或改變進度": "Only plays the sound and does not unseal or change progress",
  "停止依序試聽": "Stop sequential preview",
  "依序試聽五元素": "Preview the five elements in order",
  "請先把「解封聲音」切換為開": "Please switch \"Unseal sound\" on first",
  "準備依序播放五種聲音": "Getting ready to play the five sounds in order",
  "可單獨試聽，也可依序比較五種聲音": "You can preview them one by one or compare all five in order",
  "長生：": "Changsheng: ",
  "博士：": "Bo Shi: ",
  "歲前：": "Sui Qian: ",
  "將前：": "Jiang Qian: ",
  "大限：": "Major limit: ",
  "小限（虛歲）：": "Minor limit (nominal age): ",
  "輔星與雜曜：": "Supporting and miscellaneous stars: ",
  "四化：": "Four Transformations: ",
  "排盤核心：": "Chart core: ",
  "流年 ·": "Yearly flow ·",
  "順行": "Forward",
  "逆行": "Reverse",
  "請先選擇：自己或親朋好友。": "Please choose first: myself or friend or family.",
  "返回首頁": "Back to home"
};
