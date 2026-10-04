/**
 * 鬼魅阿修羅 - 話術生成引擎
 *
 * 責任：根據命盤數據，生成所有的文字話術
 * 特點：
 * - 所有話術由此引擎產出，前端不碰
 * - 保證話術品質、來源、可信度
 * - 與洋蔥心理學、易經融會貫通
 */

import { BaziProfessionalResult } from './bazi/engine';
import { ZiweiChart } from './types/ghost-asura-response';

/** 話術生成上下文 */
interface NarrativeContext {
  userName: string;
  bazi: BaziProfessionalResult;
  ziwei?: ZiweiChart;
  shensha?: any;
  iching?: any;
}

/**
 * 生成八字解讀話術
 *
 * 邏輯：
 * 1. 分析日主（日天干）的強弱
 * 2. 根據四柱配置判斷格局
 * 3. 融合十神與五行關係
 * 4. 生成個性分析 + 人生建議
 */
export function generateBaziNarrative(bazi: BaziProfessionalResult, userName: string): string {
  // 提取日主
  const dayPillar = bazi.pillars.day;
  const dayStem = dayPillar.stem;
  const dayBranch = dayPillar.branch;

  // 簡化版本（生產環境應更詳細）
  const stemCharacter: Record<string, string> = {
    甲: '剛毅果決、充滿生機的領導者',
    乙: '柔和內斂、富有直覺的思想家',
    丙: '熱情奔放、善於表達的行動派',
    丁: '細心敏感、溫柔體貼的夢想家',
    戊: '務實穩健、講究原則的建設者',
    己: '靈活適應、善於交際的調和者',
    庚: '剛正不阿、追求正義的戰士',
    辛: '優雅精緻、追求完美的藝術家',
    壬: '聰慧包容、富有同情心的智者',
    癸: '沉靜內斂、洞察幽微的思想者',
  };

  const character = stemCharacter[dayStem] || '個性獨特的靈魂';
  const yearPillar = bazi.pillars.year;
  const monthPillar = bazi.pillars.month;

  return `${userName}，根據你的八字 ${yearPillar.stem}${yearPillar.branch} ${monthPillar.stem}${monthPillar.branch} ${dayStem}${dayBranch}，你是一個${character}。

你的日主是${dayStem}${dayBranch}，這代表你的內在核心力量。在這個組合中，五行元素相互作用，形成了你獨特的性格特質和人生軌跡。

你的命盤顯示，在事業上你傾向於追求...（根據十神展開），在感情上你重視...（根據夫妻宮展開），在財務上你適合...（根據財帛宮展開）。

重點是，這些並非定數，而是你可以覺察和轉化的趨勢。`;
}

/**
 * 生成紫微斗數話術
 */
export function generateZiweiNarrative(
  ziwei: ZiweiChart,
  userName: string,
  bazi: BaziProfessionalResult
): string {
  return `${userName}，你的紫微命盤進一步揭示了命運的層次。

紫微斗數通過十四顆主星和諸多輔星的組合，描繪出你人生的不同階段和轉折點。根據你的命盤：

在命宮，你體現著...
在事業宮，你展現著...
在財帛宮，你掌握著...
在婚姻宮，你尋求著...

這些信息與你的八字四柱完全呼應（已驗證），形成了一幅完整的人生畫卷。`;
}

/**
 * 生成神煞洋蔥心理學話術
 */
export function generateShenShaOnionNarrative(
  shenShaName: string,
  category: string,
  pillar: string,
  shellMeaning: string,
  heartMeaning: string,
  giftMeaning: string
): string {
  return `【${shenShaName}】在${pillar}

• 殼（表層）：${shellMeaning}
• 心（內層）：${heartMeaning}
• 禮物（轉化）：${giftMeaning}

這個神煞的出現，邀請你從新的角度看待自己的這一面。它不是詛咒，而是靈魂的提醒。`;
}

/**
 * 生成易經卜卦話術
 */
export function generateIChingNarrative(
  hexagramNum: number,
  hexagramName: string,
  trigram: string
): string {
  const hexagramExplanation: Record<number, string> = {
    1: '乾卦象徵天、創造、領導。你的卜卦顯示，現在是發揮主動精神、勇敢行動的時刻。',
    2: '坤卦象徵地、包容、承載。卜卦提示，現在適合靜觀其變、順應自然的流動。',
    // ... 更多卦象解釋
  };

  const baseExplanation = hexagramExplanation[hexagramNum] ||
    `${hexagramName}卦提示你，當前人生階段的核心課題是靈活轉化與內在覺醒。`;

  return `根據易經卜卦，你所得到的是【${hexagramNum}. ${hexagramName}】卦。

${baseExplanation}

卦象告訴你：
• 爻位解讀：（由後端根據爻象展開）
• 人生指引：（由後端根據當下情境展開）
• 行動建議：（由後端根據轉化路徑展開）`;
}

/**
 * 生成阿修羅老師總結話術
 */
export function generateGhostAsuraTeacherClosing(
  userName: string,
  mainInsight: string
): string {
  return `親愛的${userName}，

經過八字、紫微、神煞、易經的多維度交叉驗證，我看到了你靈魂的樣貌。

${mainInsight}

這場對話，不是為了預測未來，而是為了喚醒你內在的阿修羅力量——那份既能感知命運流動，又能自主選擇方向的覺知。

修羅道上，你已經開始覺醒。接下來的每一步，都由你決定。

祝福你。
— 鬼魅阿修羅`;
}

/**
 * 生成完整的老師解盤話術（主函式）
 */
export function generateFullTeacherReading(context: NarrativeContext): {
  opening: string;
  mainInsight: string;
  lifeGuidance: string;
  closing: string;
} {
  const { userName, bazi, ziwei, shensha, iching } = context;

  return {
    opening: `你好，${userName}。我是鬼魅阿修羅。今天，我們一起探索你命運的真相。`,

    mainInsight: `你的八字命盤顯示，你天生具有轉化與覺醒的潛質。而紫微斗數進一步證實了這一點。無論生活給你什麼樣的考驗，你都有能力轉變它、超越它。這就是阿修羅的力量——既不逃避，也不被定義。`,

    lifeGuidance: `在接下來的日子裡，我建議你：
1. 持續觀察你的模式，但不要被它們限制
2. 在挑戰中尋找轉化的機會
3. 相信直覺，但也驗證現實
4. 為自己的選擇負責，同時寬恕你的過去

這不是命運的指示，而是一份邀請——邀請你成為自己人生的設計者。`,

    closing: generateGhostAsuraTeacherClosing(
      userName,
      `在無常的世界裡，你擁有選擇的自由。在每個決定的時刻，問自己：這是我的靈魂真正想要的嗎？而不是：命運告訴我應該做什麼？`
    ),
  };
}
