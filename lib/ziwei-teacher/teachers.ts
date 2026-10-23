// 2026-10-23 ai-to-asura：三位老師全部走後端決定性內容，已移除 Google AI SDK 與未使用的 prompt／schema。
/**
 * 三位 易經老師（2026-08-22）｜規格「二、三、八、九、十、二十」
 *
 * 鐵律：三位老師只能讀 `PalaceAnalysisContext`（已驗證的正式命盤資料），
 * 不得自行安星、改宮位、改四化、猜三方四正、補不存在的星曜。
 * 三位老師視角必須真正不同：
 *   命盤解析老師（STRUCTURE_MASTER）——解析命盤：本宮→主星→三方四正→四化→輔煞→格局總判。
 *   恐怖型老師（LIFE_MASTER）——危機解盤：只從已存在的壓力、煞曜與化忌指出需要正視的風險。
 *   鬼魅型老師（NARRATIVE_MASTER）——鬼魅解盤：把宮位/星曜/四化轉成可回查的幽微場景與隱喻。
 * 三個 prompt 互相明確禁止做對方的事，這是落實「不得互相複製」的第一道防線
 * （規格「十一」的自動語意相似度檢查列入 Phase 2）。
 */

import { castHexagram } from '@/lib/iching-engine';

import { authoritySummary } from '@/lib/ziwei/wording-authority';
import type { LifeTeacherResult, NarrativeTeacherResult, PalaceAnalysisContext, PalaceId, StructureTeacherResult, TeacherId } from './types';
import { INSUFFICIENT_DATA } from './types';
import { selectGhostAsuraLines } from './ghost-asura-lines';

/**
 * TeacherModelRouter（Phase 1 精簡版，規格「十九」）：老師角色不綁死模型品牌——
 * Customer UI 永遠只看到老師角色，實際呼叫哪個模型設定由這裡決定。
 * 目前三位老師都指向同一個 Gemini 模型，但各自有獨立的 config 物件，
 * 之後要換不同供應商，只需要改這裡，不用動 prompt 或 UI。
 */

/** 客戶看到前，將危機敘事拉回「有條件的風險」，不能把命盤推論寫成命定事件。 */

/** 鬼魅老師沒有客戶性別資料可讀；人物稱呼一律保持中性，不能自行指定性別或身份。 */

/* ---------------- 共用：把 Context 序列化成老師能讀的固定格式文字 ---------------- */

/** 引用依據表：每顆星標上《紫微斗數全書》核對等級，限制話術能引用到多大（lib/ziwei/wording-authority.ts）。 */

/** 每一宮的易經卦象：以宮名＋主星＋流年決定性起卦，三位老師（含鬼魅老師）共用同一卦。 */
function castPalaceHexagram(context: PalaceAnalysisContext) {
  return castHexagram(
    context.selectedPalace.palaceName,
    context.selectedPalace.majorStars.map((s) => s.name).join(','),
    context.timeContext.annualYear,
  );
}

/**
 * 十二宮不能共用一套泛用劇本。這份錨點只定義「此宮可以談什麼」，
 * 實際張力仍必須由本宮、三方四正、四化與當下時間層的資料決定。
 */
