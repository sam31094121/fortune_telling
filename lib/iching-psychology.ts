/**
 * 易經心理學引擎「我最懂你」（2026-08-28）｜技能與功能檔案
 *
 * 定位：後端運算＋前端顯示的共感解盤層。
 * 後端以梅花易數從生辰八字起卦，再把上卦（外在人格 Persona）與下卦（內在自我／
 * 陰影 Shadow）對映到心理學專業概念，產出「我瞭解你、我懂你、我知道你現在在想
 * 什麼」的第一人稱共感文字——直接喊出他的名字，說中他此刻正拿著手機的當下。
 *
 * 鐵律：
 * 1. 全部決定性運算：同一生辰永遠同一卦、同一份心理側寫，可回查可驗證。
 * 2. 心理學名詞必須是真實學術用語（榮格陰影、依附理論、反芻思考、冒牌者現象…），
 *    不可自創偽術語。
 * 3. 共感語氣可以強（我最懂你），但不做醫療診斷、不宣稱讀心超能力為事實——
 *    「感應」是解盤的儀式語言。
 *
 * 專業諮商師格局（每一段話都對應真實諮商技法，水準對標專業心理諮商）：
 *   儀式開場＝治療同盟＋在場感｜「我懂你」＝同理反映＋情緒命名｜
 *   「你是特別的人」＝無條件正向關懷（Rogers）｜外冷內熱＝重新框架｜
 *   「那不是你的錯」＝正常化（心靈捕手技法）｜剝洋蔥節奏＝漸進式揭露｜
 *   卦示行動收攏＝資源導向結尾。專業界線：不診斷、不治療。
 */

import { castHexagramFromBirth, type IChingReading } from './iching-engine';

/** 八卦 → 心理側寫：name=卦、persona=外在呈現（上卦用）、inner=內在自我（下卦用）、term=對應心理學專有名詞 */
const TRIGRAM_PSYCHOLOGY: Record<string, {
  persona: string; personaTerm: string;
  inner: string; innerTerm: string;
}> = {
  乾: {
    persona: '你在人前永遠把自己撐成最可靠的那一個，事情沒做到位你比誰都難受',
    personaTerm: '高成就動機（Achievement Motivation）與完美主義特質',
    inner: '你心裡其實害怕一旦停下來，就沒有人記得你的好',
    innerTerm: '條件式自我價值（Contingent Self-Worth）',
  },
  兌: {
    persona: '你習慣把氣氛顧好，先讓別人舒服，自己的情緒往後排',
    personaTerm: '高親和需求（Need for Affiliation）與討好模式（People-Pleasing）',
    inner: '你笑著的時候，常常同時在計算這句話會不會讓誰不高興',
    innerTerm: '過度自我監控（Self-Monitoring）',
  },
  離: {
    persona: '你需要被看見——不是虛榮，是你把「被理解」當成活著的證據',
    personaTerm: '自我展演（Self-Presentation）與認同需求',
    inner: '你最怕的不是失敗，是努力了半天卻沒有人注意到',
    innerTerm: '鏡映需求（Mirroring Need，自體心理學）',
  },
  震: {
    persona: '你是先行動再說的人，猶豫對你來說比犯錯更難受',
    personaTerm: '行動化模式（Acting Out）與高趨向動機',
    inner: '你其實用「忙」蓋住了不想碰的那件事，一停下來它就浮上來',
    innerTerm: '經驗迴避（Experiential Avoidance）',
  },
  巽: {
    persona: '你對氣氛的變化比誰都敏感，別人一個眼神你就接收到了',
    personaTerm: '高敏感特質（HSP, Highly Sensitive Person）',
    inner: '你常常答應了不想答應的事，因為拒絕的那一秒比委屈更難',
    innerTerm: '邊界模糊（Boundary Diffusion）',
  },
  坎: {
    persona: '你習慣把最壞的情況先想一遍，別人以為你悲觀，其實你是在保護所有人',
    personaTerm: '高警覺（Hypervigilance）與防禦性悲觀（Defensive Pessimism）',
    inner: '夜深的時候，同一件事你會在腦子裡重播很多遍，越想越醒',
    innerTerm: '反芻思考（Rumination）',
  },
  艮: {
    persona: '你有一條別人看不見的線，誰越過了你就安靜地往後退',
    personaTerm: '迴避型依附（Avoidant Attachment）與界線防衛',
    inner: '你不是不想靠近，是怕靠近之後對方看見真實的你會失望',
    innerTerm: '情感隔離（Isolation of Affect，防衛機制）',
  },
  坤: {
    persona: '你總是先接住所有人，大家都以為你不會累',
    personaTerm: '照顧者角色固著（Caretaker Role）與利他性（Altruism）',
    inner: '你把自己排在名單的最後一個，久了連你都忘了自己想要什麼',
    innerTerm: '自我犧牲圖式（Self-Sacrifice Schema）',
  },
};

