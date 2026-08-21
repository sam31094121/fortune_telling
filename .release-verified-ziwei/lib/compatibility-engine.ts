/**
 * 天地人配對引擎 v2.0
 *
 * 鐵律：配對只比較兩個人格矩陣，不重新解算生日/血型/姓名。
 * 人格矩陣本身已由天地人引擎完整計算，此引擎只做矩陣對矩陣的比較。
 *
 * 輸出四個象限：
 *   共鳴區   — 雙方自然契合的維度
 *   互補區   — 差異帶來平衡的維度
 *   磨合區   — 需要溝通調整的維度
 *   衝突風險 — 容易引發摩擦的維度
 */

// ────────────────────────────────────────────────────────────
// 人格矩陣（固定欄位，由天地人引擎生成，此處唯讀）
// ────────────────────────────────────────────────────────────

export interface PersonalityMatrixCompat {
  emotion:    number; // 情感深度
  logic:      number; // 邏輯思維
  social:     number; // 社交傾向
  leadership: number; // 領導力
  security:   number; // 安全感需求
  creativity: number; // 創造力
  risk:       number; // 冒險傾向
  attachment: number; // 依附強度
}

// 配對引擎只需要：名字（用於顯示）+ 矩陣（用於計算）
export interface PersonProfile {
  name:   string;
  matrix: PersonalityMatrixCompat;
}

// ────────────────────────────────────────────────────────────
// 輸出結構
// ────────────────────────────────────────────────────────────

export interface MatchZones {
  resonance:   string[]; // 共鳴區
  complement:  string[]; // 互補區
  grinding:    string[]; // 磨合區
  conflict:    string[]; // 衝突風險區
}

export interface MatchResult {
  match_score:   number;  // 0–100 總配對指數
  resonance:     number;  // 共鳴指數
  communication: number;  // 溝通指數
  stability:     number;  // 穩定指數
  conflict_risk: number;  // 衝突風險（越低越好）
  summary:       string;  // 一句話摘要
  zones:         MatchZones;
  communicationReport: CommunicationReport;
}

// ────────────────────────────────────────────────────────────
// 工具函式
// ────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ────────────────────────────────────────────────────────────
// 核心評分：純矩陣比較
// ────────────────────────────────────────────────────────────

function scoreResonance(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): number {
  // 共鳴型維度：相近 = 契合（情感/社交/依附）
  const gaps = [
    Math.abs(a.emotion    - b.emotion),
    Math.abs(a.social     - b.social),
    Math.abs(a.attachment - b.attachment),
  ];
  return clamp(100 - avg(gaps));
}

function scoreCommunication(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): number {
  // 溝通節奏由情感、邏輯、社交的差距決定
  const diff =
    Math.abs(a.emotion - b.emotion) * 0.45 +
    Math.abs(a.logic   - b.logic)   * 0.35 +
    Math.abs(a.social  - b.social)  * 0.20;
  return clamp(100 - diff);
}

function scoreStability(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): number {
  // 穩定性由共同安全感基礎 + 冒險傾向差距決定
  const avgSecurity = (a.security + b.security) / 2;
  const riskGap     = Math.abs(a.risk - b.risk);
  return clamp(avgSecurity * 0.55 + (100 - riskGap) * 0.45);
}

function scoreConflictRisk(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): number {
  // 衝突風險：安全感/依附差距大 + 雙方都強主導 = 高風險
  const secGap  = Math.abs(a.security   - b.security);
  const attGap  = Math.abs(a.attachment - b.attachment);
  const bothLead = Math.min(a.leadership, b.leadership) > 60
    ? (Math.min(a.leadership, b.leadership) - 60) * 1.5
    : 0;
  return clamp(secGap * 0.35 + attGap * 0.35 + bothLead * 0.30);
}

function scoreComplement(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): number {
  // 互補型維度：差距接近 40–55 = 最佳互補（logic/creativity/leadership/risk）
  const gaps = [
    Math.abs(a.logic      - b.logic),
    Math.abs(a.creativity - b.creativity),
    Math.abs(a.leadership - b.leadership),
    Math.abs(a.risk       - b.risk),
  ];
  const meanGap = avg(gaps);
  // 在 45 時互補效益最高，偏離越大效益越低
  return clamp(100 - Math.abs(meanGap - 45) * 1.8);
}

