const fs = require('fs');
const root = process.argv[2];
const path = root + '/tests/ghost-asura-palace-verses.test.cjs';
let s = fs.readFileSync(path, 'utf8');

const reps = [
  [`assert.equal(v.viewerLine, '你今年 52 歲（虛歲 53）。');`,
   `assert.equal(v.viewerLine, '你今年虛歲 53（實歲 52）。');`],
  [`  [4, 13, '過去', ['帝旺', '喜神', '龍德', '息神'], '你自己'],
  [14, 23, '過去', ['衰', '病符', '白虎', '華蓋'], '上一代'],
  [24, 33, '過去', ['病', '大耗', '天德', '劫煞'], '心思'],
  [34, 43, '過去', ['死', '伏兵', '弔客', '災煞'], '家門'],
  [44, 53, '現在', ['墓', '官府', '病符', '天煞'], '事業'],
  [54, 63, '未來', ['絕', '博士', '歲建', '指背'], '身邊的人'],`,
   `  [4, 13, '過去', ['帝旺', '喜神', '龍德', '息神'], '自個兒'],
  [14, 23, '過去', ['衰', '病符', '白虎', '華蓋'], '長輩邊'],
  [24, 33, '過去', ['病', '大耗', '天德', '劫煞'], '心裡頭'],
  [34, 43, '過去', ['死', '伏兵', '弔客', '災煞'], '住的地'],
  [44, 53, '現在', ['墓', '官府', '病符', '天煞'], '手上差事'],
  [54, 63, '未來', ['絕', '博士', '歲建', '指背'], '人手邊'],`],
  [`assert.equal(g.ageLabel, \`約 \${a}–\${b} 歲\`); assert.deepEqual(srv.ranges[i], [a, b]);`,
   `assert.equal(g.ageLabel, \`約虛歲 \${a}–\${b}\`); assert.deepEqual(srv.ranges[i], [a, b]);`],
  [`const HEADLINES_1974 = ["4 歲起，我把你推到最高點，守得住才是你的", "14 歲起，你前面有險，出手留三分", "24 歲起，錢在往外流，我要你先守住家底", "34 歲起，這段有場傷心事，我陪你哭完再站起來", "44 歲起，身體在喊停，我要你先停，再打下一仗", "54 歲起，舊路我替你斷了，新路從你腳下開始"];`,
   `const HEADLINES_1974 = ["虛歲4起，我把你推到最高點，守得住才是你的", "虛歲14起，你前面有險，出手留三分", "虛歲24起，錢在往外流，我要你先守住家底", "虛歲34起，這段有場傷心事，我陪你哭完再站起來", "虛歲44起，身體在喊停，我要你先停，再打下一仗", "虛歲54起，舊路我替你斷了，新路從你腳下開始"];`],
  [`assert.deepEqual(v.segments.map((g) => g.opening.text), ["你 4–13 歲走過這段，落在你自己。", "你 14–23 歲走過這段，落在上一代。", "你 24–33 歲走過這段，落在心思。", "你 34–43 歲走過這段，落在家門。", "今年是這段最後一年，收尾要穩。", "再過 1 年，你 54 歲進這段，落在身邊的人。"]);`,
   `assert.deepEqual(v.segments.map((g) => g.opening.text), ["你虛歲 4–13 走過這段，落在自個兒。", "你虛歲 14–23 走過這段，落在長輩邊。", "你虛歲 24–33 走過這段，落在心裡頭。", "你虛歲 34–43 走過這段，落在住的地。", "今年是這段最後一年，收尾要穩。", "再過 1 年，你虛歲 54 進這段，落在人手邊。"]);`],
  [`{ const vn = display.computeAgeTimeline(r, now, '  阿勝 '); assert.equal(vn.viewerLine, '阿勝，你今年 52 歲（虛歲 53）。'); assert(vn.segments[4].opening.text.startsWith('阿勝，今年是這段最後一年')); assert.equal(vn.segments.filter((g) => g.opening.text.includes('阿勝')).length, 1);`,
   `{ const vn = display.computeAgeTimeline(r, now, '  阿勝 '); assert.equal(vn.viewerLine, '阿勝，你今年虛歲 53（實歲 52）。'); assert(vn.segments[4].opening.text.startsWith('阿勝，今年是這段最後一年')); assert.equal(vn.segments.filter((g) => g.opening.text.includes('阿勝')).length, 1);`],
  [`assert.deepEqual(kept('2008-01-15'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲"], 'age18 cutoff 28');
  assert.deepEqual(kept('1986-06-28'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲", "約 36–45 歲", "約 46–55 歲"], 'age40 cutoff 50');
  assert.deepEqual(kept('1946-06-28'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲", "約 36–45 歲", "約 46–55 歲", "約 56–65 歲", "約 66–75 歲", "約 76–85 歲", "約 86–95 歲"], 'age80 cutoff 90'); assert.equal(display.computeAgeTimeline(r, now, '天同').viewerLine, v.viewerLine); }`,
   `assert.deepEqual(kept('2008-01-15'), ["約虛歲 6–15", "約虛歲 16–25", "約虛歲 26–35"], 'age18 cutoff 28');
  assert.deepEqual(kept('1986-06-28'), ["約虛歲 6–15", "約虛歲 16–25", "約虛歲 26–35", "約虛歲 36–45", "約虛歲 46–55"], 'age40 cutoff 50');
  assert.deepEqual(kept('1946-06-28'), ["約虛歲 6–15", "約虛歲 16–25", "約虛歲 26–35", "約虛歲 36–45", "約虛歲 46–55", "約虛歲 56–65", "約虛歲 66–75", "約虛歲 76–85", "約虛歲 86–95"], 'age80 cutoff 90'); assert.equal(display.computeAgeTimeline(r, now, '天同').viewerLine, v.viewerLine); }`],
  [`assert.deepEqual(tl.buildDecreeAnchors(v, { name: null, age: 52 }).map((a) => [a.label, a.ageRange, a.mark, a.headline]), [['你 34–43 歲・走過的路', '34–43', '走過', v.segments[3].opening.headline], ['你今年 52 歲・就在這段', '44–53', '現在', v.segments[4].opening.headline], ['你今年 52 歲・現在就做', '44–53', '現在就做', '今天就做這一件：這陣子給自己排一天休息，身體不對勁就去看醫生'], ['你 54 歲起・下一段', '54–63', '下一段', v.segments[5].opening.headline]], '1974 anchor markers');`,
   `assert.deepEqual(tl.buildDecreeAnchors(v, { name: null, age: 52, nominalAge: 53 }).map((a) => [a.label, a.ageRange, a.mark, a.headline]), [['你虛歲 34–43・走過的路', '34–43', '走過', v.segments[3].opening.headline], ['你今年虛歲 53・就在這段', '44–53', '現在', v.segments[4].opening.headline], ['你今年虛歲 53・現在就做', '44–53', '現在就做', '今天就做這一件：這陣子給自己排一天休息，身體不對勁就去看醫生'], ['你虛歲 54 起・下一段', '54–63', '下一段', v.segments[5].opening.headline]], '1974 anchor markers');`],
  [`assert.notEqual(tl.buildDecreeAnchors(v, { name: null, age: 52 })[1].headline, tl.buildDecreeAnchors(v, { name: null, age: 52 })[2].headline, '現在 vs 現在就做 headlines differ');
assert.equal(tl.buildPinnedSummary(v, { name: null, age: 52, nominalAge: 53 }), '你今年 52 歲，這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 52, nominalAge: 53 }), '阿勝，你今年 52 歲，這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 50, nominalAge: 50 }), '阿勝，你今年 50 歲，這段還剩 3 年');
assert.equal(tl.buildPinnedSummary(null, { name: '阿勝', age: 52 }), '阿勝，你今年 52 歲');
assert.equal(tl.buildPinnedSummary(v, null), null);`,
   `assert.notEqual(tl.buildDecreeAnchors(v, { name: null, age: 52, nominalAge: 53 })[1].headline, tl.buildDecreeAnchors(v, { name: null, age: 52, nominalAge: 53 })[2].headline, '現在 vs 現在就做 headlines differ');
assert.equal(tl.buildPinnedSummary(v, { name: null, age: 52, nominalAge: 53 }), '你今年虛歲 53（實歲 52），這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 52, nominalAge: 53 }), '阿勝，你今年虛歲 53（實歲 52），這段今年收尾');
assert.equal(tl.buildPinnedSummary(v, { name: '阿勝', age: 50, nominalAge: 50 }), '阿勝，你今年虛歲 50（實歲 50），這段還剩 3 年');
assert.equal(tl.buildPinnedSummary(null, { name: '阿勝', age: 52 }), '阿勝，你今年實歲 52 歲');
assert.equal(tl.buildPinnedSummary(v, null), null);`],
];