/**
 * 心靈捕手層：八卦 → 外界怎麼誤讀你（misread）、你內心真正的溫度（warmth）、
 * 以及那道「不是你的錯」的舊傷（wound）。
 * 上卦取 misread（世界看到的殼）、下卦取 warmth 與 wound（殼裡的人）。
 */
const TRIGRAM_SOUL: Record<string, { misread: string; warmth: string; wound: string }> = {
  乾: {
    misread: '大家看你永遠強悍、永遠有辦法，就以為你不需要被照顧',
    warmth: '會在深夜偷偷替每個人把後路想好，自己卻從來不留退路',
    wound: '從小就被要求「你要更好」，久了你以為不夠好的自己不值得被愛——那不是你的錯',
  },
  兌: {
    misread: '大家看你總是笑著，就以為你沒有需要認真對待的傷心',
    warmth: '記得每個人隨口說過的喜好，在對方難過時第一個出現',
    wound: '你學會用開朗換取位置，因為曾經安靜的你沒有被看見——那不是你的錯',
  },
  離: {
    misread: '大家看你發光發熱，就以為你是為了搶鋒頭',
    warmth: '把最好的一面拿出來，其實是想給身邊的人一點亮和一點暖',
    wound: '你曾經很用力地表現，只為了讓某個人回頭看一眼，而那一眼始終沒有來——那不是你的錯',
  },
  震: {
    misread: '大家看你風風火火，就以為你粗枝大葉不用哄',
    warmth: '答應的事拚了命也會做到，行動就是你說「我在乎」的方式',
    wound: '你習慣用衝來證明自己，因為停下來的時候沒有人接住過你——那不是你的錯',
  },
  巽: {
    misread: '大家看你好說話，就以為你怎樣都可以、不會受傷',
    warmth: '把每個人的情緒都輕輕接住，寧可自己繞遠路也不讓別人為難',
    wound: '你太早學會察言觀色，因為那曾是你保護自己唯一的方法——那不是你的錯',
  },
  坎: {
    misread: '大家看你想得多，就以為你難相處、太悲觀',
    warmth: '把所有風險先替大家扛在腦子裡，用操心的方式深深愛人',
    wound: '你反覆檢查每一步，因為曾經一次的意外沒有人替你擋——那不是你的錯',
  },
  艮: {
    misread: '大家看你冷冷的、有距離，就以為你不在乎',
    warmth: '話少，但誰真的有難，你會一聲不響地站到他身邊',
    wound: '你把門關上，是因為曾經敞開的時候被辜負過——那不是你的錯',
  },
  坤: {
    misread: '大家看你什麼都說好，就以為你沒有自己的聲音',
    warmth: '默默把整個場子的重量扛起來，讓每個人都有地方可以靠',
    wound: '你習慣把自己縮到最小，因為你以為只有付出才配得到位置——那不是你的錯',
  },
};

/**
 * 特殊格局命名系統：每一卦都有專屬「格局名稱」——客戶聽到的不是課本卦名，
 * 是屬於他自己的命格稱號（外局字取上卦、內核字取下卦，8×8=64 個不重複格局名）。
 */
const PATTERN_OUTER: Record<string, string> = {
  乾: '天啟', 兌: '澤鳴', 離: '焰照', 震: '雷引', 巽: '風行', 坎: '淵藏', 艮: '山鎮', 坤: '地承',
};
const PATTERN_INNER: Record<string, string> = {
  乾: '御龍', 兌: '懷珠', 離: '抱火', 震: '蟄雷', 巽: '納風', 坎: '守泉', 艮: '蘊玉', 坤: '載壤',
};

/** 取得此卦的專屬格局名稱，例如 山水蒙（上艮下坎）→「山鎮守泉格」。 */
export function patternNameOf(hexagram: IChingReading): string {
  return `${PATTERN_OUTER[hexagram.upper.name] ?? ''}${PATTERN_INNER[hexagram.lower.name] ?? ''}格`;
}

