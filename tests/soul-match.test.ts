/**
 * 易經靈魂配對・米其林審查守門（2026-09-17）
 *
 * 首審 1.0 分的三個硬傷，這支測試一項一項鎖住：
 * 1. 同一屏兩種答案：星軌圖曾在前端另寫一套生剋循環（畫出「空剋水」「水生火」），跟後端「水剋火＝相剋」打架。
 *    → 生剋圈、共同元素上下游、補強排序只能由 lib/match-five-element-engine.ts 算，且必須等於共用五行表。
 * 2. 沒有起卦卻寫「易經卜卦判定」；分數是固定規則卻寫「這段關係會越走越順」。
 *    → 後端每一句輸出都不得越過證據（MATCH_OVERCLAIM_PATTERN）。
 * 3. 前端自己編結論：格局名、鬼魅四幕、最弱指標。
 *    → 劇情由 lib/match-story-engine.ts 組句，頁面只照印；頁面不得再出現那些函式與寫死的生剋圈。
 *
 * 2026-09-21 複審追加：
 * 4. 五神自相矛盾：八字引擎把喜神取成「數量最少的五行」，身弱時剛好剋用神，同一個五行同時是喜神與仇神
 *    （1990-05-20 亥時：喜神土、仇神土）。配對頁又在分數同為 100 時照元素固定順序挑「最需要補」，
 *    把陳大明的仇神「火」排到用神「金」前面——同一個人，八字頁說補金、配對頁說補火。
 *    → 五神依《滴天髓闡微》定義（喜神輔用、忌神損用），五個必定不同；配對頁「最需要補」＝八字頁的用神。
 * 5. 同一頁互相否定：「互補優勢：整體特質相近」對上「兩個底色不同的人」；「需要磨合：沒有磨合點」對上「注意衝突」。
 * 6. 紅鸞證據句是術語（「流年支午命中日支酉三合局沐浴位」），客戶看不懂。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTROLS, FIVE_ELEMENT_CODE_MAP, GENERATES, type FiveElementKey } from '../lib/five-element-engine';
import { buildMatchFiveElementResult, type MatchFiveElementKey, type MatchFiveElementResult } from '../lib/match-five-element-engine';
import { buildMatchStory, type MatchStoryScores } from '../lib/match-story-engine';
import { buildStableSummary, hasMatchOverclaim, isConsistentAiSummary } from '../lib/match-stability';
import { buildMatchThreeCoreView, type MatchThreeCoreInput } from '../lib/match-three-core-view';
import { analyzeBazi } from '../lib/bazi-engine';
import { computeCompatibility, type PersonalityMatrixCompat } from '../lib/compatibility-engine';
import { buildBaziLovePersonSignal } from '../lib/red-luan-heartbeat-engine';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
};

const ELEMENTS: MatchFiveElementKey[] = ['space', 'air', 'water', 'fire', 'earth'];
const BRAND: Record<MatchFiveElementKey, string> = { space: 'SPACE', air: 'AIR', water: 'WATER', fire: 'FIRE', earth: 'EARTH' };
const traditionalOf = (key: MatchFiveElementKey) =>
  (Object.entries(FIVE_ELEMENT_CODE_MAP).find(([, info]) => info.brandElement === BRAND[key]) as [FiveElementKey, unknown])[0];

/** 讓指定元素最高、其餘依序遞減的需求分數。 */
function needsWithPrimary(primary: MatchFiveElementKey, offset: number): Record<MatchFiveElementKey, number> {
  const scores = {} as Record<MatchFiveElementKey, number>;
  ELEMENTS.forEach((element, index) => {
    scores[element] = element === primary ? 92 : 40 + ((index + offset) % 5) * 9;
  });
  return scores;
}

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => allStrings(item, out));
  return out;
}