const PALACE_SITUATION_GUIDES: Record<PalaceId, { topic: string; lifeScenes: string; narrativeSet: string; forbidden: string }> = {
  LIFE: { topic: '自我定位、邊界與行動選擇', lifeScenes: '鏡子前的決定、拒絕或硬撐、身份與界線被挑戰的時刻', narrativeSet: '私人房間、鏡面、門口、未拆的信或手機螢幕', forbidden: '不得無依據寫成職場、婚姻、金錢或外出事故' },
  SIBLINGS: { topic: '手足、同儕、朋友般的競合與協調', lifeScenes: '分工失衡、訊息未回、比較、站隊或共同責任', narrativeSet: '長桌、群組訊息、空下來的一張椅子、被反覆轉交的物件', forbidden: '不得把手足／同儕議題偷換成伴侶或財務主題' },
  SPOUSE: { topic: '親密關係、承諾、信任與相處界線', lifeScenes: '對話中斷、承諾落差、互相試探、距離與協議', narrativeSet: '兩副餐具、半掩的門、未讀訊息、雙人空間裡的沉默', forbidden: '不得捏造出軌、暴力、分手或具體伴侶身份' },
  CHILDREN: { topic: '子女、作品、創造力與投入後的責任', lifeScenes: '照顧、培養、作品延宕、期待與回應落差', narrativeSet: '尚未完成的作品、走廊盡頭的燈、散落的紙張、等待回應的鈴聲', forbidden: '不得捏造懷孕、子女疾病或具體家庭事件' },
  WEALTH: { topic: '收入、資源、支出、價值交換與掌控感', lifeScenes: '付款前的猶豫、資源分配、帳目壓力、機會成本', narrativeSet: '帳本、收據、鎖上的抽屜、紅色數字或熄滅的螢幕', forbidden: '不得斷言破產、失業、詐騙或具體財損' },
  HEALTH: { topic: '身心節奏、恢復、耗損與自我照顧', lifeScenes: '過度硬撐、休息被打斷、節奏失衡與疲乏訊號', narrativeSet: '凌晨的燈、未喝完的水、反覆響起的提醒、安靜的房間', forbidden: '不得診斷疾病、預言傷害或渲染身體恐慌' },
  TRAVEL: { topic: '外出、遷動、陌生環境與外界適應', lifeScenes: '出門前的判斷、路線變動、陌生人際與環境壓力', narrativeSet: '車站月台、雨夜街燈、行李、地圖上被擦掉的路線', forbidden: '不得捏造車禍、失蹤、犯罪或旅外災難' },
  FRIENDS: { topic: '人脈、合作、信任、界線與群體位置', lifeScenes: '合作分工、承諾沒有落地、關係消耗、誰值得交付', narrativeSet: '會議室最後一盞燈、名單、沒有人簽下的紙、空群組', forbidden: '不得把合作摩擦寫成背叛已發生或具體陰謀' },
  CAREER: { topic: '工作舞台、責任、決策、權責與職涯方向', lifeScenes: '截止壓力、權責不清、被看見或被忽略、關鍵選擇', narrativeSet: '辦公桌、走廊、倒數時鐘、未完成的文件與亮著的螢幕', forbidden: '不得斷言被解雇、職場迫害或重大失敗' },
  PROPERTY: { topic: '居住、家庭空間、資產、安全感與根基', lifeScenes: '家中秩序、安定感、搬動、空間界線與資源安放', narrativeSet: '玄關、鑰匙、空房間、牆上的影子與沒有關緊的窗', forbidden: '不得捏造房屋損失、家庭暴力或產權糾紛' },
  FORTUNE: { topic: '內在感受、獨處、休息、欲望與心理餘裕', lifeScenes: '獨處時反覆浮現的念頭、放鬆困難、享受與逃避的拉扯', narrativeSet: '深夜沙發、耳機、未播完的影片、窗外光影與靜止的時鐘', forbidden: '不得診斷心理疾病、渲染自傷或靈異附身' },
  PARENTS: { topic: '長輩、權威、原生期待、支持與壓力', lifeScenes: '被期待的選擇、規則、傳承、需要交代或被看見的時刻', narrativeSet: '舊照片、餐桌、沒有說完的叮嚀、長廊盡頭的門', forbidden: '不得捏造親人死亡、疾病、衝突或具體家庭悲劇' },
};

/**
 * 說服力規則（docs/技能戰鬥檔案/紫微斗數/話術強化.md）：三位老師各取適用的幾條，不得互相越界。
 * 命盤解析老師不給人生建議、鬼魅老師不給行動方向，所以規則④只給危機老師。
 */

