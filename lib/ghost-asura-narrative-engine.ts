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
  const dayStem = dayPillar.heavenlyStem;
  const dayBranch = dayPillar.earthlyBranch;

  // 簡化版本（生產環境應更詳細）
  const stemCharacter: Record<string, { title: string; warStyle: string; battleCommand: string }> = {
    甲: {
      title: '參天戰矛・鑿陣先鋒',
      warStyle: '剛硬挺拔、正面硬碰硬，骨子裡沒有退縮兩個字。',
      battleCommand: '猶豫不是你的武器，大刀闊斧撕開缺口，誰擋你陣線就正面碾過去。',
    },
    乙: {
      title: '嗜血藤蔓・絕地絞殺',
      warStyle: '外柔內韌、順勢借力，最擅長在看似無路之處破石生根。',
      battleCommand: '別去學剛猛魯莽的硬撞，順水推舟、暗中纏繞對手要害，一擊奪生。',
    },
    丙: {
      title: '天劫烈陽・焚天破陣',
      warStyle: '聲勢滔天、雷霆萬鈞，一出招便要照亮整個戰場。',
      battleCommand: '別憋在陰暗處自我懷疑，既然生來就是烈火，就正面拉開陣勢席捲全場。',
    },
    丁: {
      title: '九幽冥火・索命暗芒',
      warStyle: '沉靜內斂、專注幽微，在極暗之中尋覓致勝破綻。',
      battleCommand: '不需要虛張聲勢，把精力收束於一點，出招便直抵命脈，不給生路。',
    },
    戊: {
      title: '萬仞重塞・不動如山',
      warStyle: '雄沉厚重、防線如鐵，能抗下天地間一切重壓衝擊。',
      battleCommand: '守住你的底線原則，任憑狂風暴雨撞上來也是粉身碎骨，戰場主動由你耗定。',
    },
    己: {
      title: '流沙陷陣・納勢吞敵',
      warStyle: '包容萬有、深藏不露，最擅長將敵人的狂猛化為無形泥淖。',
      battleCommand: '不露聲色即是威懾，暗中收緊包圍網，讓對手自取滅亡。',
    },
    庚: {
      title: '百鍊陌刀・肅殺破軍',
      warStyle: '鐵血果決、鋒芒畢露，天生就是撕裂軟弱與混亂的兵刃。',
      battleCommand: '戰場容不下猶豫拖沓，快刀斬亂麻，該斷的恩怨一刀平定。',
    },
    辛: {
      title: '淬毒玄匕・一瞬決殺',
      warStyle: '極致純粹、精準致命，在毫釐之間分生定死。',
      battleCommand: '別和蠢人糾纏混戰，盯準關鍵核心要害，揮刀即定乾坤。',
    },
    壬: {
      title: '倒海狂瀾・吞天怒潮',
      warStyle: '大開大闔、奔騰席捲，凡有阻擋皆以巨力正面沖垮。',
      battleCommand: '格局放大、氣魄拉滿，凡是想築壩攔你前行之人，直接起潮淹沒。',
    },
    癸: {
      title: '玄冥寒煞・無孔不入',
      warStyle: '至陰至靈、滲透萬物，於無聲無息處反客為主。',
      battleCommand: '藏鋒於無形，在別人尚未警覺之時，戰局已盡歸你掌控。',
    },
  };

  const warrior = stemCharacter[dayStem] || {
    title: '修羅戰骨・獨尊之相',
    warStyle: '殺伐果斷、自立陣地。',
    battleCommand: '戰場由你定義，出手就要拿下戰局。',
  };
  const yearPillar = bazi.pillars.year;
  const monthPillar = bazi.pillars.month;

  return `${userName}，審視你的四柱：${yearPillar.heavenlyStem}${yearPillar.earthlyBranch}（千歲壽）、${monthPillar.heavenlyStem}${monthPillar.earthlyBranch}（障月）、${dayStem}${dayBranch}（障日）。
你的本命戰魄為【${warrior.title}】。

戰風實質：
${warrior.warStyle}

戰場直斷：
你生來帶著這身煞氣與底氣，不是為了在平庸裡妥協，而是要在對抗與衝突中打下自己的疆域。
${warrior.battleCommand}

鬼魅阿修羅直言：
業鏡照出的是戰場，不是溫室。這盤棋由你掌刀，想贏，就提刀上陣，直面殘局！`;
}

/**
 * 生成紫微斗數話術
 */
export function generateZiweiNarrative(
  ziwei: ZiweiChart,
  userName: string,
  bazi: BaziProfessionalResult
): string {
  return `${userName}，紫微業鏡已開，十四主星重列陣位。

戰場陣地剖析：
• 命宮為帥旗：展現你統御全局的氣場與決斷力。
• 事業宮為先鋒陣：鋒芒所指，便是攻城拔寨的戰略目標。
• 財帛宮為補給要塞：掠奪資源、穩固後盾，以雄厚資本支撐征途。
• 婚姻宮為協作同袍：尋找敢一同背水一戰的戰友，而非拖累戰局的軟弱附庸。

星曜交錯，戰機稍縱即逝。勝負權柄，全在你拔刀的剎那！`;
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
  return `【${shenShaName}】鎮落於${pillar}

• 陣甲（外在交鋒）：${shellMeaning}
• 戰心（核心意志）：${heartMeaning}
• 破局鋒芒（轉化之刃）：${giftMeaning}

鬼魅阿修羅直言：煞氣不除，反為我用。把阻礙碾碎，就是你的戰功！`;
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
    1: '乾卦剛健中正，天行健，戰士當自強不息。正面強攻，無所畏懼。',
    2: '坤卦厚德載物，沉穩蓄勢，以極限韌性包容萬敵，反制其鋒。',
  };

  const baseExplanation = hexagramExplanation[hexagramNum] ||
    `${hexagramName}卦現，風雲突變。當前戰局之核心，在於臨機應變、破舊立新。`;

  return `易經神之卷起象：第【${hexagramNum}. ${hexagramName}】卦。

${baseExplanation}

戰略裁定：
• 戰機方位：（依象審視形勢）
• 破防之策：（伺機尋找突破缺口）
• 決勝號令：（調動全部戰意精準出擊）`;
}

/**
 * 生成阿修羅老師總結話術
 */
export function generateGhostAsuraTeacherClosing(
  userName: string,
  mainInsight: string
): string {
  return `${userName}：

四柱與業鏡已審閱完畢。

${mainInsight}

鬼魅阿修羅直斷：
戰場不信眼淚，業鏡只認勝負。心不死，道不生。
帶著你的武器，把眼前的路打通！

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
    opening: `我乃鬼魅阿修羅。${userName}，敢在我面前亮出此盤，就站直了聽真話！`,

    mainInsight: `你的命盤滿佈鋒芒與機變，生來就不是守成的順民。無論世道給你設下多少暗障與圍剿，你骨子裡的戰意就是用來打破死局的。逆天破陣，方顯修羅本色！`,

    lifeGuidance: `戰場鐵律：
1. 拔刀休問前程，瞄準要害一擊破局
2. 把所有的質疑與圍剿，化作你磨刀的礫石
3. 相信手中之力，用實際戰果讓對手閉嘴
4. 守好核心陣線，寸步不讓

命盤是你的沙盤，不是枷鎖。這場仗怎麼打，由你說了算！`,

    closing: generateGhostAsuraTeacherClosing(
      userName,
      `天地之間，強者開道。不要等待救贖，你手裡的刃，就是你的通關令！`
    ),
  };
}
