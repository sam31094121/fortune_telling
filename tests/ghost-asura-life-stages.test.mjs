/**
 * 鬼魅阿修羅｜四張卡人生階段守門（免登入）
 * ============================================================================
 * 守兩件事：公信力、阿修羅口氣。
 * 1. 過去／現在／未來在每個邊界歲數都對；歲數只能被標成「後人劃的線」，不得寫成古籍記載。
 * 2. 統計與古籍的事實錨點不得被改掉（數字、機關、年度、書名）。
 * 3. 每一句都過 lintAsuraVoice（阿修羅話術規範：短句、不發問、不求認同、不解釋原因、不含糊、
 *    不做具體預言、不威嚇、不空洞誇詞，每句 16 字內），也不得出現禁字與術數用語。
 * 4. 小品要有變化：不同生日讀到不同說法；同一個人的四張卡之間不重複同一句。
 * 5. 前端不得自己組句、不得自己算歲數（後端運算、前端只顯示）。
 * ============================================================================
 */
import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// 'server-only' 只是 Next 的編譯期標記，本機沒有安裝；測試時以空模組代替（只為了載入話術規範的 lint）。
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-only-'));
const stubFile = path.join(stubDir, 'index.js');
fs.writeFileSync(stubFile, 'module.exports = {};\n');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === 'server-only') return stubFile;
  return originalResolve.call(this, request, ...rest);
};

const { LIFE_STAGE_DEFS, completedAge, tenseOf, buildLifeStageView } = await import('../lib/ghost-asura-life-stages.ts');
const { lintAsuraVoice } = await import('../lib/server/ghost-asura-voice.ts');

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
ok(completedAge('1990-10-16', new Date('2026-10-15T16:30:00Z')) === 36, '用台北日期，不用伺服器時區');

// ---- 取樣：一批生日 × 一批「現在」，涵蓋四段各種時態 ----
const BIRTHS = ['1950-03-04', '1962-11-30', '1974-06-28', '1974-07-02', '1985-01-19', '1993-08-08', '2001-12-25', '2012-05-17', '2025-02-02'];
const NOWS = [new Date('2026-10-15T02:00:00Z'), new Date('2036-03-01T02:00:00Z')];
const allViews = [];
for (const b of BIRTHS) for (const n of NOWS) allViews.push({ b, n, cards: keys.map((k) => ({ k, v: buildLifeStageView(k, b, n) })) });

// ---- 2/3. 文字守門 ----
const BAD = /必定|一定會|註定|大凶|血光|死|保證|證實|準確|國家認證|大數據/;
const JARGON = ['年柱', '月柱', '日柱', '時柱', '四柱', '神煞', '八字', '紫微', '命宮', '主星', '宮位', '四化', '大運', '流年', '天干', '地支', '干支', '日干', '日支', '十神', '五行', '命盤', '排盤', '命主', '日主', '納音', '空亡', '星曜', '易經', '子時', '時辰'];
const textsOf = (v) => [v.headline, ...v.lines, v.note].filter(Boolean);
const seenTexts = new Set();
for (const { b, cards } of allViews) {
  for (const { k, v } of cards) {
    ok(v.lines.length === 2 && v.lines.every((l) => l.trim()), `${b} ${k} 收合區要有古籍對應與背景兩句`);
    ok(v.note.trim().length > 0, `${b} ${k} 缺歲數說明`);
    for (const t of textsOf(v)) {
      seenTexts.add(t);
      ok(!BAD.test(t), `${b} ${k} 含禁字或誇大宣稱：${t}`);
      for (const j of JARGON) ok(!t.includes(j), `${b} ${k} 出現術數用語「${j}」：${t}`);
    }
  }
}
// 每一句都過阿修羅話術規範（對「去重後的所有文字」逐句檢查，不管是哪個生日抽到）
for (const t of seenTexts) {
  const problems = lintAsuraVoice(t);
  ok(problems.length === 0, `不合阿修羅話術規範（${problems.join('、')}）：${t}`);
}

// ---- 事實錨點（改口氣可以，改事實不行）----
const allText = [...seenTexts].join('\n');
ok(/《淵海子平》/.test(allText), '要點名古籍《淵海子平》');
ok(/內政部統計處/.test(allText) && /108 年/.test(allText) && /31 歲/.test(allText), '首胎生母 31 歲要帶機關與年度');
ok(/勞動部/.test(allText) && /114 年/.test(allText) && /60\.9 歲/.test(allText) && /82%/.test(allText), '規劃退休 60.9 歲要帶機關、年度與 82% 未規劃');
ok(/艾瑞克森/.test(allText) && /阿奈特/.test(allText) && /列文森/.test(allText), '心理學要帶出處人名');
for (const k of keys) {
  const note = buildLifeStageView(k, '1974-06-28', now).note;
  ok(/後人|古書/.test(note), `${k} 歲數說明必須揭露不是古書原文：${note}`);
}
ok(/不是預言/.test(buildLifeStageView('hour', '1974-06-28', now).note), '最後一段要聲明不是預言');
// 古籍沒有把「晚年」對應給時柱
ok(!/晚年/.test(allText), '古籍沒有把時柱對應晚年，不得硬寫');
// 沒有出生日期：不給時態與一句話，但仍給歲數與收合區
const none = buildLifeStageView('day', undefined, now);
ok(none.tenseLabel === '' && none.headline === '' && none.ageText.length > 0 && none.lines.length === 2, '沒有生日不猜時態');

