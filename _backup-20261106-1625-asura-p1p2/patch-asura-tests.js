const fs = require('fs');
const root = process.argv[2];
const path = root + '/tests/ghost-asura-palace-verses.test.cjs';
let s = fs.readFileSync(path, 'utf8');

const reps = [
  [`assert.equal(v.viewerLine, '你今年 52 歲（虛歲 53），正走在 44–53 歲這段。');`,
   `assert.equal(v.viewerLine, '你今年 52 歲（虛歲 53）。');`],
  [`  [24, 33, '過去', ['病', '大耗', '天德', '劫煞'], '心氣'],
  [34, 43, '過去', ['死', '伏兵', '弔客', '災煞'], '家門'],
  [44, 53, '現在', ['墓', '官府', '病符', '天煞'], '戰功'],
  [54, 63, '未來', ['絕', '博士', '歲建', '指背'], '身邊人馬'],`,
   `  [24, 33, '過去', ['病', '大耗', '天德', '劫煞'], '心思'],
  [34, 43, '過去', ['死', '伏兵', '弔客', '災煞'], '家門'],
  [44, 53, '現在', ['墓', '官府', '病符', '天煞'], '事業'],
  [54, 63, '未來', ['絕', '博士', '歲建', '指背'], '身邊的人'],`],
  [`assert.deepEqual(v.segments.map((g) => g.opening.text), ["你 4–13 歲走過這段，落在你自己。", "你 14–23 歲走過這段，落在上一代。", "你 24–33 歲走過這段，落在心氣。", "你 34–43 歲走過這段，落在家門。", "你今年虛歲 53，正走在這段，落在戰功；今年是這段最後一年。", "再過 1 年，你 54 歲進這段，落在身邊人馬。"]);`,
   `assert.deepEqual(v.segments.map((g) => g.opening.text), ["你 4–13 歲走過這段，落在你自己。", "你 14–23 歲走過這段，落在上一代。", "你 24–33 歲走過這段，落在心思。", "你 34–43 歲走過這段，落在家門。", "今年是這段最後一年，收尾要穩。", "再過 1 年，你 54 歲進這段，落在身邊的人。"]);`],
  [`{ const vn = display.computeAgeTimeline(r, now, '  阿勝 '); assert.equal(vn.viewerLine, '阿勝，你今年 52 歲（虛歲 53），正走在 44–53 歲這段。'); assert(vn.segments[4].opening.text.startsWith('阿勝，你今年虛歲 53')); assert.equal(vn.segments.filter((g) => g.opening.text.includes('阿勝')).length, 1);`,
   `{ const vn = display.computeAgeTimeline(r, now, '  阿勝 '); assert.equal(vn.viewerLine, '阿勝，你今年 52 歲（虛歲 53）。'); assert(vn.segments[4].opening.text.startsWith('阿勝，今年是這段最後一年')); assert.equal(vn.segments.filter((g) => g.opening.text.includes('阿勝')).length, 1);`],
  [`assert.equal(tl.buildPinnedSummary(v, { name: null, age: 52 }), '你今年 52 歲，正走在 44–53 歲這段');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 52 }), '阿勝，你今年 52 歲，正走在 44–53 歲這段');
assert.equal(tl.buildPinnedSummary(null, { name: '阿勝', age: 52 }), '阿勝，你今年 52 歲');
assert.equal(tl.buildPinnedSummary(v, null), null);`,
   `assert.equal(tl.buildPinnedSummary(v, { name: null, age: 52, nominalAge: 53 }), '你今年 52 歲，這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 52, nominalAge: 53 }), '阿勝，你今年 52 歲，這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 18, nominalAge: 20 }), '阿勝，你今年 18 歲，這段還剩 5 年');
assert.equal(tl.buildPinnedSummary(null, { name: '阿勝', age: 52 }), '阿勝，你今年 52 歲');
assert.equal(tl.buildPinnedSummary(v, null), null);`],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('FAIL find:\n', a.slice(0, 120)); process.exit(1); }
  s = s.replace(a, b);
}