// ────────────────────────────────────────────────────────────
// 四象限分析
// ────────────────────────────────────────────────────────────

function buildZones(a: PersonalityMatrixCompat, b: PersonalityMatrixCompat): MatchZones {
  const resonance:  string[] = [];
  const complement: string[] = [];
  const grinding:   string[] = [];
  const conflict:   string[] = [];

  const eGap  = Math.abs(a.emotion    - b.emotion);
  const sGap  = Math.abs(a.social     - b.social);
  const attGap = Math.abs(a.attachment - b.attachment);
  const secGap = Math.abs(a.security   - b.security);
  const lGap  = Math.abs(a.logic      - b.logic);
  const crGap = Math.abs(a.creativity - b.creativity);
  const ldGap = Math.abs(a.leadership - b.leadership);
  const rkGap = Math.abs(a.risk       - b.risk);

  // ── 共鳴區（差距 < 20）────────────────────────────────
  if (eGap   < 20) resonance.push('情感波頻相近，靈魂容易共鳴');
  if (sGap   < 20) resonance.push('社交節奏一致，相處自在舒適');
  if (attGap < 20) resonance.push('依附需求相近，關係安全感強');
  if (secGap < 15) resonance.push('安全感標準一致，不易因此起摩擦');
  if (lGap   < 15) resonance.push('思考邏輯相近，對話不費力');

  // ── 互補區（差距 25–65）───────────────────────────────
  if (lGap  > 25 && lGap  < 65) complement.push('理性與感性互補，決策時能平衡對方盲點');
  if (crGap > 25 && crGap < 65) complement.push('創意與執行力的搭配，一個想點子一個落地');
  if (ldGap > 25 && ldGap < 65) complement.push('一人引路、一人穩固，主導與支持自然分工');
  if (rkGap > 25 && rkGap < 65) complement.push('謹慎與勇敢的平衡，互相制衡也互相鼓勵');

  // ── 磨合區（差距 20–50）───────────────────────────────
  if (eGap   >= 20 && eGap   < 50) grinding.push('情感表達深淺不同，多說「我現在的感受是…」能減少誤會');
  if (sGap   >= 20 && sGap   < 50) grinding.push('社交需求有落差，需協商獨處與共處的比例');
  if (rkGap  >= 25 && rkGap  < 55) grinding.push('對風險的接受度不同，重大決定前多留緩衝時間');
  if (lGap   >= 30 && lGap   < 60) grinding.push('說話邏輯比例不同，「先聽感受還是先給建議」容易摩擦');

  // ── 衝突風險區（差距 ≥ 50 或雙高主導）──────────────────
  if (secGap >= 40) conflict.push('安全感需求差距大，一方覺得被束縛，一方覺得不被在乎');
  if (attGap >= 40) conflict.push('親密需求強弱相差太多，容易形成「追逃模式」');
  if (Math.min(a.leadership, b.leadership) > 65) conflict.push('雙方主導欲都強，決策時易出現「誰說了算」的對峙');
  if (eGap   >= 50) conflict.push('情感表達方式差異極大，需刻意學習對方的溝通語言');
  if (rkGap  >= 55) conflict.push('風險容忍度差距極大，對未來方向可能產生根本分歧');

  // 確保每區至少有預設文字
  if (resonance.length  === 0) resonance.push( '兩人個性差異明顯，但差異也是成長的起點');
  if (complement.length === 0) complement.push('整體特質相近，彼此不太需要「補位」，方向感一致');
  if (grinding.length   === 0) grinding.push(  '目前看不出明顯磨合點，溝通障礙相對低');
  if (conflict.length   === 0) conflict.push(  '矩陣分析未見高衝突警示，維持日常溝通即可');

  return { resonance, complement, grinding, conflict };
}

// ────────────────────────────────────────────────────────────
// 摘要生成（純矩陣邏輯）
// ────────────────────────────────────────────────────────────