/** 「鬼魅解盤」（LIFE_MASTER 恐怖段 + NARRATIVE_MASTER 鬼魅段）共用的五大元素規格：這是恐怖片等級的沉浸遊戲，五者缺一不可，但全部必須是本宮真實星曜/煞曜/四化的電影化再現，不能脫離命盤另外編故事。 */
const GHOST_READING_FIVE_ELEMENTS = `【五大元素・本局遊戲強制規格】這是恐怖片等級的沉浸式命盤劇情，同一段內容必須同時命中以下五個類型元素，缺一不可；但五者都只能是本宮實際星曜、煞曜、四化與情境錨點的電影化再現，禁止脫離命盤證據另外編造情節：
①恐怖（壓迫）：貫穿全場的逼近感與倒數感，讓讀者感覺代價正在逼近，不是溫和提醒。
②血腥（質地）：畫面可使用深紅光、血色反光、暗紅污漬、破碎鏡面或器物等強烈視覺質地，把陰森感做滿；但不得描述真實人物受傷、肢解、死亡或血腥暴力發生在客戶身上，那是視覺質地不是事實陳述。
③鬼魅（靈異氣氛）：至少一個若隱若現的存在感——像有什麼在門縫後看著、在走廊盡頭等著；不宣稱真實靈異事件。
④驚悚（轉折）：情節中段要有一次意外轉折或發現，讓讀者一驚，不能平鋪直敘到底。
⑤災難（規模）：至少一個畫面把壓力放大成毀滅級的環境意象（停電吞沒整層樓、暴雨灌進窗縫、結構發出崩裂聲、警報貫穿走廊），象徵這股命盤壓力若持續失控會擴大到什麼規模；這是象徵性的環境毀滅意象，不是對客戶真實會遇到天災人禍的預言或事實陳述。
五個元素必須自然融進同一個連貫場景，不能像清單一樣逐條交代；且每一個都要能回查到本宮實際存在的星曜、煞曜或四化。
【話術強化】禁止用抽象形容詞堆砌交代恐怖（如「令人不寒而慄」「充滿詭異氣息」這類空話）；改用具體可感的動作、聲音、觸感、氣味逼出畫面，例如指甲刮過門板的聲音、冷汗貼住後頸的觸感、燒焦電線的氣味。開頭第一句要立刻把讀者拋進畫面中央，不得用「在一個…的夜晚」這類鋪陳式開場。句子長短要交錯：短句制造心跳感的停頓，長句堆疊壓迫感的累積，不能整段句長一致讀起來平淡。`;

function hasUsableData(context: PalaceAnalysisContext): boolean {
  return context.selectedPalace.majorStars.length > 0 || context.selectedPalace.supportingStars.length > 0;
}

/* ==================== 老師 1｜格局老師 STRUCTURE_MASTER ==================== */

export async function runStructureTeacher(context: PalaceAnalysisContext): Promise<StructureTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
  return buildLocalStructureResult(context);
}

/* ==================== 老師 2｜恐怖型老師 LIFE_MASTER ==================== */

export async function runLifeTeacher(context: PalaceAnalysisContext): Promise<LifeTeacherResult | typeof INSUFFICIENT_DATA> {
  // 2026-10-23 ghost-asura：鬼魅老師改為後端決定性選句（古籍條文表），不呼叫 AI；本宮無主星時借對宮主星。
  const ghostAsura = selectGhostAsuraLines(context);
  if (!hasUsableData(context) && ghostAsura.status === 'NO_MAJOR_STAR') return INSUFFICIENT_DATA;
  return { ...buildLocalLifeResult(context), ghostAsura };
}

/* ==================== 老師 3｜鬼魅型老師 NARRATIVE_MASTER ==================== */

export async function runNarrativeTeacher(context: PalaceAnalysisContext): Promise<NarrativeTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
  return buildLocalNarrativeResult(context);
}

/* ==================== 本地統計後備引擎（免費、離線、決定性） ====================
 * Gemini 不可用（額度、逾時、金鑰缺失）時，三位老師改由這裡供稿：
 * 全部內容取自已驗證命盤的實際星曜、煞曜、四化與三方四正，用固定權重做
 * 「結構分數」的比對——同一張盤永遠得到同一組數字與判語。
 * 易經恢復後自動接回，本引擎只在 易經失敗時出手。 */

type PalaceBlock = PalaceAnalysisContext['selectedPalace'];

const TRANS_LABEL = { LU: '祿', QUAN: '權', KE: '科', JI: '忌' } as const;

/** 結構分數：主星 +8／輔星 +3／煞曜 −6；化祿權科 +5、化忌 −7；基準 50，範圍 5–95。 */
function palaceEnergyScore(palace: PalaceBlock): number {
  let score = 50 + palace.majorStars.length * 8 + palace.supportingStars.length * 3 - palace.maleficStars.length * 6;
  for (const t of palace.transformations) score += t.type === 'JI' ? -7 : 5;
  return Math.min(95, Math.max(5, score));
}