/** 動爻 1-6 → 「我知道你現在在想什麼」：對應此刻最掛心的那個念頭與心理學概念 */
const CHANGING_LINE_MIND: Record<number, { thought: string; term: string }> = {
  1: { thought: '要不要開始那件你已經想了很久的事——你不是沒有答案，你是在等一個推你一把的人', term: '決策疲勞（Decision Fatigue）' },
  2: { thought: '「到底有沒有人真的懂我」——你嘴上說沒關係，心裡其實在等一個不用解釋就懂你的人', term: '被理解需求（Felt Understanding）' },
  3: { thought: '「我是不是哪裡做錯了」——你把責任往自己身上攬的速度，永遠比檢討別人快', term: '冒牌者現象（Impostor Phenomenon）' },
  4: { thought: '那句到嘴邊又吞回去的話——你演練過很多次，只是還沒找到說出口的時機', term: '情緒壓抑（Expressive Suppression）' },
  5: { thought: '「我還扛不扛得住」——你不是不行了，你只是太久沒有人問你累不累', term: '角色過載（Role Overload）' },
  6: { thought: '「是不是該放下了」——你其實已經知道答案，只是捨不得那些已經付出的', term: '沉沒成本謬誤（Sunk Cost Fallacy）' },
};

/**
 * 鬼魅拆卦層：把卦象翻譯成「靈異／磁場／干擾／因果」的神秘語言，
 * 但每一句底下都綁著真實心理學機制＋客戶「當下身體實際感受」的錨點。
 * 三大因素：神秘口氣（外衣）＋邏輯推理（骨架）＋具象感受（錨點）。
 */
const TRIGRAM_FIELD: Record<string, { field: string; mechanism: string }> = {
  乾: { field: '你頭頂上方的磁場繃得極緊，像有一道高壓在往下壓', mechanism: '長期高責任負荷（Role Strain）——壓力荷爾蒙讓身體維持備戰狀態' },
  兌: { field: '你周圍的言語頻率很亂，說出口的和想說的對不上波長', mechanism: '表達與真實意圖的不一致（Incongruence，Rogers）' },
  離: { field: '你的目光磁場一直往外放，卻很少有等量的光照回你身上', mechanism: '單向的注意力供給——付出關注多於被關注（Attention Asymmetry）' },
  震: { field: '你身上有一股雷動的震波，靜不下來，連空氣都跟著急', mechanism: '交感神經過度活化（Sympathetic Overdrive）——身體停不住的行動預備' },
  巽: { field: '你所在的風向很亂，四面八方的氣流都在推你', mechanism: '過度接收他人訊號（External Referencing）——決策軸心飄在別人身上' },
  坎: { field: '你腳下的水氣一直在沉降，越晚越深，把念頭往下拖', mechanism: '夜間反芻循環（Nocturnal Rumination）——大腦預設模式網路過度活躍' },
  艮: { field: '你面前立著一道山壁般的屏障，訊號進得來、你出不去', mechanism: '防衛性退縮（Defensive Withdrawal）——保護機制反鎖了出口' },
  坤: { field: '大地的引力對你特別重，你扛著的東西比看起來多', mechanism: '慢性負荷累積（Allostatic Load）——長期過載的生理代價' },
};

/** 下卦 → 干擾源＝客戶「當下身體實際感受」的錨點（讀到這裡他會點頭：對，就是這個感覺） */
const TRIGRAM_FELT_SENSE: Record<string, string> = {
  乾: '最近你的肩頸是不是常常僵硬、夜裡會不自覺咬緊牙關——那是責任扛太滿，身體先替你說了',
  兌: '是不是常常話到喉嚨又吞回去、喉頭有一點緊——那是想說的話被你自己按住了',
  離: '眼睛是不是常常發酸、忍不住一直看手機等某個回應——那是「被看見」的需求在敲門',
  震: '是不是坐不太住、手指會無意識敲桌面、心跳偶爾快半拍——那是身體在催你動，但方向還沒定',
  巽: '胃是不是偶爾微微縮緊、跟人說話時會下意識觀察對方臉色——那是雷達開太久沒關機',
  坎: '是不是躺下之後腦子反而更清醒、同一件事重播好幾遍、半夜容易醒——那是心裡的水還在流',
  艮: '胸口是不是像有一道閘門、聊天時手會不自覺抱在胸前——那是防衛姿勢，身體比你誠實',
  坤: '是不是整個人沉沉的、明明很累卻停不下來、休息時反而更空——那是過載太久的訊號',
};

