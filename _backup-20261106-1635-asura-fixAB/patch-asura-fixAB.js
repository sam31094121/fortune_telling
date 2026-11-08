const fs = require('fs');
const root = process.argv[2];
const read = (r) => fs.readFileSync(root + '/' + r, 'utf8');
const write = (r, s) => fs.writeFileSync(root + '/' + r, s);

function decreeBodies(s) {
  return [...s.matchAll(/key: '(opening|sandbox|tactics|closing)', heading: '[^']+', body: '([^']*)'/g)].map((m) => m[1] + '::' + m[2]);
}

{
  let s = read('lib/server/ghost-asura-translation-layer.ts');
  const before = decreeBodies(s);

  // A: domains
  const oldDom = `export const PALACE_VERSE_DOMAIN: Readonly<Record<string, string>> = {
  MING: '你自己',
  XIONG_DI: '夥伴',
  FU_QI: '枕邊人',
  ZI_NV: '晚輩',
  CAI_BO: '錢袋',
  JI_E: '這副身子',
  QIAN_YI: '出外的路',
  JIAO_YOU: '身邊的人',
  GUAN_LU: '事業',
  TIAN_ZHAI: '家門',
  FU_DE: '心思',
  FU_MU: '上一代',
};`;
  const newDom = `export const PALACE_VERSE_DOMAIN: Readonly<Record<string, string>> = {
  MING: '自個兒',
  XIONG_DI: '共事場',
  FU_QI: '枕邊',
  ZI_NV: '晚輩堆',
  CAI_BO: '錢袋子',
  JI_E: '身子骨',
  QIAN_YI: '出外路',
  JIAO_YOU: '人手邊',
  GUAN_LU: '手上差事',
  TIAN_ZHAI: '住的地',
  FU_DE: '心裡頭',
  FU_MU: '長輩邊',
};`;
  if (!s.includes(oldDom)) { console.error('domain block mismatch'); process.exit(1); }
  s = s.replace(oldDom, newDom);

  // A: stage templates → complete natural sentences
  const oldStage = `export const PALACE_VERSE_STAGE: Readonly<Record<string, VerseTemplate>> = {
  長生: T('{d}，你的新勁剛冒頭，根還淺。', '如人始生而向長'),
  沐浴: T('{d}，你還嫩，一碰就傷。', '又曰敗，形體柔脆易為所損'),
  冠帶: T('{d}，你架勢成了，缺一場實戰。', '形氣漸長，如人具衣冠'),
  臨官: T('{d}，你已能自己帶人上陣。', '由長而壯，可以出仕'),
  帝旺: T('{d}，你站在最高點，再上沒路。', '壯盛之極'),
  衰: T('{d}，你的勢頭在往回收。', '盛極而衰'),
  病: T('{d}，你力氣見底，硬拚必輸。', '衰之甚'),
  死: T('{d}，你的舊勁用完了，別硬撐。', '氣之盡而無餘'),
  墓: T('{d}，我要你藏好實力，別打光。', '又曰庫，造化收藏'),
  絕: T('{d}，你的舊路斷了，新路在前。', '前之氣已絕，後之氣將續'),
  胎: T('{d}，你的新局在暗處成形。', '後之氣續而結聚成胎'),
  養: T('{d}，你還在長本事，刀未出鞘。', '如人養母腹（成形）'),
};`;
  const newStage = `export const PALACE_VERSE_STAGE: Readonly<Record<string, VerseTemplate>> = {
  長生: T('{d}這一塊，新勁剛冒頭。根還淺。', '如人始生而向長'),
  沐浴: T('{d}這一塊，你還嫩。一碰就傷。', '又曰敗，形體柔脆易為所損'),
  冠帶: T('{d}這一塊，架勢成了。缺一場實戰。', '形氣漸長，如人具衣冠'),
  臨官: T('{d}這一塊，你能自己帶人了。', '由長而壯，可以出仕'),
  帝旺: T('{d}這一塊，你在最高點。再上沒路。', '壯盛之極'),
  衰: T('{d}這一塊，勢頭在往回收。', '盛極而衰'),
  病: T('{d}這一塊，力氣見底。硬拚必輸。', '衰之甚'),
  死: T('{d}這一塊，舊勁用完了。別硬撐。', '氣之盡而無餘'),
  墓: T('{d}這一塊，我要你藏好實力。別一次打光。', '又曰庫，造化收藏'),
  絕: T('{d}這一塊，舊路斷了。新路在前。', '前之氣已絕，後之氣將續'),
  胎: T('{d}這一塊，新局在暗處成形。', '後之氣續而結聚成胎'),
  養: T('{d}這一塊，你還在長本事。刀未出鞘。', '如人養母腹（成形）'),
};`;
  if (!s.includes(oldStage)) { console.error('stage block mismatch'); process.exit(1); }
  s = s.replace(oldStage, newStage);

  // A: palace aliases into PALACE_VERSE_FORBIDDEN_TERMS
  const oldForb = `  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '僕役', '奴僕', '官祿', '田宅', '福德', '父母',
])];`;
  const newForb = `  '命宮', '身宮', '兄弟', '兄弟宮', '夫妻', '夫妻宮', '子女', '子女宮', '財帛', '財帛宮', '疾厄', '疾厄宮',
  '遷移', '遷移宮', '交友', '交友宮', '朋友宮', '僕役', '僕役宮', '奴僕', '奴僕宮', '官祿', '官祿宮', '事業', '事業宮',
  '田宅', '田宅宮', '家宅', '福德', '福德宮', '父母', '父母宮',
])];`;
  if (!s.includes(oldForb)) { console.error('forbidden list mismatch'); process.exit(1); }
  s = s.replace(oldForb, newForb);

  // Export alias list for tests
  if (!s.includes('export const PALACE_NAME_ALIASES')) {
    s = s.replace(
      'export const PALACE_VERSE_FORBIDDEN_TERMS',
      `/** 宮名／常見別名（禁出現在領域詞與戰痕句）。 */\nexport const PALACE_NAME_ALIASES: readonly string[] = [\n  '命宮', '身宮', '兄弟', '兄弟宮', '夫妻', '夫妻宮', '子女', '子女宮', '財帛', '財帛宮', '疾厄', '疾厄宮',\n  '遷移', '遷移宮', '交友', '交友宮', '朋友宮', '僕役', '僕役宮', '奴僕', '奴僕宮', '官祿', '官祿宮', '事業', '事業宮',\n  '田宅', '田宅宮', '家宅', '福德', '福德宮', '父母', '父母宮',\n] as const;\n\nexport const PALACE_VERSE_FORBIDDEN_TERMS`
    );
    // Also ensure forbidden list still has them (already added above) - the export is separate documentation+test helper
  }

  // B: pinnedSummary
  const oldPin = `  if (r && nominal !== null) {
    const x = r[1] - nominal;
    return x <= 0 ? \`\${who}你今年 \${viewer.age} 歲，這段今年收尾\` : \`\${who}你今年 \${viewer.age} 歲，這段還剩 \${x} 年\`;
  }
  return \`\${who}你今年 \${viewer.age} 歲\`;`;
  const newPin = `  if (r && nominal !== null) {
    const x = r[1] - nominal;
    const ageBit = \`你今年虛歲 \${nominal}（實歲 \${viewer.age}）\`;
    return x <= 0 ? \`\${who}\${ageBit}，這段今年收尾\` : \`\${who}\${ageBit}，這段還剩 \${x} 年\`;
  }
  return \`\${who}你今年實歲 \${viewer.age} 歲\`;`;
  if (!s.includes(oldPin)) { console.error('pin block missing'); process.exit(1); }
  s = s.replace(oldPin, newPin);

  // B: opening past/future label 虛歲; ageLabel; viewerLine; headlinePrefix; decreeAnchors
  s = s.replace(
    `  過去: '你 {from}–{to} 歲走過這段，落在{d}。',
  現在: '{name}{left}',
  未來: '再過 {wait} 年，你 {from} 歲進這段，落在{d}。',`,
    `  過去: '你虛歲 {from}–{to} 走過這段，落在{d}。',
  現在: '{name}{left}',
  未來: '再過 {wait} 年，你虛歲 {from} 進這段，落在{d}。',`
  );

  s = s.replace(
    "const headlinePrefix = (from: number): string => `${from} 歲起，`;",
    "const headlinePrefix = (from: number): string => `虛歲${from}起，`;"
  );

  // ageLabel in buildAgeTimelineServer
  if (!s.includes('約虛歲 ${from}–${to}')) {
    s = s.replace(/ageLabel: `約 \$\{from\}–\$\{to\} 歲`/g, 'ageLabel: `約虛歲 ${from}–${to}`');
    s = s.replace(/ageLabel: `約 \$\{from\}–\$\{to\} 歲`/g, 'ageLabel: `約虛歲 ${from}–${to}`');
  }
  // premiumTitles ageLabel too
  s = s.replace(/ageLabel: `約 \$\{from\}–\$\{to\} 歲`, phrase:/g, 'ageLabel: `約虛歲 ${from}–${to}`, phrase:');

  // viewerLine
  const oldVL = `  const ageText = age !== null ? \`你今年 \${age} 歲（虛歲 \${nominalAge}）\` : \`你今年虛歲 \${nominalAge}\`;
  const viewerLine = \`\${who}\${ageText}。\`;`;
  const newVL = `  const ageText = age !== null ? \`你今年虛歲 \${nominalAge}（實歲 \${age}）\` : \`你今年虛歲 \${nominalAge}\`;
  const viewerLine = \`\${who}\${ageText}。\`;`;
  if (!s.includes(oldVL)) { console.error('viewerLine block missing', s.includes('你今年 ${age} 歲（虛歲')); process.exit(1); }
  s = s.replace(oldVL, newVL);

  // decreeAnchors labels use 虛歲
  const oldAt = `    const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  const at = (i: number, focus: AsuraDecreeAnchor['focus']): AsuraDecreeAnchor => {
    const seg = timeline.segments[i];
    const r = parseAgeLabel(seg.ageLabel);
    const ageRange = r ? \`\${r[0]}–\${r[1]}\` : seg.ageLabel;
    const mark: AsuraDecreeAnchor['mark'] = seg.tense === '過去' ? '走過' : seg.tense === '未來' ? '下一段' : focus === 'action' ? '現在就做' : '現在';
    const label =
      mark === '走過' ? \`你 \${ageRange} 歲・走過的路\`
      : mark === '下一段' ? \`你 \${r ? r[0] : ageRange} 歲起・下一段\`
      : age !== null ? \`你今年 \${age} 歲・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : \`你 \${ageRange} 歲・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`;`;
  const newAt = `    const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  const nominal = viewer && typeof viewer.nominalAge === 'number' ? viewer.nominalAge : null;
  const at = (i: number, focus: AsuraDecreeAnchor['focus']): AsuraDecreeAnchor => {
    const seg = timeline.segments[i];
    const r = parseAgeLabel(seg.ageLabel);
    const ageRange = r ? \`\${r[0]}–\${r[1]}\` : seg.ageLabel;
    const mark: AsuraDecreeAnchor['mark'] = seg.tense === '過去' ? '走過' : seg.tense === '未來' ? '下一段' : focus === 'action' ? '現在就做' : '現在';
    const label =
      mark === '走過' ? \`你虛歲 \${ageRange}・走過的路\`
      : mark === '下一段' ? \`你虛歲 \${r ? r[0] : ageRange} 起・下一段\`
      : nominal !== null ? \`你今年虛歲 \${nominal}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : age !== null ? \`你今年實歲 \${age}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : \`你虛歲 \${ageRange}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`;`;
  if (!s.includes("mark === '走過' ? `你 ${ageRange} 歲・走過的路`")) { console.error('anchor labels missing'); process.exit(1); }
  s = s.replace(oldAt, newAt);

  // opening headline strip for actionFocus still uses /^\d+\s*歲起，/ — update for 虛歲N起，
  s = s.replace(
    "const body = seg.opening.headline.replace(/^\\d+\\s*歲起，/, '');",
    "const body = seg.opening.headline.replace(/^(?:虛歲)?\\d+\\s*(?:歲)?起，/, '');"
  );

  const after = decreeBodies(s);
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    console.error('DECREE CHANGED');
    process.exit(1);
  }
  write('lib/server/ghost-asura-translation-layer.ts', s);
  console.log('OK translation-layer');
}

// contract comments briefly
{
  let s = read('lib/ghost-asura-display-contract.ts');
  s = s.replace(/例「你今年 52 歲，這段還剩 1 年」／「…這段今年收尾」；\n   \* 有姓名時前綴「\{姓名\}，」。N＝實歲，X＝止歲虛歲−今日虛歲；無實歲＝null。前端只照印。/,
    '例「你今年虛歲 53（實歲 52），這段今年收尾」；大限與剩餘年皆以虛歲計，實歲僅對照。\n   * 有姓名時前綴「{姓名}，」。無實歲＝null。前端只照印。');
  s = s.replace(/例「你今年 52 歲（虛歲 53）。」；不重複大限 A–B 歲距（歲距改由 pinnedSummary 報剩餘年）。/,
    '例「你今年虛歲 53（實歲 52）。」；不重複大限 A–B（歲距／剩餘年見 pinnedSummary，皆虛歲制）。');
  write('lib/ghost-asura-display-contract.ts', s);
  console.log('OK contract');
}

console.log('core done');