for (const [a,b] of reps) {
  if (!s.includes(a)) { console.error('MISSING:\n', a.slice(0,160)); process.exit(1); }
  s = s.replace(a,b);
}

// multi-chart headline assert uses startsWith range[0] 歲起
s = s.replace(
  'assert(Array.from(g.opening.headline).length <= 26 && g.opening.headline.startsWith(`${pv[i].range[0]} 歲起，`), `headline ≤26 + age ${y}-${m} seg${i}: ${g.opening.headline}`);',
  'assert(Array.from(g.opening.headline).length <= 26 && g.opening.headline.startsWith(`虛歲${pv[i].range[0]}起，`), `headline ≤26 + age ${y}-${m} seg${i}: ${g.opening.headline}`);'
);

// domain vs palace alias assert + computeGhostAsuraDisplay pinned
if (!s.includes('domains avoid palace aliases')) {
  const block = `// domains avoid palace aliases
{ assert(Array.isArray(tl.PALACE_NAME_ALIASES) && tl.PALACE_NAME_ALIASES.includes('事業') && tl.PALACE_NAME_ALIASES.includes('家宅'));
  for (const [k, d] of Object.entries(tl.PALACE_VERSE_DOMAIN)) {
    for (const a of tl.PALACE_NAME_ALIASES) {
      assert.notEqual(d, a, \`domain \${k} equals alias \${a}\`);
      assert(!d.includes(a), \`domain \${k}=(\${d}) contains alias \${a}\`);
    }
  }
  const ok = display.computeGhostAsuraDisplay({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei', name: '阿勝' });
  assert.equal(ok.pinnedSummary, '阿勝，你今年虛歲 53（實歲 52），這段今年收尾');
}
`;
  // insert before hook tails block or final log
  if (s.includes('assert.equal(ok.pinnedSummary, \'阿勝，你今年 52 歲，這段今年收尾\')')) {
    s = s.replace("assert.equal(ok.pinnedSummary, '阿勝，你今年 52 歲，這段今年收尾');", "assert.equal(ok.pinnedSummary, '阿勝，你今年虛歲 53（實歲 52），這段今年收尾');");
  }
  s = s.replace('// hook tails unique per segment + targetName 禁名', block + '// hook tails unique per segment + targetName 禁名');
}

fs.writeFileSync(path, s);
console.log('OK palace tests');

// regression: pinned includes 虛歲
{
  const p = root + '/tests/ghost-asura-nature-api-regression.test.cjs';
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(
    'assert(typeof now.pinnedSummary === \'string\' && now.pinnedSummary.includes(`你今年 ${now.viewer.age} 歲`), `${name} pinnedSummary`);',
    'assert(typeof now.pinnedSummary === \'string\' && now.pinnedSummary.includes(\'虛歲\') && now.pinnedSummary.includes(`實歲 ${now.viewer.age}`), `${name} pinnedSummary`);'
  );
  t = t.replace(
    'assert(typeof now.ageTimeline.viewerLine === \'string\' && now.ageTimeline.viewerLine.includes(`你今年 ${now.viewer.age} 歲`), `${name} viewerLine`);',
    'assert(typeof now.ageTimeline.viewerLine === \'string\' && now.ageTimeline.viewerLine.includes(\'虛歲\') && now.ageTimeline.viewerLine.includes(`實歲 ${now.viewer.age}`), `${name} viewerLine`);'
  );
  fs.writeFileSync(p, t);
  console.log('OK regression');
}