function buildSummary(
  matchScore: number,
  resonance: number,
  communication: number,
  stability: number,
  conflictRisk: number,
): string {
  if (matchScore >= 85) {
    return '你們屬於高共鳴、強共振的組合，情感頻率與溝通節奏天然契合，是彼此難得的心靈夥伴。';
  }
  if (matchScore >= 75) {
    if (resonance >= 75) return '核心情感頻率高度契合，只要在溝通節奏上多一份耐心，這段關係會越陳越香。';
    return '你們有互補的優勢組合，差異是兩人的財富，需要刻意去理解彼此的節奏。';
  }
  if (matchScore >= 60) {
    if (communication < 60) return '情感或思考方式有明顯落差，建議先學習對方說話的「頻道」，溝通是這段關係的關鍵。';
    if (conflictRisk >= 55) return '有豐富的互補潛力，但衝突觸發點明確，主動避開雷區能讓關係走得更遠。';
    return '你們屬於需要磨合的互補型，差異帶來視角，磨合之後能建立深厚的理解。';
  }
  if (matchScore >= 45) {
    return '個性差異明顯，相處需要更多刻意的溝通與禮讓，但正因差異，彼此都能從對方身上學到獨特的東西。';
  }
  return '兩人特質差距較大，適合保持適當距離感與尊重，不要試圖改變對方，欣賞彼此的獨特是最好的相處方式。';
}

// ────────────────────────────────────────────────────────────
// 話術溝通配對
// ────────────────────────────────────────────────────────────

export interface CommunicationStyle {
  type:                  string;
  emoji:                 string;
  tagline:               string;
  howTheySpeak:          string;
  whatTriggersShutdown:  string;
  whatTheyNeedToHear:    string;
  pattern: '情感型' | '邏輯型' | '行動型' | '穩定型';
}

export interface ConflictScenario {
  title:       string;
  howItStarts: string;
  whatHappens: string;
  rootCause:   string;
  solution:    string;
}

export interface CommunicationReport {
  personA:          CommunicationStyle;
  personB:          CommunicationStyle;
  clashType:        string;
  clashDescription: string;
  topConflicts:     ConflictScenario[];
  dailyHarmony:     string[];
}