function majorText(palace: PalaceBlock): string {
  return palace.majorStars.map((s) => s.name).join('、') || '無十四主星（借對宮論）';
}

function transText(palace: PalaceBlock): string {
  return palace.transformations.map((t) => `${t.starName}化${TRANS_LABEL[t.type]}`).join('、') || '無四化';
}

/** 依當下時段挑選合規的畫面素材（正午不得寫成深夜，遵守既有情境層規則）。 */
function momentImagery(moment: PalaceAnalysisContext['timeContext']['sceneMoment']): { light: string; sound: string } {
  switch (moment) {
    case 'NOON': return { light: '白到刺眼的日光壓在空無一人的走廊上', sound: '只剩空調運轉的單調聲' };
    case 'MORNING': return { light: '亮得過分的晨光照著沒人動過的桌面', sound: '走廊傳來越來越近的腳步聲' };
    case 'DAWN': return { light: '天剛亮的灰藍光線停在窗框上', sound: '整層樓安靜得能聽見自己的呼吸' };
    case 'AFTERNOON': return { light: '拉長的午後影子貼著牆角', sound: '時鐘秒針一格一格逼近截止的聲音' };
    case 'EVENING': return { light: '室內只剩半排燈亮著', sound: '電梯在別的樓層停了很久' };
    case 'NIGHT': return { light: '螢幕的冷光映在暗下來的房間', sound: '走廊盡頭傳來一聲很輕的關門聲' };
    case 'MIDNIGHT':
    default: return { light: '門縫下漏進一線微弱的光', sound: '靜止的空間裡有什麼輕輕動了一下' };
  }
}

function normalizeRiskLanguage(text: string): string {
  return text
    .replaceAll('最終會', '若持續忽視，容易')
    .replaceAll('將導致', '容易演變為')
    .replaceAll('必然', '高度需要警覺的')
    .replaceAll('無法挽回', '難以收拾')
    .replaceAll('明確指出', '顯示出')
    .replaceAll('一定會', '容易會');
}

function normalizeNarrativeIdentity(text: string): string {
  return text
    .replaceAll('男主角', '這個人')
    .replaceAll('女主角', '這個人')
    .replaceAll('男人', '這個人')
    .replaceAll('女人', '這個人')
    .replaceAll('男子', '這個人')
    .replaceAll('女子', '這個人')
    .replaceAll('他們', '那些人')
    .replaceAll('她們', '那些人')
    .replaceAll('他', '這個人')
    .replaceAll('她', '這個人');
}

function normalizeLifeResult(result: Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'>): Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'> {
  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, typeof value === 'string' ? normalizeRiskLanguage(value) : value]),
  ) as Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'>;
}

