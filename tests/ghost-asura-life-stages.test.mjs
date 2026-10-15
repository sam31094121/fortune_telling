/**
 * 鬼魅阿修羅｜四張卡人生階段守門（免登入）
 * ============================================================================
 * 守的是公信力，不是文采：
 * 1. 過去／現在／未來的判定在每個邊界歲數都對（0、1、16、17、32、33、48、49、80 歲）。
 * 2. 歲數只能被標成「後世通行的簡化分法」，不得寫成古籍記載；統計數字必須帶機關、年度、口徑。
 * 3. 不得出現預測語氣與禁字；不得出現術數用語（客戶畫面零術語）。
 * 4. 前端程式碼不得自己組句、不得自己算歲數（後端運算、前端只顯示）。
 * ============================================================================
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LIFE_STAGE_DEFS, LIFE_STAGE_BASIS_TEXT, LIFE_STAGE_DISCLAIMER,
  completedAge, tenseOf, buildLifeStageView,
} from '../lib/ghost-asura-life-stages.ts';

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

// ---- 1. 邊界歲數 ----
const EXPECT = {
  year: { 0: '未來', 1: '現在', 16: '現在', 17: '過去', 80: '過去' },
  month: { 16: '未來', 17: '現在', 32: '現在', 33: '過去' },
  day: { 32: '未來', 33: '現在', 48: '現在', 49: '過去' },
  hour: { 48: '未來', 49: '現在', 80: '現在', 120: '現在' },
};
for (const [key, cases] of Object.entries(EXPECT)) {
  for (const [age, want] of Object.entries(cases)) ok(tenseOf(Number(age), LIFE_STAGE_DEFS[key]) === want, `${key} ${age} 歲應為${want}`);
}
// 四段首尾相接、不重疊不留縫
const keys = ['year', 'month', 'day', 'hour'];
for (let i = 1; i < keys.length; i += 1) ok(LIFE_STAGE_DEFS[keys[i]].from === LIFE_STAGE_DEFS[keys[i - 1]].to + 1, `${keys[i]} 要緊接在 ${keys[i - 1]} 後`);
ok(LIFE_STAGE_DEFS.hour.to === null, '最後一段不設上限');

// ---- 週歲（台北時區）----
const now = new Date('2026-10-15T02:00:00Z'); // 台北 2026-10-15 10:00
ok(completedAge('1974-10-15', now) === 52, '生日當天滿歲');
ok(completedAge('1974-10-16', now) === 51, '生日前一天還差一歲');
ok(completedAge('2030-01-01', now) === null, '生日在未來不猜');
ok(completedAge('abc', now) === null, '格式錯誤不猜');
ok(completedAge('1974-1-5', now) === null, '格式不符不猜');
// 台北已過午夜、UTC 還是前一天：1990-10-16 出生者在台北 2026-10-16 00:30 應滿 36 歲
ok(completedAge('1990-10-16', new Date('2026-10-15T16:30:00Z')) === 36, '用台北日期，不用伺服器時區');

// ---- 2/3. 文字守門 ----
const BAD = /必定|一定會|註定|大凶|血光|死|保證|證實|準確|國家認證/;
const JARGON = ['年柱', '月柱', '日柱', '時柱', '四柱', '神煞', '八字', '紫微', '命宮', '主星', '宮位', '四化', '大運', '流年', '天干', '地支', '干支', '十神', '五行', '命盤', '排盤', '命主', '日主', '納音', '空亡', '星曜', '易經', '子時', '時辰'];
const view = Object.fromEntries(keys.map((k) => [k, buildLifeStageView(k, '1974-06-28', now)]));
ok(/不是《淵海子平》原文/.test(LIFE_STAGE_BASIS_TEXT) && /沒有寫歲數/.test(LIFE_STAGE_BASIS_TEXT), '必須揭露歲數不是古籍原文');
ok(/不是預測/.test(LIFE_STAGE_DISCLAIMER), '必須聲明不是預測');
for (const [k, v] of Object.entries(view)) {
  const all = [v.ageText, v.roleText, v.basisText, v.disclaimer, ...v.contextLines];
  for (const t of all) {
    ok(t.trim().length > 0, `${k} 有空白字串`);
    ok(!BAD.test(t), `${k} 含禁字或誇大宣稱：${t.slice(0, 40)}`);
    for (const j of JARGON) ok(!t.includes(j), `${k} 出現術數用語「${j}」：${t.slice(0, 40)}`);
  }
  ok(v.basisText === LIFE_STAGE_BASIS_TEXT, `${k} 缺歲數來源揭露`);
  ok(v.contextLines.length >= 1, `${k} 至少要有一則背景`);
  // 凡是「官方統計」字樣，必須同時有機關、年度（民國 N 年）與調查或通報名稱
  for (const line of v.contextLines.filter((l) => l.startsWith('官方統計'))) {
    ok(/\d+ 年/.test(line), `${k} 統計要有年度：${line}`);
    ok(/內政部|勞動部/.test(line), `${k} 統計要有機關：${line}`);
    ok(/（.+）/.test(line), `${k} 統計要有口徑或出處：${line}`);
  }
}
// 傳統對應只能說「親屬」，不能把古籍沒寫的「晚年」硬掛給時柱
ok(!view.hour.roleText.includes('晚年'), '古籍沒有把時柱對應晚年，不得硬寫');
// 沒有出生日期：不給時態標籤，但仍給歲數與背景
const none = buildLifeStageView('day', undefined, now);
ok(none.tenseLabel === '' && none.ageText.length > 0, '沒有生日不猜時態');

// ---- 4. 前端不得自己組句或算歲數 ----
const tsx = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.tsx', 'utf8');
ok(!/completedAge|tenseOf|LIFE_STAGE_DEFS|buildLifeStageView/.test(tsx), '前端不得匯入或呼叫人生階段運算');
ok(tsx.includes('column.life') && tsx.includes('life.tenseLabel') && tsx.includes('life.ageText'), '前端要照印標題列的時態與歲數');
ok(/<details[^>]*lifeDetail/.test(tsx), '背景與依據用可收合的卡片，讓客戶自己往下看');

console.log(`ghost-asura-life-stages: ${checks} checks passed`);