function deriveCommunicationStyle(name: string, m: PersonalityMatrixCompat): CommunicationStyle {
  const emotionScore   = (m.emotion + m.attachment) / 2;
  const logicScore     = (m.logic + m.creativity) / 2;
  const actionScore    = (m.leadership + m.risk) / 2;
  const stabilityScore = (m.security + (100 - m.risk)) / 2;

  const max = Math.max(emotionScore, logicScore, actionScore, stabilityScore);

  let pattern: CommunicationStyle['pattern'];
  let type: string, emoji: string, tagline: string;
  let howTheySpeak: string, whatTriggersShutdown: string, whatTheyNeedToHear: string;

  if (max === emotionScore) {
    pattern = '情感型';
    if (m.emotion > 68) {
      type = '熱烈表達型'; emoji = '🔥';
      tagline = '說話帶溫度，情緒就是訊息';
      howTheySpeak = '語氣起伏明顯，喜歡用比喻和故事，情緒直接體現在語調中；高興時滔滔不絕，難過時沉默以對';
      whatTriggersShutdown = '被說「你太情緒化了」或「冷靜一點」——感覺情感被否定時，會關閉或反向爆發';
      whatTheyNeedToHear = '「我懂你的感受」「你說的我都聽進去了」——先被理解，再談解決方案';
    } else {
      type = '深情內斂型'; emoji = '🌊';
      tagline = '話不多，但每句都是心底話';
      howTheySpeak = '說話慢而深沉，不輕易表達，但一旦說出口就是真心；常用「我覺得」「對我來說」這類句式';
      whatTriggersShutdown = '被催促表態、被強迫立刻回應——需要時間整理情緒，急著要答案只會讓他關閉';
      whatTheyNeedToHear = '「你願意說就說，不說也沒關係」「我會等你」——給空間比給答案更重要';
    }
  } else if (max === logicScore) {
    pattern = '邏輯型';
    if (m.logic > 68) {
      type = '精準分析型'; emoji = '🔬';
      tagline = '用道理說話，事實優先，情緒靠邊';
      howTheySpeak = '說話條理清晰，喜歡舉例、比較、給建議；討論問題時會分析原因，不擅長純粹的情緒支持';
      whatTriggersShutdown = '對方只重複情緒、拒絕聽理由——感覺溝通沒有意義，會選擇沉默或離開討論';
      whatTheyNeedToHear = '「你說的有道理」「我聽懂了你的邏輯」——被理性認可比被情感接納更重要';
    } else {
      type = '冷靜建議型'; emoji = '📐';
      tagline = '解決問題是溝通的目的，感受是工具不是核心';
      howTheySpeak = '語氣平穩，說話時常帶入「所以」「因此」「我建議」，傾向給出可執行方案，不習慣空談情緒';
      whatTriggersShutdown = '情緒攻擊、言語誇張，或問題反覆卻不行動——會覺得浪費時間，逐漸退出對話';
      whatTheyNeedToHear = '「謝謝你幫我想辦法」「你說的我會試試看」——行動力的回應讓他們感到被重視';
    }
  } else if (max === actionScore) {
    pattern = '行動型';
    type = '直接主導型'; emoji = '⚡';
    tagline = '說到做到，不繞彎子，快速決策';
    howTheySpeak = '語速快、直接切重點，不喜歡鋪墊太多；高壓時可能不顧慮對方感受直接說出口';
    whatTriggersShutdown = '說了半天沒有結論、對方一直猶豫——會失去耐心，甚至自己做決定把對方晾在一邊';
    whatTheyNeedToHear = '「我決定了，跟你的建議一樣」「你說的我已經在做了」——效率與行動是他們的愛的語言';
  } else {
    pattern = '穩定型';
    if (m.security > 65) {
      type = '穩重包容型'; emoji = '🏔️';
      tagline = '說話前先想三遍，不輕易開口但每字有重量';
      howTheySpeak = '說話慢條斯理，習慣先聽再說，不爭不搶；衝突中傾向和事，自己的委屈常藏在心裡';
      whatTriggersShutdown = '一直被推著表態、被逼著站邊——壓力太大時選擇沉默，然後悄悄積累怨氣';
      whatTheyNeedToHear = '「你真的很好說話，謝謝你包容我」「你的感受也很重要」——被看見不只是在付出';
    } else {
      type = '謹慎觀察型'; emoji = '🦉';
      tagline = '先看清楚，再開口，一切都在掌握中才有安全感';
      howTheySpeak = '開口前會觀察對方情緒，說話保留空間，常用「也許」「可能」「你覺得呢」——不輕易確定，留有餘地';
      whatTriggersShutdown = '被突然衝擊、意外的強烈情緒——需要預期和穩定感，突發狀況讓他立刻進入防衛模式';
      whatTheyNeedToHear = '「沒關係，慢慢來」「我不是在責備你」——先讓他感到安全，才能真正溝通';
    }
  }

  return { type, emoji, tagline, howTheySpeak, whatTriggersShutdown, whatTheyNeedToHear, pattern };
}