function normalizeNarrativeResult(result: Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'>): Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'> {
  return {
    ...result,
    visualTitle: normalizeNarrativeIdentity(result.visualTitle),
    scene: normalizeNarrativeIdentity(result.scene),
    mainCharacter: normalizeNarrativeIdentity(result.mainCharacter),
    story: normalizeNarrativeIdentity(result.story),
    pastEcho: normalizeNarrativeIdentity(result.pastEcho),
    futureShadow: normalizeNarrativeIdentity(result.futureShadow),
    finalMetaphor: normalizeNarrativeIdentity(result.finalMetaphor),
    symbols: (result.symbols ?? []).map((symbol) => ({
      ...symbol,
      symbol: normalizeNarrativeIdentity(symbol.symbol),
      meaning: normalizeNarrativeIdentity(symbol.meaning),
      sourceRef: normalizeNarrativeIdentity(symbol.sourceRef),
    })),
  };
}

function buildLocalStructureResult(context: PalaceAnalysisContext): StructureTeacherResult {
  const p = context.selectedPalace;
  const score = palaceEnergyScore(p);
  const scores = {
    A: palaceEnergyScore(context.threeHarmony.harmonyA),
    B: palaceEnergyScore(context.threeHarmony.harmonyB),
    O: palaceEnergyScore(context.threeHarmony.opposite),
  };
  const strongest = scores.A >= scores.B && scores.A >= scores.O ? context.threeHarmony.harmonyA : scores.B >= scores.O ? context.threeHarmony.harmonyB : context.threeHarmony.opposite;
  const weakest = scores.A <= scores.B && scores.A <= scores.O ? context.threeHarmony.harmonyA : scores.B <= scores.O ? context.threeHarmony.harmonyB : context.threeHarmony.opposite;
  const structureType = score >= 70 ? '攻堅型' : score >= 55 ? '穩健型' : '承壓型';
  const jiList = p.transformations.filter((t) => t.type === 'JI');
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];

  return {
    teacherId: 'STRUCTURE_MASTER',
    palace: p.palaceName,
    corePattern: `${p.palaceName}結構分數 ${score}/100（${structureType}）：主星${majorText(p)}，四化${transText(p)}。`,
    primaryStarSynthesis: `本宮主星${majorText(p)}，主星 ${p.majorStars.length} 顆、輔星 ${p.supportingStars.length} 顆、煞曜 ${p.maleficStars.length} 顆——星曜越多，這一宮在「${guide.topic}」上扛得住的事越多。`,
    threeHarmonySynthesis: `三方四正分數：${context.threeHarmony.harmonyA.palaceName} ${scores.A}、${context.threeHarmony.harmonyB.palaceName} ${scores.B}、對宮${context.threeHarmony.opposite.palaceName} ${scores.O}。支撐最強的是${strongest.palaceName}（${majorText(strongest)}），牽制最明顯的是${weakest.palaceName}。`,
    transformationEffect: jiList.length > 0
      ? `${jiList.map((t) => `${t.starName}化忌`).join('、')}是這一宮最主要的耗損點；其餘四化${p.transformations.filter((t) => t.type !== 'JI').map((t) => `${t.starName}化${TRANS_LABEL[t.type]}`).join('、') || '無'}提供加分能量。`
      : `本宮${transText(p)}；${p.transformations.length > 0 ? '四化以加分方向為主，結構取得額外推力。' : '無四化引入額外波動，結構以星曜本質穩定運作。'}`,
    importantSupportingStars: [
      ...p.supportingStars.slice(0, 2).map((s) => `輔星${s.name}：加分，讓這一宮更撐得住。`),
      ...p.maleficStars.slice(0, 2).map((s) => `煞曜${s.name}：扣分，是分數被拉低的原因。`),
    ],
    structuralStrength: `最能撐住你的是${strongest.palaceName}（${Math.max(scores.A, scores.B, scores.O)} 分），配合主星${majorText(p)}，在「${guide.topic}」上有一再用得上的底氣。`,
    structuralPressure: `壓力集中在${weakest.palaceName}（${Math.min(scores.A, scores.B, scores.O)} 分）${jiList.length > 0 ? `，且${jiList[0].starName}化忌落在本宮，` : '，'}這裡決定了這一宮最低會掉到哪裡；遇到${guide.lifeScenes}這類時刻，這裡最容易先出現摩擦。`,
    pastStructure: `此宮長期容易養成「${guide.topic}」上的固定慣性：能量高時傾向多承接、能量低時傾向遞延處理；這是盤面推論，不指涉具體經歷。`,
    // 流年主題是一整段話，塞進「」會變成引號套引號的長句；主題留在命盤依據裡回查即可。
    futureTendency: `${context.timeContext.annualYear} 年這一年，若${weakest.palaceName}的牽制沒有處理，分數容易往下掉；反過來把那裡補上，${structureType}結構就有機會再往上走。`,
    conclusion: `${authoritySummary(p)}結論：${p.palaceName}為${structureType}結構（${score}/100）。易經同步起卦得「${castPalaceHexagram(context).hexagramName}」印證：${castPalaceHexagram(context).advice}優先處理${weakest.palaceName}的牽制、善用${strongest.palaceName}的支撐，是這張盤最省力的走法。提醒一句：星曜只是描述盤面的形容詞，走勢要看整張盤的星曜組合、亮度、四化與三方四正一起怎麼配，不是單一顆星說了算。`,
    evidenceRefs: buildEvidenceRefs(context),
  };
}