const KEY_LIKE = new Set([...ELEMENTS, 'generating', 'conflicting', 'balancing', 'match_five_element_v2', 'match_story_v1', 'violet', 'rose', 'fuchsia', 'amber', 'cyan', 'slate']);
function assertCustomerCopy(label: string, value: unknown) {
  for (const text of allStrings(value)) {
    if (KEY_LIKE.has(text)) continue;
    assert.ok(!hasMatchOverclaim(text), `${label} 越過證據：${text}`);
    assert.ok(!text.includes('元素元素'), `${label} 出現「元素元素」：${text}`);
    assert.ok(!/undefined|NaN|\[object/.test(text), `${label} 有未填值：${text}`);
    assert.ok(!/[A-Za-z_]{4,}/.test(text), `${label} 有英文代碼：${text}`);
  }
}

const combos: Array<{ a: MatchFiveElementKey; b: MatchFiveElementKey; result: MatchFiveElementResult }> = [];
for (const a of ELEMENTS) {
  for (const b of ELEMENTS) {
    combos.push({ a, b, result: buildMatchFiveElementResult({ name: '林佩君', needScores: needsWithPrimary(a, 1) }, { name: '陳大明', needScores: needsWithPrimary(b, 3) }) });
  }
}

check('生剋圈完全等於共用五行表（不得另寫一套）', () => {
  const { orbit } = combos[0].result;
  for (const [cycle, table, name] of [[orbit.generatingCycle, GENERATES, '相生'], [orbit.controllingCycle, CONTROLS, '相剋']] as const) {
    assert.equal(cycle.length, 6, `${name}圈要首尾相同共 6 個`);
    assert.equal(cycle[0], cycle[5]);
    assert.deepEqual([...new Set(cycle.slice(0, 5))].sort(), [...ELEMENTS].sort(), `${name}圈要走過五個元素`);
    for (let index = 0; index < 5; index += 1) {
      assert.equal(table[traditionalOf(cycle[index])], traditionalOf(cycle[index + 1]), `${name}圈第 ${index + 1} 段不符合共用五行表`);
    }
  }
  // 審查當天畫錯的兩條：空（金）生水、水剋火
  assert.equal(GENERATES[traditionalOf('space')], traditionalOf('water'));
  assert.equal(CONTROLS[traditionalOf('water')], traditionalOf('fire'));
});

check('25 種組合：關係、上下游、排序三方一致', () => {
  for (const { a, b, result } of combos) {
    const ta = traditionalOf(a);
    const tb = traditionalOf(b);
    const expected = a === b ? 'balancing' : GENERATES[ta] === tb || GENERATES[tb] === ta ? 'generating' : 'conflicting';
    assert.equal(result.relationMode, expected, `${a}/${b} 關係模式`);
    assert.equal(result.relationPair.includes('剋'), expected === 'conflicting', `${a}/${b} relationPair：${result.relationPair}`);
    assert.equal(result.relationPair.includes('生'), expected === 'generating', `${a}/${b} relationPair：${result.relationPair}`);
    const shared = traditionalOf(result.sharedElement);
    assert.equal(GENERATES[traditionalOf(result.orbit.shared.generatedBy)], shared);
    assert.equal(GENERATES[shared], traditionalOf(result.orbit.shared.generates));
    assert.equal(CONTROLS[traditionalOf(result.orbit.shared.controlledBy)], shared);
    assert.equal(CONTROLS[shared], traditionalOf(result.orbit.shared.controls));
    const ranking = result.orbit.ranking;
    assert.equal(ranking.length, 5);
    for (let index = 1; index < 5; index += 1) assert.ok(ranking[index - 1].averageNeed >= ranking[index].averageNeed, `${a}/${b} 排序沒有由高到低`);
    const sharedAverage = ranking.find((item) => item.element === result.sharedElement)!.averageNeed;
    if (sharedAverage === ranking[0].averageNeed) assert.equal(ranking[0].element, result.sharedElement, `${a}/${b} 同分時共同先補要排第一`);
    assert.ok(result.sharedReason.length > 0);
  }
});

check('五元素輸出不說卦、不保證、沒有重複字與英文代碼', () => {
  for (const { a, b, result } of combos) {
    const { needScores: _a, elementScores: _ea, ...personA } = result.personA;
    const { needScores: _b, elementScores: _eb, ...personB } = result.personB;
    assertCustomerCopy(`${a}/${b}`, { ...result, personA, personB, orbit: { ...result.orbit, ranking: [] } });
  }
});

const SCORE_GRID: MatchStoryScores[] = [];
for (const resonance of [40, 62, 90]) {
  for (const communication of [50, 70, 95]) {
    for (const conflict of [10, 58, 80]) {
      SCORE_GRID.push({
        match_score: Math.round((resonance + communication) / 2), resonance, communication, stability: 70, conflict_risk: conflict,
        zones: { resonance: ['情感表達的節奏相近，比較容易有共鳴'], complement: ['理性與感性互補，決策時能平衡對方盲點'], grinding: ['這組規則沒有找到明顯的磨合點；日常仍要把話說清楚'], conflict: ['雙方主導欲都強，決策時易出現「誰說了算」的對峙'] },
      });
    }
  }
}

check('劇情由後端組句：每種分數×每種補強關係都乾淨、同一份資料同一份劇情', () => {
  for (const scores of SCORE_GRID) {
    for (const { result } of combos) {
      const input = { nameA: '林佩君', nameB: '陳大明', result: scores, fiveElementMatch: result, sceneKey: '庚午辛巳己亥戊辰壬戌', hasBaziFoundation: true };
      const story = buildMatchStory(input);
      assertCustomerCopy('story', story);
      assert.deepEqual(buildMatchStory(input), story, '同一份資料要得到同一份劇情');
      assert.equal(story.mystery.acts.length, 4);
      assert.ok(story.closingAction.copy.length > 0, '結尾要有可以做的一件事');
      assert.ok(story.mystery.opening.includes('虛構'), '遊戲劇情要標明虛構');
    }
  }
});

check('分數摘要不越過證據；AI 摘要說卦或保證會被退回', () => {
  for (const match_score of [50, 65, 75, 90]) {
    for (const conflict_risk of [10, 50, 75]) {
      for (const communication of [50, 80]) {
        const summary = buildStableSummary({ match_score, resonance: 80, communication, stability: 55, conflict_risk });
        assert.ok(!hasMatchOverclaim(summary), `摘要越過證據：${summary}`);
      }
    }
  }
  const scores = { match_score: 90, resonance: 90, communication: 90, stability: 90, conflict_risk: 10, summary: '', zones: { resonance: [], complement: [], grinding: [], conflict: [] } };
  assert.equal(isConsistentAiSummary('易經卜卦判定：你們注定在一起。', scores as never), false);
  assert.equal(isConsistentAiSummary('兩人節奏相近，記得把在意的事說清楚。', scores as never), true);
  // AI 拿不到兩人的卦，它寫出的任何卦都是自己編的
  assert.equal(isConsistentAiSummary('這一卦顯示你們的緣分很深，記得多溝通。', scores as never), false);
});

check('兩人各自的三核心：① 八字 → ② 紫微 → ③ 易經；沒有時辰不排紫微、不起卦', () => {
  const passed: MatchThreeCoreInput = {
    status: 'PASSED',
    fourPillars: { bazi: { year: '庚午', month: '辛巳', day: '乙酉', hour: '丁亥' } },
    result: {
      ziwei: { analysis: { palaces: [{ name: '命宮', branch: '午', majorStars: ['太陽'], majorStarDetails: [{ name: '太陽', brightness: '旺' }] }], pattern: { name: '命財官遷綜合格局' } } },
      yijing: { patternName: '山鎮抱火格', reading: { hexagramName: '山火賁', kingWen: 22, glyph: '䷕', changingLine: 5, essence: '山下有火，文飾之美，質勝於文', advice: '包裝可以，但內容要真', seedText: '梅花易數|1990-05-20|時辰12' } },
    },
  };
  const unknown: MatchThreeCoreInput = {
    status: 'TIME_UNKNOWN',
    threePillars: { year: '戊辰', month: '壬戌', day: '壬戌' },
    noHourMethod: { layers: [{ layer: '紫微', reason: '命宮由月支與時支共同定位，缺時支就定不了命宮。', available: false }] },
  };
  // 這兩句是來源閘門 coreCredibility() 的實際輸出格式；後者是免責定位，不是冒充卜卦判定
  const checks = ['起卦法（梅花易數生辰／報數起卦）與先天卦數對照：各家來源說法不一，僅作傳統參考', '易經卜卦的心理學定位（自我反思的文化工具，不是已驗證的診斷或預測）：仍在查證中，僅作自我反思參考'];
  const view = buildMatchThreeCoreView({ nameA: '林佩君', nameB: '陳大明', personA: passed, personB: unknown, sourceChecks: checks });
  assertCustomerCopy('threeCore', { ...view, version: 'match_five_element_v2' });
  for (const person of view.people) assert.deepEqual(person.steps.map((step) => step.title), ['八字命盤', '紫微斗數命盤', '易經卦象'], '三核心順序不可顛倒');
  const [a, b] = view.people;
  assert.ok(a.hexagram && a.hexagram.basis.includes('生日 1990-05-20、時辰數 12'), `有時辰：卦要附可回查的起卦依據（${a.hexagram?.basis}）`);
  assert.ok(!a.hexagram!.basis.includes('|'), '起卦依據不顯示內部分隔符號');
  assert.equal(a.steps[2].value, '山鎮抱火格');
  assert.equal(b.hexagram, null, '沒有時辰：這張卡不起卦');
  assert.deepEqual(b.steps.map((step) => step.available), [true, false, false], '沒有時辰：八字三柱照算，紫微與易經標未開放');
  assert.ok(b.steps[0].value.includes('時柱不推定'));
  assert.deepEqual(view.sourceChecks, checks, '查證狀態照來源閘門傳入，不在這裡改寫');
  assert.ok(view.pairNote.includes('不把兩個卦硬合成一個結論'));
  assert.ok(view.pairNote.startsWith('這次只有林佩君起了卦'), `只有一人起卦時照實說（${view.pairNote}）`);
  const none = buildMatchThreeCoreView({ nameA: '林佩君', nameB: '陳大明', personA: unknown, personB: unknown, sourceChecks: checks });
  assert.ok(none.pairNote.startsWith('兩人這次都沒有起卦') && !none.pairNote.includes('兩個卦是各自'), `兩人都沒時辰時不得說「兩個卦是各自依生辰起的」（${none.pairNote}）`);
  const knowledge = fs.readFileSync('data/iching-hexagrams.json', 'utf8');
  assert.ok(!hasMatchOverclaim(knowledge), '卦義知識庫會原文顯示，不得有保證、注定之類的字');
});

const page = fs.readFileSync('app/match/page.tsx', 'utf8');
const route = fs.readFileSync('app/api/match-generate/route.ts', 'utf8');

check('配對頁只照印：沒有寫死的生剋圈、沒有前端劇情、沒有英文與術語', () => {
  const banned = [
    'GENERATING_CHAIN', 'CONFLICT_CHAIN', 'buildMysteryMatchGame', 'buildMatchGuidance', 'pickStable', 'stableHash',
    '易經卜卦', '易經必補', 'I-CHING', 'PAIRING INPUT', 'ruleVersion}', '宿命', '元素元素', '{elementLabel}元素', 'primaryElement]}元素', '{person.bloodType} 型</span>', 'displayA.bloodType} 型', 'displayB.bloodType} 型',
    'Google 解盤暫時未回覆', '血型蘊含', '天命坐標', '天盤骨架', 'enforceAiCopywritingTone', '關係變順', '事情就順',
    'text-[9px]', 'text-[10px]', 'text-[11px]',
  ];
  for (const word of banned) assert.ok(!page.includes(word), `app/match/page.tsx 仍有「${word}」`);
  for (const field of ['orbit.generatingCycle', 'orbit.controllingCycle', 'orbit.ranking', 'data.story', 'data.scoreBasis', 'closingAction', 'bloodTypeLabel', 'id="match-result-anchor"', '<MatchThreeCorePanel view={data.threeCore} />']) {
    assert.ok(page.includes(field), `app/match/page.tsx 要照印後端欄位 ${field}`);
  }
  assert.ok(page.includes('aria-label="一眼看懂"') || page.includes("aria-label={resultUi.t('一眼看懂')}"), '一眼看懂區塊需保留可存取名稱');
});

check('配對 API：劇情與分數依據由後端送出；AI 提示詞不逼它說卦', () => {
  for (const field of ['buildMatchStory(', 'scoreBasis:', 'hasAiRewriteOverclaim', 'bloodTypeLabel', 'buildMatchThreeCoreView(', "coreCredibility('易經')", "coreCredibility('八字')", "coreCredibility('紫微斗數')"]) assert.ok(route.includes(field), `route 缺 ${field}`);
  for (const word of ['buildAiCopywritingInstruction', 'enforceAiCopywritingTone', '字字點中要害', '高冷犀利']) assert.ok(!route.includes(word), `route 仍有「${word}」`);
  // 解盤老師的規則版段落不得重複分數卡上的同一句摘要
  assert.ok(route.includes('aiInterpretationLayer.emotionalPattern') && route.includes('teacherFromGoogle ? finalSummary'), '老師規則版段落要改用專業層說明');
  const templates = fs.readFileSync('lib/compatibility-engine.ts', 'utf8');
  for (const word of ['靈魂容易共鳴', '依附需求相近，關係安全感強', '矩陣分析']) assert.ok(!templates.includes(word), `compatibility-engine 仍有「${word}」`);
});

const TRAD_GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const TRAD_CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const chartOf = (birthDate: string, hour: string) => analyzeBazi({ name: '測試', birthDate, birthTime: '12:00', birthTimeKnown: true, timeUnknown: false, traditionalHour: hour, gender: 'female', country: 'TW', city: 'Taipei' });

check('五神：五個五行各不相同，喜神不剋用神；身弱用印喜比劫、身旺不取印比（《滴天髓闡微》喜神輔用、忌神損用）', () => {
  const hours = ['子', '卯', '午', '酉', '亥'];
  let charts = 0;
  const seenVerdicts = new Set<string>();
  for (let day = 0; day < 365 * 60; day += 173) {
    const date = new Date(Date.UTC(1950, 0, 1) + day * 86400000).toISOString().slice(0, 10);
    const chart = chartOf(date, hours[day % hours.length]).professionalChart;
    const { usefulGod, joyGod, avoidGod, enemyGod, neutralGod } = chart.gods;
    const dayElement = chart.dayMaster.element;
    const label = `${date}（${chart.strengthAnalysis.verdict}）`;
    seenVerdicts.add(chart.strengthAnalysis.verdict);
    assert.equal(new Set([usefulGod, joyGod, avoidGod, enemyGod, neutralGod]).size, 5, `${label} 五神有重複：${JSON.stringify(chart.gods)}`);
    assert.notEqual(TRAD_CONTROLS[joyGod], usefulGod, `${label} 喜神${joyGod}剋用神${usefulGod}`);
    assert.ok(chart.gods.reason.includes(`喜神為${joyGod}`) && chart.gods.reason.includes(`仇神為${enemyGod}`), `${label} 說明句要跟欄位一致`);
    const seal = Object.keys(TRAD_GENERATES).find((element) => TRAD_GENERATES[element] === dayElement);
    if (chart.strengthAnalysis.verdict === '偏弱') {
      assert.equal(usefulGod, seal, `${label} 身弱要用印`);
      assert.equal(joyGod, dayElement, `${label} 身弱喜比劫`);
    }
    if (chart.strengthAnalysis.verdict === '偏旺') {
      assert.ok(![seal, dayElement].includes(usefulGod) && ![seal, dayElement].includes(joyGod), `${label} 身旺不得用印比`);
      assert.ok([seal, dayElement].includes(avoidGod), `${label} 身旺忌印比`);
    }
    // 補強分數跟補強先後同向；忌神、仇神不是補強對象（上限 40），不得排到用神、喜神前面
    const priority = chartOf(date, hours[day % hours.length]).aiDeepAnalysis.elementPriority;
    assert.deepEqual(priority.slice(0, 3).map((item) => item.element), [usefulGod, joyGod, neutralGod], `${label} 補強先後要是用神、喜神、閒神`);
    for (let i = 1; i < priority.length; i += 1) assert.ok(priority[i].needScore <= priority[i - 1].needScore, `${label} 補強分數不得後高於前：${priority.map((item) => item.element + item.needScore).join(' ')}`);
    for (const item of priority) if (item.element === avoidGod || item.element === enemyGod) assert.ok(item.needScore <= 40, `${label} 忌神／仇神${item.element}補強分數 ${item.needScore} 超過 40`);
    charts += 1;
  }
  assert.ok(charts > 100 && seenVerdicts.size >= 2, `掃描的命盤要夠多、旺衰要不只一種（${charts} 張、${[...seenVerdicts].join('／')}）`);
  // 複審實例：兩人原本都是「喜神＝仇神」
  const lin = chartOf('1990-05-20', '亥').professionalChart.gods;
  assert.deepEqual([lin.usefulGod, lin.joyGod, lin.avoidGod, lin.enemyGod, lin.neutralGod], ['水', '木', '金', '土', '火']);
  const chen = chartOf('1988-11-03', '辰').professionalChart.gods;
  assert.deepEqual([chen.usefulGod, chen.joyGod, chen.avoidGod, chen.enemyGod, chen.neutralGod], ['金', '水', '土', '火', '木']);
});

check('配對頁「最需要補」＝八字頁的用神、「其次」＝喜神；同分不再照元素固定順序亂挑', () => {
  const toMatch: Record<string, MatchFiveElementKey> = { SPACE: 'space', AIR: 'air', WATER: 'water', FIRE: 'fire', EARTH: 'earth' };
  const inputOf = (name: string, date: string, hour: string) => {
    const priority = chartOf(date, hour).aiDeepAnalysis.elementPriority;
    const needScores = {} as Record<MatchFiveElementKey, number>;
    for (const item of priority) needScores[toMatch[item.brandElement]] = item.needScore;
    return { name, needScores, priority: priority.map((item) => toMatch[item.brandElement]) };
  };
  const lin = inputOf('林佩君', '1990-05-20', '亥');
  const chen = inputOf('陳大明', '1988-11-03', '辰');
  assert.equal(chen.needScores.space, chen.needScores.water, '實例前提：陳大明的金（用神）、水（喜神）需求同為 100——照元素固定順序會先挑到水');
  const result = buildMatchFiveElementResult(lin, chen);
  assert.deepEqual([result.personA.primaryElement, result.personA.secondaryElement], ['water', 'air'], '林佩君：用神水、喜神木');
  assert.deepEqual([result.personB.primaryElement, result.personB.secondaryElement], ['space', 'water'], '陳大明：用神金、喜神水（不是仇神火）');
  assert.equal(result.sharedElement, 'water', '水是林佩君的用神、陳大明的喜神；金是林佩君的忌神，不能當共同先補');
  const reason = result.orbit.ranking.length ? JSON.stringify(result) : '';
  assert.ok(!reason.includes('需求分數較高'), '兩人分數一樣時不得說「需求分數較高」');
  // 沒給順序（舊呼叫端）仍照分數排
  const fallback = buildMatchFiveElementResult({ name: '甲', needScores: needsWithPrimary('fire', 1) }, { name: '乙', needScores: needsWithPrimary('fire', 2) });
  assert.equal(fallback.personA.primaryElement, 'fire');
  assert.ok(route.includes('priority: baziFoundation.personA.needPriority') && route.includes('priority: baziFoundation.personB.needPriority'), 'route 要把八字引擎的補強先後傳進配對引擎');
});

check('同一頁不互相否定：沒找到互補不說「特質相近」；有衝突提醒時不說「沒有磨合點」', () => {
  const base: PersonalityMatrixCompat = { emotion: 60, logic: 60, social: 60, leadership: 80, security: 60, creativity: 60, risk: 60, attachment: 60 };
  const result = computeCompatibility({ name: '甲', matrix: base }, { name: '乙', matrix: { ...base, leadership: 82 } });
  assert.ok(result.zones.conflict.some((item) => item.includes('主導欲都強')), '前提：兩人主導欲都強，衝突區有提醒');
  assert.ok(!result.zones.grinding.some((item) => item.includes('沒有找到明顯的磨合點')), '衝突區有提醒時，磨合區不得說沒有磨合點');
  assert.ok(result.zones.complement.every((item) => !item.includes('整體特質相近')), '沒找到互補不代表特質相近');
  const layer = fs.readFileSync('lib/match-professional-layer.ts', 'utf8');
  assert.ok(layer.includes('samePattern'), '「兩個底色不同的人」要看兩人底色是否真的不同');
});

check('紅鸞證據句說人話：不出現「流年支」「命中」「沐浴位」', () => {
  const signal = buildBaziLovePersonSignal({
    yearBranch: '午', dayBranch: '酉', hourKnown: true, annualYear: 2026,
    presentBranches: [{ pillar: '年', branch: '午' }, { pillar: '月', branch: '巳' }, { pillar: '日', branch: '酉' }, { pillar: '時', branch: '亥' }],
  });
  const lines = [...signal.annualTriggers, ...signal.natalEvidence].map((item) => item.evidence);
  assert.ok(signal.annualTriggers.length > 0 && signal.natalEvidence.length > 0, '實例前提：林佩君 2026 有桃花訊號、命盤有紅鸞');
  for (const line of lines) assert.ok(!/流年支|命中|沐浴|三合局/.test(line), `證據句仍是術語：${line}`);
  assert.ok(signal.annualTriggers.some((item) => item.evidence.startsWith('2026 是午年')), '要先說今年是什麼年');
  for (const word of ['兩人最缺', '流年支 {', '年度關係主題觸發', '命盤現位']) assert.ok(!page.includes(word), `app/match/page.tsx 仍有「${word}」`);
});

check('第一屏看得到分數依據；本站格局名不冒充古籍卦名；匯出報告兩位老師都印', () => {
  const glanceStart = Math.max(page.indexOf('aria-label="一眼看懂"'), page.indexOf("aria-label={resultUi.t('一眼看懂')}"));
  const glance = page.slice(glanceStart, page.indexOf('<MatchTeacherReadings'));
  assert.ok(glance.includes('{data.scoreBasis}'), '一眼看懂要照印後端的分數依據，不能只放一個 89');
  assert.ok(page.includes('print:block') && page.includes('匯出報告時兩位老師都印出來'), '列印時未點選的老師也要印出來');
  const view = fs.readFileSync('lib/match-three-core-view.ts', 'utf8');
  assert.ok(view.includes('是本站替這一卦取的名字，不是古籍卦名'), '格局名要標明是本站取的');
  assert.ok(view.includes("'三方四正沒有形成傳統上有名稱的格局。'"), '紫微兜底名稱不得當成格局名顯示');
});

check('八字頁主珠＝後端第一補強（用神），前端不自己挑最弱的五行', () => {
  // 最弱不等於最需要：林佩君最弱的是土，土卻是她的仇神；舊版前端照強弱排序挑出土，跟同頁「用神／忌神：水／金」打架。
  const modes = fs.readFileSync('components/bazi/customer/BaziTeacherModes.tsx', 'utf8');
  const fn = modes.slice(modes.indexOf('function getBaziElementTreasure'), modes.indexOf('function currentLuck'));
  assert.ok(fn.includes('view.reinforcement.priorityOrder[0]'), '主珠要照印後端的第一補強');
  assert.ok(!/\.sort\(/.test(fn) && !fn.includes('strength'), '主珠不得在前端依五行強弱排序挑選');
  assert.ok(!modes.includes('依五行強弱選出的主珠'), '說明文字不得再寫「依五行強弱選出」');
  const lin = chartOf('1990-05-20', '亥');
  assert.equal(lin.aiReinforcementPlan.priorityOrder[0].displayName, '水元素', '林佩君的第一補強是用神水，不是仇神土');
});

console.log(`soul match — PASS ${passed}`);