function buildConflictScenarios(
  A: PersonProfile,
  B: PersonProfile,
  styleA: CommunicationStyle,
  styleB: CommunicationStyle,
): ConflictScenario[] {
  const scenarios: ConflictScenario[] = [];
  const { name: nameA, matrix: mA } = A;
  const { name: nameB, matrix: mB } = B;

  // 情感型 vs 邏輯型
  if (
    (styleA.pattern === '情感型' && styleB.pattern === '邏輯型') ||
    (styleA.pattern === '邏輯型' && styleB.pattern === '情感型')
  ) {
    const emotional = styleA.pattern === '情感型' ? nameA : nameB;
    const logical   = styleA.pattern === '邏輯型'  ? nameA : nameB;
    scenarios.push({
      title:       '「你只想解決問題，我只想被理解」',
      howItStarts: `${emotional}因為某件事心情不好，想找${logical}訴說感受`,
      whatHappens: `${logical}馬上開始分析原因、給建議；${emotional}越聽越委屈，說「你都不理解我」；${logical}困惑「我明明在幫你」`,
      rootCause:   '情感型需要先被「理解」，邏輯型認為「解決問題」才是愛——語言相同，頻道不同',
      solution:    `${logical}說的第一句話先換成「你一定很難受，跟我說說」，問題等五分鐘後再討論`,
    });
  }

  // 行動型 vs 穩定型
  if (
    (styleA.pattern === '行動型' && styleB.pattern === '穩定型') ||
    (styleA.pattern === '穩定型' && styleB.pattern === '行動型')
  ) {
    const action = styleA.pattern === '行動型' ? nameA : nameB;
    const stable = styleA.pattern === '穩定型' ? nameA : nameB;
    scenarios.push({
      title:       '「你太急了」vs「你太慢了」',
      howItStarts: `面對一個需要決定的問題，${action}已經想好方案，${stable}還在思考中`,
      whatHappens: `${action}催促、甚至直接做決定；${stable}感覺被跳過，不被尊重；兩人都覺得對方不尊重自己的節奏`,
      rootCause:   '行動型的效率感 vs 穩定型的安全感——前者覺得拖延是浪費，後者覺得急躁是莽撞',
      solution:    `${action}提前告知「我們下週五前要決定」，給${stable}準備時間；${stable}練習給出草案而非最終答案`,
    });
  }

  // 雙行動型
  if (styleA.pattern === '行動型' && styleB.pattern === '行動型') {
    scenarios.push({
      title:       '「誰說了算」的主導權之戰',
      howItStarts: '同時都有想法，同時都想推進自己的方案',
      whatHappens: `${nameA}和${nameB}都說話直接、都想主導，語氣越來越強，看起來像在吵架，其實都是認真的`,
      rootCause:   '兩個主導型的人在同一件事上，能量相撞——不是不愛，是本能反應',
      solution:    '提前分工：誰負責哪個領域就誰說了算，不重疊就不衝突；重大決策輪流主導',
    });
  }

  // 情感型 vs 行動型
  if (
    (styleA.pattern === '情感型' && styleB.pattern === '行動型') ||
    (styleA.pattern === '行動型' && styleB.pattern === '情感型')
  ) {
    const emotional = styleA.pattern === '情感型' ? nameA : nameB;
    const action    = styleA.pattern === '行動型'  ? nameA : nameB;
    scenarios.push({
      title:       '「你只管做，都不問問我感受」',
      howItStarts: `${action}直接做了決定或採取行動，沒有先問${emotional}的感受`,
      whatHappens: `${emotional}感覺被忽視、不被在乎；${action}困惑「我做的一切都是為了我們，哪裡有問題？」——兩人都覺得委屈`,
      rootCause:   '行動型以「做事」表達愛，情感型以「被問到」感受愛——付出方式不同，對方收不到',
      solution:    `${action}做重要決定前多一句：「你覺得呢？」；${emotional}也練習把「我想被問」說出口，而不是等對方猜`,
    });
  }

  // 雙情感型
  if (styleA.pattern === '情感型' && styleB.pattern === '情感型') {
    scenarios.push({
      title:       '情緒漩渦——誰先冷靜誰先輸？',
      howItStarts: '一方情緒波動，觸發另一方跟著情緒波動',
      whatHappens: `${nameA}不開心，${nameB}感受到了也不開心；兩個人都在說「你不理解我」，情緒越疊越高`,
      rootCause:   '兩個高情感連結的人，共振太快——彼此都是對方的情緒放大器',
      solution:    '約定「暫停信號」：任何一方說「我需要五分鐘」就立刻暫停，各自沉澱後重新開始',
    });
  }

  // 安全感差距
  const secDiff = Math.abs(mA.security - mB.security);
  if (secDiff > 35) {
    const needMore = mA.security > mB.security ? nameA : nameB;
    const needLess = mA.security > mB.security ? nameB : nameA;
    scenarios.push({
      title:       '「你確定嗎？」vs「放輕鬆嘛」',
      howItStarts: '面對不確定性，兩人反應截然不同',
      whatHappens: `${needMore}需要反覆確認；${needLess}覺得「想太多了，沒事的」；${needMore}感到被忽視，${needLess}感到被拖累`,
      rootCause:   '安全感需求差距大——不是誰對誰錯，是神經系統對「風險」的容忍度不同',
      solution:    `${needLess}多補一句「我明白你擔心，我們可以先準備B計畫」——哪怕只是說說，也能讓${needMore}平靜很多`,
    });
  }

  return scenarios.slice(0, 3);
}