function buildLocalLifeResult(context: PalaceAnalysisContext): LifeTeacherResult {
  const p = context.selectedPalace;
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];
  const img = momentImagery(context.timeContext.sceneMoment);
  const score = palaceEnergyScore(p);
  const mainStar = p.majorStars[0]?.name ?? context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮主星';
  const malefic = p.maleficStars[0]?.name;
  const ji = p.transformations.find((t) => t.type === 'JI');
  const pressurePoint = ji ? `${ji.starName}化忌` : malefic ? `煞曜${malefic}` : `${mainStar}的高張力面`;

  const raw: Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'> = {
    fearScene: `這一宮談的是${guide.topic}。${img.light}，${img.sound}。真正逼近的不是畫面，是${pressurePoint}在${guide.topic}上累積的代價：${guide.lifeScenes}裡的每一次遞延，都會讓你付出的成本再墊高一層；若持續忽視，這股壓力容易從單點擴大成整片。`,
    lifeMeaning: `本宮壓力核心：${pressurePoint}。它讓「${guide.topic}」的每個決定都帶著隱形利息，越晚面對，本金越大；好處是這種壓力有跡可循，早一點處理，成本就小一點。`,
    pastPattern: `此宮長期容易重複的模式：在${guide.lifeScenes}的場景中先扛下、後消化；這是盤面傾向的推論，不是已發生事件。`,
    futureRiskWindow: `${context.timeContext.annualYear} 年這一年${context.timeContext.currentAge !== null ? `、${context.timeContext.currentAge} 歲的這一段` : ''}，當${pressurePoint}與截止壓力疊加時，是需要提高警覺的窗口；條件不成立時，壓力不會自動引爆。`,
    strengthInReality: `可用的力量是${mainStar}帶來的承載力（結構分數 ${score}/100）；但它失控時會反噬成「什麼都自己扛」，反而把${guide.topic}的界線推垮。`,
    repeatedPattern: `一開始：你告訴自己再撐一下。接著：${guide.lifeScenes}裡的訊號被合理化。最後代價：壓力放大成整個結構發出聲響的規模——這是象徵畫面，提醒失控的方向，不是命定結局。`,
    blindSpot: `最容易被合理化的盲點：把「還沒出事」當成「沒有事」。${pressurePoint}的耗損是複利式的，安靜不等於安全；但這個盲點看得見，就有得處理，單一星曜不會替你決定結果。`,
    decisionStyle: `壓力下的決策傾向：${mainStar}式的先斬後奏或先扛再說；證據就在本宮星曜配置——快，但容易把代價往後挪。`,
    relationshipWithEnvironment: `對外互動的摩擦點：${context.threeHarmony.opposite.palaceName}（${majorText(context.threeHarmony.opposite)}）的對照顯示，外界回應的節奏與你的預期存在落差，容易演變為單向消耗。`,
    practicalDirection: `易經為此宮起卦得「${castPalaceHexagram(context).hexagramName}」，${castPalaceHexagram(context).advice}止損動作只有一個：本週為「${guide.topic}」設一條明確界線（一句話能說完的那種），並向一位相關的人說出口。行有餘力，把省下的力氣拿去幫一個真正需要的人。`,
  };
  return { teacherId: 'LIFE_MASTER', ...normalizeLifeResult(raw), evidenceRefs: buildEvidenceRefs(context) };
}

