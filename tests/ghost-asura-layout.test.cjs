// Layout-only regression: real component + existing translation path; no astrology recalculation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const { GhostAsuraCard } = load('features/ghost-asura/components/GhostAsuraCard.tsx');
const { buildGhostAsuraReading } = load('features/ghost-asura/index.ts');
const keys = ['year', 'month', 'day', 'hour'];
const labels = ['年柱', '月柱', '日柱', '時柱'];
const fullLabels = ['祖域（年柱）', '命境（月柱）', '本魂（日柱）', '後界（時柱）'];
const records = [
  ['wugui', '五鬼', true, ['year', 'day']],
  ['tiangou', '天狗', true, ['month']],
  ['zaisha', '災煞', true, ['hour']],
  ['yima', '驛馬', false, ['year']],
  ['tianyi', '天乙貴人', null, ['day']],
].map(([resultId, originalName, matched, pillars]) => ({
  resultId, ruleId: resultId, originalName, matched, pillars,
  resultBatchId: 'LAYOUT_ONLY', motherVersion: 'LAYOUT_FIXTURE',
  backendStatus: matched === null ? 'BLOCKED_DATA' : matched ? 'MATCHED' : 'NOT_MATCHED',
}));

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function check(reading) {
  const before = JSON.stringify(reading);
  const html = renderToStaticMarkup(React.createElement(GhostAsuraCard, { reading: freeze(reading) }));
  assert.equal(JSON.stringify(reading), before, 'Rendering must not mutate the backend-derived reading');
  const heads = [...html.matchAll(/data-asura-pillar-head="([^"]+)"/g)].map(m => m[1]);
  const columns = [...html.matchAll(/data-asura-column="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(heads, keys);
  assert.deepEqual(columns, keys, 'Empty columns must retain their place, not shift later pillars left');
  const firstHead = html.indexOf('data-asura-pillar-head=');
  const lastHead = html.lastIndexOf('data-asura-pillar-head=');
  const banner = html.indexOf('data-asura-banner=');
  const stats = html.indexOf('data-asura-stats=');
  const firstColumn = html.indexOf('data-asura-column=');
  const lastListEnd = html.lastIndexOf('</ul>');
  const summaryFooter = html.indexOf('data-asura-summary-footer=');
  assert.ok(firstHead < lastHead && lastHead < firstColumn && lastListEnd < summaryFooter && summaryFooter < banner && banner < stats,
    'Slogans and live statistics follow all four imprint lists, outside the scrolling columns');
  assert.match(html, /別人還沒看見風暴，阿修羅先看見。/);
  assert.match(html, /命盤是戰場，不是保護區。你已經站上去了。/);
  assert.match(html, /aria-label="四柱與所屬印記，可左右捲動" tabindex="0"/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:[\s=>])/, 'Each imprint starts closed; pillars stay visible');
  for (let i = 0; i < keys.length; i++) {
    const block = html.split(`data-asura-column="${keys[i]}"`)[1].split('data-asura-column=')[0];
    const list = block.match(/<ul[^>]+data-asura-list="[^"]+"[^>]*>([\s\S]*?)<\/ul>/)[1];
    const ids = [...list.matchAll(/data-asura-id="([^"]+)"/g)].map(m => m[1]);
    const expected = reading.items.filter(item => item.sealStatus === 'awakened' && item.pillarLabels.includes(fullLabels[i]));
    const head = html.split(`data-asura-pillar-head="${keys[i]}"`)[1].split('data-asura-pillar-head=')[0];
    assert.ok(head.includes(expected[0]?.displayName ?? '暫無命中'), 'Header uses first real hit, not invented personality');
    assert.ok(head.includes(`共 ${expected.length} 枚印記`), 'Count is secondary and derived from this column');
    assert.deepEqual(ids, Array.from(expected, item => item.resultId), `${labels[i]} must keep every assigned item in order`);
    const summaries = [...list.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
    assert.deepEqual(summaries, Array.from(expected, item => item.displayName), 'Collapsed headers show names only');
    assert.equal([...list.matchAll(/<details\b/g)].length, expected.length, 'Every imprint has its own disclosure');
    for (const item of expected) {
      assert.ok(list.includes(`data-display-name="${item.displayName}"`));
      assert.ok(list.includes(`data-seal-status="${item.sealStatus}"`));
    }
    assert.doesNotMatch(block, /<h3[^>]*>年柱|<h3[^>]*>月柱|<h3[^>]*>日柱|<h3[^>]*>時柱/,
      'No second visible set of pillar headings');
  }
  return html;
}

const mixed = check(buildGhostAsuraReading({ records }));
assert.doesNotMatch(mixed, /data-asura-id="(?:yima|tianyi)"/, 'Unmatched and pending entries do not appear in customer pillar lists');
assert.equal([...mixed.matchAll(/data-asura-id="wugui"/g)].length, 2, 'A true multi-pillar hit must remain in both columns');
check(buildGhostAsuraReading({ records: records.filter(item => item.resultId !== 'tiangou') }));
check(buildGhostAsuraReading({ records: [] }));
const failed = buildGhostAsuraReading({ result: null });
assert.match(check(failed), /data-guard="failed"/);
const privatePillars = { ...buildGhostAsuraReading({ records }), pillars: { year: '甲寅', month: '庚午', day: '庚子', hour: '乙酉' } };
assert.doesNotMatch(check(privatePillars), /甲寅|庚午|庚子|乙酉/, 'Customer page keeps column labels, not underlying gan-zhi');
assert.equal(privatePillars.pillars.year, '甲寅', 'Source pillars retained unchanged');

const supplements = {
  ...buildGhostAsuraReading({ records }),
  dualClashes: [{ comboId: 'dual', title: '德星化煞', memberDisplayNames: ['護印', '劫印'], pillarLabel: '年柱', evidenceText: '雙印依據保留' }],
  chains: [
    { comboId: 'chain-a', title: '魅力匯聚', memberDisplayNames: ['魅力引力', '蛻變新生'], evidenceText: '第一張獨有內容' },
    { comboId: 'chain-b', title: '外來的風浪', memberDisplayNames: ['劫境之門'], evidenceText: '第二張獨有內容' },
  ],
};
const supplementHtml = check(supplements);
const supplementBlocks = [...supplementHtml.matchAll(/<details[^>]+data-asura-supplement="[^"]+"[^>]*>([\s\S]*?)<\/details>/g)];
assert.equal(supplementBlocks.length, 4);
assert.deepEqual(supplementBlocks.map(m => m[1].match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1].replace(/<[^>]*>/g, '')),
  ['德星化煞', '魅力匯聚', '外來的風浪', '命魂戰局']);
for (const content of ['雙印依據保留', '第一張獨有內容', '第二張獨有內容']) assert.ok(supplementHtml.includes(content));
assert.equal([...mixed.matchAll(/data-asura-supplement=/g)].length, 1,
  'Card count follows actual combinations; do not invent three extra cards for an unmatched reading');

const css = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.module.css', 'utf8');
assert.match(css, /\.pillarReadingGrid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
assert.match(css, /\.pillarsTable\s*\{\s*display:\s*contents/);
assert.match(css, /\.pillarScroll\s*\{[^}]*overflow-x:\s*auto/);
for (const selector of ['failed']) {
  assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*grid-column:\\s*1\\s*/\\s*-1`));
}
const pageSource = fs.readFileSync('app/ghost-asura/GhostAsuraPageClient.tsx', 'utf8');
assert.match(pageSource, /import styles from '\.\/ghost-asura\.module\.css'/,
  'Asura skin is page-owned; no edits to the dual-chart shared skin');
const pageCss = fs.readFileSync('app/ghost-asura/ghost-asura.module.css', 'utf8');
assert.doesNotMatch(pageCss, /:global\((?:body|html|:root)\)/, 'Page polish must not recolor other routes');
assert.match(pageCss, /animation:\s*none/, 'This page does not add flashing submit effects');
// The reference input is evaluated by the existing backend, not a list injected into the UI.
const sourceResult = load('lib/dual-chart.ts').calculateDualChart({
  birthDate: '1974-06-28', birthTime: '17:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei',
});
const sourceBefore = JSON.stringify(sourceResult);
const actualReading = buildGhostAsuraReading({ result: sourceResult });
const actualHtml = check(actualReading);
const expectedIds = {
  year: ['tiandehe', 'yima', 'gejiao'],
  month: ['jinkui', 'wugui', 'muyu', 'ripo'],
  day: ['tiangou', 'zaisha', 'yuepo', 'jiangxing'],
  hour: ['longde', 'liue', 'yuanchen', 'yangren', 'taohua', 'waiTaohua'],
};
for (const key of keys) {
  const rawIds = sourceResult.specialStars.coverage.filter(r => r.status === 'MATCHED' && r.matchedPillars.includes(key)).map(r => r.id);
  const column = actualHtml.split(`data-asura-column="${key}"`)[1].split('data-asura-column=')[0];
  const shownIds = [...column.match(/<ul[^>]*>([\s\S]*?)<\/ul>/)[1].matchAll(/data-asura-id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(Array.from(rawIds), expectedIds[key], `${key}: source IDs must match this input`);
  assert.deepEqual(shownIds, Array.from(rawIds), `${key}: no missing, extra or misplaced display IDs`);
}
assert.deepEqual([actualReading.items.length, actualReading.awakenedCount, actualReading.dormantCount, actualReading.pendingCount], [65, 17, 48, 0]);
assert.equal(new Set([...actualHtml.matchAll(/data-asura-id="([^"]+)"/g)].map(m => m[1])).size, 17);
assert.equal(JSON.stringify(sourceResult), sourceBefore, 'UI translation cannot alter source results');
console.log('PASS reference input: backend → mapping → rendered columns = 3/4/4/6; 17 distinct IDs, no dropped or shifted day/hour items');
console.log('PASS Asura four-column order, matched-only pillar lists, multi-pillar hits, empty positions, immutable input, name-only native disclosures, local scrolling contract. Actual geometry and keyboard/touch behavior are checked separately in the browser.');