function buildHarmonyTips(
  styleA: CommunicationStyle,
  styleB: CommunicationStyle,
  A: PersonProfile,
  B: PersonProfile,
): string[] {
  const tips: string[] = [];
  const patterns = new Set([styleA.pattern, styleB.pattern]);

  if (patterns.has('情感型')) {
    tips.push('每天花 5 分鐘，不談「事情」，只聊「感受」——「今天你心情怎樣？」這個問題比任何分析都有力量');
  }
  if (patterns.has('邏輯型')) {
    tips.push('討論問題前先說清楚：「我現在需要的是傾聽，還是建議？」——讓對方知道怎麼回應才是對的');
  }
  if (patterns.has('行動型')) {
    tips.push('重要決定前給彼此一個「冷靜期」——寫下各自的想法，24小時後再討論，避免在情緒高峰時說出傷人的話');
  }
  if (patterns.has('穩定型')) {
    tips.push('不要在對方剛進門或剛睡醒時提重要話題——等他們有了空間感，再開口，得到的回應會好三倍');
  }

  tips.push(`記住彼此的「關閉觸發點」：${A.name}最怕「${styleA.whatTriggersShutdown.slice(0, 20)}…」，${B.name}最怕「${styleB.whatTriggersShutdown.slice(0, 20)}…」——避開這些，衝突減少一半`);
  tips.push('爭吵結束後不要馬上討論「誰對誰錯」——先說一句「我在乎你，我們只是說話方式不同」，讓關係的溫度回來');

  return tips.slice(0, 3);
}

function buildCommunicationReport(A: PersonProfile, B: PersonProfile): CommunicationReport {
  const styleA = deriveCommunicationStyle(A.name, A.matrix);
  const styleB = deriveCommunicationStyle(B.name, B.matrix);

  const patternPair = [styleA.pattern, styleB.pattern].sort().join('×');
  const clashMap: Record<string, [string, string]> = {
    '情感型×邏輯型': ['理解 vs 解決 型衝突',  '一個要被懂，一個要給答案——愛的語言不同，不是不愛。'],
    '行動型×穩定型': ['快 vs 慢 型衝突',       '一個先做再說，一個想清楚再動——節奏不同，但目標可以一樣。'],
    '行動型×行動型': ['主導權 型衝突',           '兩個都想帶頭，碰在一起能量強大，但需要分工才不互撞。'],
    '情感型×情感型': ['情緒共振 型衝突',         '彼此是最好的鏡子，也是最容易放大彼此情緒的人。'],
    '邏輯型×穩定型': ['理性 vs 迴避 型衝突',    '一個要分析，一個要和平——表達需求的方式完全不同。'],
    '情感型×行動型': ['感受 vs 效率 型衝突',    '一個覺得沒被在乎，一個覺得沒有進展——都在付出，頻道不對。'],
    '邏輯型×邏輯型': ['頻道相近 低衝突',         '雙方都習慣理性討論，衝突低，但要注意別忽略情感的表達。'],
    '穩定型×穩定型': ['平靜共生 偶有積壓',       '兩個都不愛衝突，但要注意別把委屈悶在心裡，適時開口很重要。'],
  };

  const [clashType, clashDescription] = clashMap[patternPair] ?? ['節奏差異 型衝突', '兩人溝通節奏和方式有差異，需要主動調整頻道。'];

  return {
    personA: styleA,
    personB: styleB,
    clashType,
    clashDescription,
    topConflicts: buildConflictScenarios(A, B, styleA, styleB),
    dailyHarmony: buildHarmonyTips(styleA, styleB, A, B),
  };
}

// ────────────────────────────────────────────────────────────
// 主計算函式（對外唯一入口）
// ────────────────────────────────────────────────────────────

export function computeCompatibility(A: PersonProfile, B: PersonProfile): MatchResult {
  const mA = A.matrix;
  const mB = B.matrix;

  const resonance      = scoreResonance(mA, mB);
  const communication  = scoreCommunication(mA, mB);
  const stability      = scoreStability(mA, mB);
  const conflict_risk  = scoreConflictRisk(mA, mB);
  const complement     = scoreComplement(mA, mB);

  // 總分：共鳴30% + 溝通25% + 穩定25% + 互補20%，再扣除衝突風險加成
  const raw = resonance * 0.30 + communication * 0.25 + stability * 0.25 + complement * 0.20;
  const match_score = clamp(raw - conflict_risk * 0.05); // 衝突風險輕微扣分

  const zones   = buildZones(mA, mB);
  const summary = buildSummary(match_score, resonance, communication, stability, conflict_risk);
  const communicationReport = buildCommunicationReport(A, B);

  return {
    match_score,
    resonance,
    communication,
    stability,
    conflict_risk,
    summary,
    zones,
    communicationReport,
  };
}