function buildLocalNarrativeResult(context: PalaceAnalysisContext): NarrativeTeacherResult {
  const p = context.selectedPalace;
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];
  const img = momentImagery(context.timeContext.sceneMoment);
  const props = guide.narrativeSet.split('、');
  const mainStar = p.majorStars[0]?.name ?? context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮主星';
  const harmonyStar = context.threeHarmony.harmonyA.majorStars[0]?.name ?? context.threeHarmony.harmonyB.majorStars[0]?.name ?? '三合星曜';
  const oppositeStar = context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮';
  const trans = p.transformations[0];

  const symbols = [
    { symbol: props[0] ?? '半掩的門', meaning: `${guide.topic}裡尚未面對的那一項`, sourceRef: `主星:${mainStar}` },
    { symbol: props[1] ?? '停住的時鐘', meaning: '被遞延的決定在原地累積重量', sourceRef: trans ? `四化:${trans.starName}化${TRANS_LABEL[trans.type]}` : `宮位:${p.palaceName}` },
    { symbol: props[2] ?? '走廊盡頭的燈', meaning: '三方支撐仍亮著，但需要有人走過去', sourceRef: `三合:${harmonyStar}` },
    { symbol: props[3] ?? '玻璃上的倒影', meaning: '對面照回來的，是你遲遲沒有回應的部分', sourceRef: `對宮:${oppositeStar}` },
  ];

  const raw: Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'> = {
    visualTitle: `${p.palaceName}．${props[0] ?? '未拆的信'}`,
    scene: `這一幕談的是${guide.topic}。${img.light}，${img.sound}；${props[0] ?? '桌上的物件'}就放在那裡，暗紅的反光在邊緣停了一瞬——沒有人碰它，它卻像被翻動過。`,
    mainCharacter: `畫面中央是這個人。這個人伸手又收回，做了一個沒有說破的動作：把${props[1] ?? '那件事'}往旁邊挪了一格，假裝它不存在。`,
    symbols,
    story: `${mainStar}的光落在${props[0] ?? '門口'}，一切看起來如常。直到${props[2] ?? '走廊盡頭'}傳來一下不該有的聲響——這個人回頭，發現${props[1] ?? '時鐘'}不知何時已經停了。就在此刻，整個空間的燈忽然一暗，像要把${guide.topic}裡拖延的一切一次收走；黑下來的不是房間，是選項。${harmonyStar}在遠處仍亮著一盞燈，提示這條線還有支撐——但得有人先動。`,
    pastEcho: `舊畫面的殘影：同樣的${props[0] ?? '物件'}、同樣被放回原位的手。這是命盤慣性的映照，不是真實往事，更不是判決；畫面怎麼走，還要看整張盤與你接下來的選擇。`,
    futureShadow: `${context.timeContext.annualYear} 年的光線斜過來時，若這個人仍把${props[1] ?? '該面對的事'}往旁邊挪，影子會比現在長一倍；若伸手拆開它，畫面就換場。這是條件式的暗影，不是預言。`,
    finalMetaphor: `牆上有人用舊墨寫過一卦：「${castPalaceHexagram(context).hexagramName}」。午夜的低語只說一句：燈一直都在，門也沒有鎖——誠實地伸手，比任何咒語都靈。`,
  };
  return { teacherId: 'NARRATIVE_MASTER', ...normalizeNarrativeResult(raw), evidenceRefs: buildEvidenceRefs(context) };
}

/* ---------------- 共用：可回查的證據來源（規格「二十一」的可追溯性要求） ---------------- */

function buildEvidenceRefs(context: PalaceAnalysisContext): string[] {
  // 這些依據會原樣顯示給客戶：用全形冒號與一般說法，不用「三合宮A」這種內部代號。
  const refs = [`宮位：${context.selectedPalace.palaceName}`, `易經：${castPalaceHexagram(context).hexagramName}第${castPalaceHexagram(context).changingLine}爻`];
  if (context.timeContext.currentAge !== null) refs.push(`目前年齡：${context.timeContext.currentAge}歲`);
  refs.push(`流年：${context.timeContext.annualYear}`);
  if (context.timeContext.annualTheme) refs.push(`流年主題：${context.timeContext.annualTheme}`);
  context.selectedPalace.majorStars.forEach((s) => refs.push(`主星：${s.name}`));
  context.selectedPalace.transformations.forEach((t) => refs.push(`四化：${t.starName}化${TRANS_LABEL[t.type]}`));
  refs.push(`三合宮位：${context.threeHarmony.harmonyA.palaceName}`, `三合宮位：${context.threeHarmony.harmonyB.palaceName}`, `對宮：${context.threeHarmony.opposite.palaceName}`);
  return refs;
}

export function runTeacher(teacherId: TeacherId, context: PalaceAnalysisContext) {
  if (teacherId === 'STRUCTURE_MASTER') return runStructureTeacher(context);
  if (teacherId === 'LIFE_MASTER') return runLifeTeacher(context);
  return runNarrativeTeacher(context);
}