// Add hook-tail uniqueness + targetName sanitize asserts before final console.log
if (!s.includes('hook tails unique per segment')) {
  const insert = `// hook tails unique per segment + targetName 禁名
{ const stock = [...tl.AGE_HOOK_TO_HISTORY, ...tl.AGE_HOOK_TO_ACTION];
  for (const g of v.segments) {
    const tails = [];
    for (const d of g.depth) for (const h of [d.basis.hook, d.history && d.history.hook].filter(Boolean)) {
      const t = stock.find((x) => h.endsWith(x)); if (t) tails.push(t);
    }
    assert.equal(new Set(tails).size, tails.length, 'hook tails unique per segment ' + g.ageLabel);
  }
  const disp = display.computeGhostAsuraDisplay({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei', name: '天同' });
  assert.equal(disp.targetName, null, 'targetName sanitizes forbidden 天同');
  assert.equal(disp.viewer && disp.viewer.name, null);
  const ok = display.computeGhostAsuraDisplay({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei', name: '阿勝' });
  assert.equal(ok.targetName, '阿勝');
  assert.equal(ok.pinnedSummary, '阿勝，你今年 52 歲，這段今年收尾');
}
`;
  const marker = "console.log(`ghost-asura-palace-verses: PASS";
  if (!s.includes(marker)) { console.error('final log missing'); process.exit(1); }
  s = s.replace(marker, insert + marker);
}

fs.writeFileSync(path, s);
console.log('OK palace-verses tests');

// nature-api-regression: pinnedSummary shape still checks includes 你今年 N 歲 — OK
// optionally assert no 正走在 range in pinnedSummary
{
  const p = root + '/tests/ghost-asura-nature-api-regression.test.cjs';
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('pinnedSummary has no A-B range')) {
    t = t.replace(
      "assert(typeof now.pinnedSummary === 'string' && now.pinnedSummary.includes(`你今年 ${now.viewer.age} 歲`), `${name} pinnedSummary`);",
      "assert(typeof now.pinnedSummary === 'string' && now.pinnedSummary.includes(`你今年 ${now.viewer.age} 歲`), `${name} pinnedSummary`);\n    assert(!/\\\\d+–\\\\d+/.test(now.pinnedSummary), `${name} pinnedSummary has no A-B range`);\n    assert(!/\\\\d+–\\\\d+/.test(now.ageTimeline.viewerLine), `${name} viewerLine has no A-B range`);"
    );
    // Fix - in the file the replace above used double-escaped for writing into the test file content
  }
  // Do it more carefully:
  const needle = "assert(typeof now.pinnedSummary === 'string' && now.pinnedSummary.includes(`你今年 ${now.viewer.age} 歲`), `${name} pinnedSummary`);";
  const add = needle + "\n    assert(!/\\d+–\\d+/.test(now.pinnedSummary), `${name} pinnedSummary has no A-B range`);\n    assert(!/\\d+–\\d+/.test(now.ageTimeline.viewerLine), `${name} viewerLine has no A-B range`);";
  if (t.includes(needle) && !t.includes('pinnedSummary has no A-B range')) t = t.replace(needle, add);
  fs.writeFileSync(p, t);
  console.log('OK regression');
}

// name-identity: append sanitize targetName note via file read of display source
{
  const p = root + '/tests/ghost-asura-name-identity.test.cjs';
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('targetName 必須經 sanitizeViewerName')) {
    t += `
// 5. targetName 必須經 sanitizeViewerName（原始碼契約）
{
  const src = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-display.ts'), 'utf8');
  assert(src.includes('const targetName = sanitizeViewerName(engineInput.name)'), 'targetName 必須經 sanitizeViewerName');
  assert(!/const targetName = typeof engineInput\\.name === 'string' && engineInput\\.name\\.trim\\(\\)\\.length >= 2/.test(src), '舊版 targetName trim 長度判斷已移除');
  console.log('✅ targetName sanitizeViewerName 契約');
}
`;
    fs.writeFileSync(p, t);
  }
  console.log('OK name-identity');
}