/** 動爻 → 因果鏈（條件式邏輯推理：起因 → 現在的干擾 → 若不處理的走向） */
const CHANGING_LINE_KARMA: Record<number, string> = {
  1: '因果的起點在「最初的猶豫」——當時一個沒做的決定，讓現在的磁場一直繞圈；若持續擱置，干擾只會往上蔓延',
  2: '因果的起點在「沒被接住的心意」——曾經想靠近卻被輕輕略過，現在的干擾就是那次的回聲；說出口，迴路才會斷',
  3: '因果的起點在「一次把錯攬上身」——從那之後你習慣先怪自己，干擾靠這個習慣供電；停止自責，它就斷糧',
  4: '因果的起點在「吞下去的那句話」——沒說出口的話不會消失，它變成現在的雜訊；找對的人說完，磁場就會靜',
  5: '因果的起點在「扛起來就沒放下過」——你以為撐住是責任，干擾卻靠你的疲累壯大；分出去一件事，結界就鬆',
  6: '因果的起點在「捨不得的那筆投入」——已經付出的牽著你不放，干擾就藏在「不甘心」裡；認賠的那一刻，路就開',
};

/**
 * 鬼魅老師的標準輸出格式（永久技能）：三段檔案輸出＝磁場・詭異・因果（功能 01/02/03）。
 * 磁場＝干擾判讀（外場＋身體感受錨點）、詭異＝異象顯跡（卦影＋舊迴聲）、
 * 因果＝因果鏈拆解（起因→現在→走向的條件式推理）。每段都綁真實心理機制。
 */
export type GhostDecoding = {
  field: string; // 【磁場】功能01・干擾判讀：外場判讀＋當下身體實際感受錨點
  spirit: string; // 【詭異】功能02・異象顯跡：卦影＋還沒散場的舊迴聲
  karma: string; // 【因果】功能03・因果鏈拆解：條件式邏輯推理
};

/** 鬼魅拆卦：磁場／詭異／因果三段標準輸出，句句綁真實心理學與身體感受。 */
export function buildGhostDecoding(hexagram: IChingReading): GhostDecoding {
  const upperField = TRIGRAM_FIELD[hexagram.upper.name];
  const lowerField = TRIGRAM_FIELD[hexagram.lower.name];
  const wound = TRIGRAM_SOUL[hexagram.lower.name].wound;
  return {
    field: `【磁場】干擾判讀（上卦${hexagram.upper.name}外場、下卦${hexagram.lower.name}內源）：${upperField.field}。${TRIGRAM_FELT_SENSE[hexagram.lower.name]}。說穿了——外場是「${upperField.mechanism}」、內源是「${lowerField.mechanism}」，不是玄，是你的身心真的在這個狀態裡。`,
    spirit: `【詭異】異象顯跡（卦影${hexagram.glyph}・${hexagram.hexagramName}）：在你身邊徘徊的不是外靈，是一段還沒散場的舊迴聲——${wound}。所謂「不乾淨」，其實是未完成事件的殘影（Unfinished Business，完形心理學）。`,
    karma: `【因果】因果鏈拆解（動爻第${hexagram.changingLine}爻）：${CHANGING_LINE_KARMA[hexagram.changingLine] ?? CHANGING_LINE_KARMA[2]}。`,
  };
}

/** 給鬼魅老師提示詞用：三段標準檔案輸出（磁場→詭異→因果，順序固定）。 */
export function formatGhostDecoding(hexagram: IChingReading): string {
  const d = buildGhostDecoding(hexagram);
  return `${d.field}\n${d.spirit}\n${d.karma}`;
}

export type EmpathicReading = {
  greeting: string; // 喊名字＋「此刻你拿著手機」的當下感應開場
  iKnowYourSurface: string; // 我懂你的外在（上卦 Persona）
  iKnowYourInside: string; // 我懂你的內在（下卦 Shadow／內在自我）
  iKnowYourMindNow: string; // 我知道你現在在想什麼（動爻）
  specialYou: string; // 「你是特別的人」：外冷內熱的反差點破（上卦誤讀 × 下卦溫度）
  absolution: string; // 心靈捕手時刻：「那不是你的錯」（下卦舊傷）
  soulFriendVow: string; // 知己宣言：因為懂你，想成為你的密友
  psychologyTerms: string[]; // 本次用到的心理學專有名詞（可回查）
  closing: string; // 收尾：從「被懂」走向行動
  hexagram: IChingReading; // 起卦依據，可回查
};

/**
 * 「我最懂你」共感解盤：以生辰八字起卦，產出第一人稱共感文字。
 * name 會被直接喊出來；shichenIndex 未知可傳 null（依梅花易數以午時計）。
 */
export function buildEmpathicReading(name: string, birthDate: string, shichenIndex?: number | null): EmpathicReading {
  return buildEmpathicFromHexagram(name, castHexagramFromBirth(birthDate, shichenIndex ?? null));
}

