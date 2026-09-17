/**
 * 靈魂配對：兩人各自的三核心（口令《易經》順序 ① 八字命盤 → ② 紫微斗數命盤 → ③ 易經卦象）
 * ============================================================================
 *
 * 2026-09-17 米其林升級：配對 API 早就為兩人各跑一次 runThreeInOne（八字→紫微→四柱逐字核對→易經），
 * 但畫面從來沒顯示，卡名叫「易經靈魂配對」卻看不到任何可回查的易經內容。
 * 這裡把三合一結果整理成客戶看得懂的三步，前端只照印。
 *
 * 界線：
 * - 卦是各自依自己的生辰（梅花易數生辰起卦）起的；雙人合卦沒有能查證出處的規則，不把兩個卦合成結論。
 * - 沒有時辰：紫微不排、這張卡不另起卦，理由原文照給，不用預設時辰充數。
 * - 查證狀態（sourceChecks）由呼叫端用來源閘門 coreCredibility() 重算後傳進來，這裡不手填。
 *
 * 輸入型別只描述用得到的欄位（跟 lib/three-in-one.ts 的結果結構相容），讓這支檔案可以單獨測試。
 */

export type MatchThreeCoreInput =
  | {
      status: 'PASSED';
      fourPillars: { bazi: { year: string; month: string; day: string; hour: string } };
      result: {
        ziwei: {
          analysis: {
            palaces: Array<{ name: string; branch: string; majorStars: string[]; majorStarDetails: Array<{ name: string; brightness?: string }> }>;
            pattern: { name: string };
          };
        };
        yijing: {
          patternName: string;
          reading: { hexagramName: string; kingWen: number; glyph: string; changingLine: number; essence: string; advice: string; seedText: string };
        };
      };
    }
  | {
      status: 'TIME_UNKNOWN';
      threePillars: { year: string; month: string; day: string };
      noHourMethod: { layers: Array<{ layer: string; reason: string; available: boolean }> };
    };

export type MatchThreeCoreStep = {
  order: 1 | 2 | 3;
  title: '八字命盤' | '紫微斗數命盤' | '易經卦象';
  value: string;
  detail: string;
  available: boolean;
};

export type MatchThreeCorePerson = {
  name: string;
  hourKnown: boolean;
  steps: MatchThreeCoreStep[];
  hexagram: null | {
    glyph: string;
    patternName: string;
    line: string;
    essence: string;
    advice: string;
    basis: string;
  };
  /** 摺疊時露出來的一句。 */
  teaser: string;
};

export type MatchThreeCoreView = {
  version: 'match_three_core_v1';
  orderNote: string;
  people: [MatchThreeCorePerson, MatchThreeCorePerson];
  pairNote: string;
  sourceChecks: string[];
};

/** 起卦依據說人話：「梅花易數|1990-05-20|時辰12」→ 生日與時辰數照列，數值不改，客戶可自己回查。 */
function basisOf(seedText: string) {
  const match = /^梅花易數\|(\d{4}-\d{2}-\d{2})\|時辰(\d+)$/.exec(seedText);
  return match
    ? `起卦依據：梅花易數生辰起卦，生日 ${match[1]}、時辰數 ${match[2]}。同一生辰永遠同一卦，可回查驗算。`
    : `起卦依據：${seedText}（同一輸入永遠同一卦，可回查驗算）。`;
}

function personView(name: string, input: MatchThreeCoreInput): MatchThreeCorePerson {
  if (input.status === 'PASSED') {
    const { bazi } = input.fourPillars;
    const ming = input.result.ziwei.analysis.palaces.find((palace) => palace.name === '命宮');
    const mingStars = ming?.majorStarDetails.length
      ? ming.majorStarDetails.map((star) => (star.brightness ? `${star.name}（${star.brightness}）` : star.name)).join('、')
      : '無十四主星';
    const { reading, patternName } = input.result.yijing;
    return {
      name,
      hourKnown: true,
      steps: [
        { order: 1, title: '八字命盤', value: `${bazi.year}・${bazi.month}・${bazi.day}・${bazi.hour}`, detail: '年、月、日、時四柱，和紫微命盤逐字核對一致。', available: true },
        { order: 2, title: '紫微斗數命盤', value: `命宮在${ming?.branch ?? '—'}・${mingStars}`, detail: `三方四正格局：${input.result.ziwei.analysis.pattern.name}。`, available: true },
        { order: 3, title: '易經卦象', value: patternName, detail: '四柱核對一致後，依生辰起卦；卦義與起卦依據在下方。', available: true },
      ],
      hexagram: {
        glyph: reading.glyph,
        patternName,
        line: `${reading.hexagramName}・第 ${reading.kingWen} 卦・動爻第 ${reading.changingLine} 爻`,
        essence: reading.essence,
        advice: reading.advice,
        basis: basisOf(reading.seedText),
      },
      teaser: `${name}：${patternName}`,
    };
  }

  const reasonOf = (layer: string) => input.noHourMethod.layers.find((item) => item.layer === layer)?.reason ?? '';
  const { year, month, day } = input.threePillars;
  return {
    name,
    hourKnown: false,
    steps: [
      { order: 1, title: '八字命盤', value: `${year}・${month}・${day}（時柱不推定）`, detail: '沒有出生時辰：年、月、日三柱照算，時柱留空，不拿預設時辰補。', available: true },
      { order: 2, title: '紫微斗數命盤', value: '這次不排盤', detail: reasonOf('紫微') || '命宮要用時辰定位，沒有時辰就不排。', available: false },
      { order: 3, title: '易經卦象', value: '這次不起卦', detail: '梅花易數生辰起卦的下卦與動爻都要用到時辰數；補上出生時辰，才會出現依生辰起的卦。', available: false },
    ],
    hexagram: null,
    teaser: `${name}：補上出生時辰才起卦`,
  };
}

export function buildMatchThreeCoreView(input: {
  nameA: string;
  nameB: string;
  personA: MatchThreeCoreInput;
  personB: MatchThreeCoreInput;
  sourceChecks: string[];
}): MatchThreeCoreView {
  return {
    version: 'match_three_core_v1',
    orderNote: '依《易經》口令的順序：① 八字命盤 → ② 紫微斗數命盤 → ③ 易經卦象。四柱逐字一致才往下起卦。',
    people: [personView(input.nameA, input.personA), personView(input.nameB, input.personB)],
    pairNote: '兩個卦是各自依自己的生辰起的。雙人合卦目前沒有能查證出處的起卦規則，所以不把兩個卦硬合成一個結論；卦是給自己看的一面鏡子，不是對這段關係的預測。',
    sourceChecks: input.sourceChecks,
  };
}
