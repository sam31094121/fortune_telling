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
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTROLS, FIVE_ELEMENT_CODE_MAP, GENERATES, type FiveElementKey } from '../lib/five-element-engine';
import { buildMatchFiveElementResult, type MatchFiveElementKey, type MatchFiveElementResult } from '../lib/match-five-element-engine';
import { buildMatchStory, type MatchStoryScores } from '../lib/match-story-engine';
import { buildStableSummary, hasMatchOverclaim, isConsistentAiSummary } from '../lib/match-stability';

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
  for (const field of ['orbit.generatingCycle', 'orbit.controllingCycle', 'orbit.ranking', 'data.story', 'data.scoreBasis', 'closingAction', 'bloodTypeLabel', 'id="match-result-anchor"']) {
    assert.ok(page.includes(field), `app/match/page.tsx 要照印後端欄位 ${field}`);
  }
});

check('配對 API：劇情與分數依據由後端送出；AI 提示詞不逼它說卦', () => {
  for (const field of ['buildMatchStory(', 'scoreBasis:', 'hasMatchOverclaim', 'bloodTypeLabel']) assert.ok(route.includes(field), `route 缺 ${field}`);
  for (const word of ['buildAiCopywritingInstruction', 'enforceAiCopywritingTone', '字字點中要害', '高冷犀利']) assert.ok(!route.includes(word), `route 仍有「${word}」`);
  const templates = fs.readFileSync('lib/compatibility-engine.ts', 'utf8');
  for (const word of ['靈魂容易共鳴', '依附需求相近，關係安全感強', '矩陣分析']) assert.ok(!templates.includes(word), `compatibility-engine 仍有「${word}」`);
});

console.log(`soul match — PASS ${passed}`);