/**
 * 引擎共用入口：任何模組已起好的卦（八字老師、姓名學、配對）直接傳進來，
 * 共感層與該模組的卦象保證同一卦、同一口徑。
 */
export function buildEmpathicFromHexagram(name: string, hexagram: IChingReading): EmpathicReading {
  const upper = TRIGRAM_PSYCHOLOGY[hexagram.upper.name];
  const lower = TRIGRAM_PSYCHOLOGY[hexagram.lower.name];
  const upperSoul = TRIGRAM_SOUL[hexagram.upper.name];
  const lowerSoul = TRIGRAM_SOUL[hexagram.lower.name];
  const mind = CHANGING_LINE_MIND[hexagram.changingLine] ?? CHANGING_LINE_MIND[2];
  const shortName = Array.from(name.trim()).slice(-2).join('') || name.trim();

  return {
    // 卜卦儀式開場：手機溫度感應 → 請他靜下來 → 卦成 → 特殊格局
    greeting: [
      `${shortName}，你現在正拿著手機——把手心的溫度，透過螢幕傳過來。……我感覺到了。`,
      `我現在幫你卜一個卦。這需要一點時間——你先靜下來，慢慢呼吸。心靜了，我才能真正感受到你。`,
      `……卦成了。${shortName}，你這個卦很特殊，是特殊格局——「${patternNameOf(hexagram)}」（${hexagram.hexagramName}・第${hexagram.kingWen}卦）。外局${PATTERN_OUTER[hexagram.upper.name]}、內核${PATTERN_INNER[hexagram.lower.name]}，六十四格裡就這一格是你。難怪。你本來就是一個很特別的人，這個卦只是替你證明了這件事。`,
    ].join('\n'),
    iKnowYourSurface: `我懂你。${upper.persona}。心理學叫這個「${upper.personaTerm}」，但我更願意說：這是你替自己選的鎧甲。`,
    iKnowYourInside: `我也懂鎧甲底下的你。${lower.inner}。這在心理學上是「${lower.innerTerm}」——你以為藏得很好，但你的卦（${hexagram.hexagramName}）下卦是${hexagram.lower.name}，它替你說了實話。`,
    iKnowYourMindNow: `我知道你現在在想什麼：${mind.thought}。這種心理狀態叫「${mind.term}」，動爻落在第${hexagram.changingLine}爻，指的就是此刻的你。`,
    specialYou: `${shortName}，你是一個很特別的人——這不是客套。${upperSoul.misread}；可是我看見的是另一個你：${lowerSoul.warmth}。外面的人讀到的是殼，我讀到的是溫度。心理學把這叫「外顯行為與內在自我的落差（Persona-Self Discrepancy）」，我把它叫：你把最軟的地方藏在最硬的殼裡。`,
    absolution: `還有一句話，我想看著你說：${lowerSoul.wound}。聽清楚——那，不是，你的錯。`,
    soulFriendVow: `所以${shortName}，讓我用卦象、用八字、用心理學陪在你旁邊——不是老師對學生，是密友對密友。全世界都聽你「說了什麼」，我聽的是你「沒說出口的那一句」。你不用在我這裡表現，也不用解釋，因為我真的懂你。`,
    psychologyTerms: [upper.personaTerm, lower.innerTerm, mind.term, '外顯行為與內在自我的落差（Persona-Self Discrepancy）'],
    closing: `${shortName}，被懂不是終點。${hexagram.essence}——卦已經替你指了方向：${hexagram.advice}`,
    hexagram,
  };
}

/**
 * 前端顯示用：把共感解盤合成可直接渲染的完整文字（心靈捕手・剝洋蔥版）。
 * 心理學「剝洋蔥」結構：由外而內一層層剝，最後抵達核心脆弱性（Core Vulnerability）
 * ——那道「不是你的錯」的舊傷；剝完之後不留人在傷口上，用知己宣言與卦示行動收攏。
 */
export function formatEmpathicReading(reading: EmpathicReading): string {
  return [
    reading.greeting,
    `【剝洋蔥・第一層｜人格外殼】${reading.iKnowYourSurface}`,
    `【剝洋蔥・第二層｜殼下的自我】${reading.iKnowYourInside}`,
    `【剝洋蔥・第三層｜此刻的心思】${reading.iKnowYourMindNow}`,
    `【剝洋蔥・第四層｜外冷內熱】${reading.specialYou}`,
    `【剝洋蔥・核心｜核心脆弱性 Core Vulnerability】${reading.absolution}`,
    reading.soulFriendVow,
    reading.closing,
  ].join('\n');
}