// ---- 指向底下印記卡：這張卡只講這一段人生，細項由底下的印記分析 ----
const pointers = new Set();
for (const k of keys) for (const n of [0, 1, 3, 9]) for (let d = 1; d <= 20; d += 1) {
  const v = buildLifeStageView(k, `1980-03-${String(d).padStart(2, '0')}`, now, n);
  ok(v.pointer.trim().length > 0, `${k} 有數量時要給指向底下的一句話`);
  ok(!v.pointer.includes('{N}'), `${k} 枚數沒換進去`);
  ok(n === 0 ? !/[0-9]/.test(v.pointer) : v.pointer.includes(String(n)), `${k} 枚數要如實帶出：${v.pointer}`);
  pointers.add(v.pointer);
}
for (const t of pointers) {
  const problems = lintAsuraVoice(t);
  ok(problems.length === 0, `指向句不合阿修羅話術規範（${problems.join('、')}）：${t}`);
  ok(!BAD.test(t), `指向句含禁字：${t}`);
  for (const j of JARGON) ok(!t.includes(j), `指向句出現術數用語「${j}」：${t}`);
}
ok(buildLifeStageView('day', '1980-03-05', now).pointer === '', '沒給枚數就不編指向句');
ok(new Set([...pointers].filter((t) => !/[0-9]/.test(t))).size >= 2 && new Set([...pointers].filter((t) => /[0-9]/.test(t))).size >= 3, '指向句要有變化');

// ---- 4. 變化 ----
// 同一個人的四張卡：不得重複同一句
for (const { b, n, cards } of allViews) {
  const all = cards.flatMap(({ v }) => textsOf(v));
  ok(new Set(all).size === all.length, `${b} ${n.toISOString().slice(0, 4)} 同一個人的四張卡出現重複句`);
}
// 不同生日要讀到不同說法：每一種欄位至少出現 2 種不同版本
for (const k of keys) {
  const heads = new Set(), roles = new Set(), facts = new Set();
  for (let d = 1; d <= 28; d += 1) {
    const v = buildLifeStageView(k, `1990-05-${String(d).padStart(2, '0')}`, now);
    roles.add(v.lines[0]); facts.add(v.lines[1]);
  }
  for (let y = 1930; y <= 2024; y += 1) {
    const v = buildLifeStageView(k, `${y}-05-05`, now);
    if (v.headline) heads.add(v.headline);
  }
  ok(roles.size >= 2, `${k} 古籍對應說法太單一`);
  ok(facts.size >= 2, `${k} 背景說法太單一`);
  ok(heads.size >= 3, `${k} 一句話說法太單一（${heads.size} 種）`);
}
// 決定性：同一個人每次都一樣
ok(JSON.stringify(buildLifeStageView('month', '1974-06-28', now)) === JSON.stringify(buildLifeStageView('month', '1974-06-28', now)), '同一個人要穩定同一套');

// ---- 5. 前端不得自己組句或算歲數 ----
const tsx = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.tsx', 'utf8');
ok(!/completedAge|tenseOf|LIFE_STAGE_DEFS|buildLifeStageView/.test(tsx), '前端不得匯入或呼叫人生階段運算');
ok(tsx.includes('life.tenseLabel') && tsx.includes('life.ageText') && tsx.includes('life.headline') && tsx.includes('life.note') && tsx.includes('life.pointer'), '前端要照印時態、歲數、一句話、指向句、收合區與說明');
// 「這一役的來歷」收合面板已隱藏（業主 2026-10-15：沒有用途）。原碼保留但不得顯示；歲數說明改為常駐一行，避免歲數被誤讀成古籍定論。
ok(/const SHOW_LIFE_ORIGIN = false as boolean;/.test(tsx), '來歷面板開關必須維持 false，未經明說不得再顯示');
// 標題卡下面的三行字（一句話、指向、歲數說明）業主 2026-10-15 要求隱藏：上面的標題卡已經有了。
ok(/const SHOW_LIFE_TEXT = false as boolean;/.test(tsx), '標題卡下面的字開關必須維持 false，未經明說不得再顯示');
for (const field of ['headline', 'pointer', 'note']) ok(new RegExp(`\\{SHOW_LIFE_TEXT && column\\.life && column\\.life\\.${field} &&`).test(tsx), `${field} 必須掛在隱藏開關後面`);
ok(/\{SHOW_LIFE_ORIGIN && column\.life && \(\s*<details[^>]*lifeDetail/.test(tsx), '來歷面板必須掛在開關後面（原碼保留但不顯示）');
ok(/column\.life\.note &&/.test(tsx.split('{SHOW_LIFE_ORIGIN && column.life')[0]), '歲數說明要常駐顯示在面板之前');

console.log(`ghost-asura-life-stages: ${checks} checks passed`);
