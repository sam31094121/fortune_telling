const fs = require('fs');
const root = process.argv[2];

function read(rel) { return fs.readFileSync(root + '/' + rel, 'utf8'); }
function write(rel, s) { fs.writeFileSync(root + '/' + rel, s); }

// ─── capture TIMELINE_DECREE bodies ───
function decreeBodies(s) {
  return [...s.matchAll(/key: '(opening|sandbox|tactics|closing)', heading: '[^']+', body: '([^']*)'/g)].map(m => m[1] + '::' + m[2]);
}

// ═══════════════════════════════════════
// translation-layer.ts
// ═══════════════════════════════════════
{
  let s = read('lib/server/ghost-asura-translation-layer.ts');
  const beforeDecree = decreeBodies(s);
  if (beforeDecree.length !== 4) { console.error('decree bodies', beforeDecree); process.exit(1); }

  // (4) 墓 stage line
  s = s.replace(
    "墓: T('{d}，我把你的鋒芒收進庫裡。', '又曰庫，造化收藏'),",
    "墓: T('{d}，我要你先把實力藏好，別急著打光。', '又曰庫，造化收藏'),"
  );
  if (!s.includes("我要你先把實力藏好，別急著打光")) { console.error('墓 rewrite failed'); process.exit(1); }

  // (4) plain-domain mapping for jargon (derived from existing 白話領域 meanings only)
  const oldDomain = `export const PALACE_VERSE_DOMAIN: Readonly<Record<string, string>> = {
  MING: '你自己',
  XIONG_DI: '同袍',
  FU_QI: '枕邊人',
  ZI_NV: '晚輩',
  CAI_BO: '錢袋',
  JI_E: '這副身子',
  QIAN_YI: '出外的路',
  JIAO_YOU: '身邊人馬',
  GUAN_LU: '戰功',
  TIAN_ZHAI: '家門',
  FU_DE: '心氣',
  FU_MU: '上一代',
};`;
  const newDomain = `export const PALACE_VERSE_DOMAIN: Readonly<Record<string, string>> = {
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
  if (!s.includes(oldDomain)) { console.error('domain block mismatch'); process.exit(1); }
  s = s.replace(oldDomain, newDomain);

  // AgeTimelineViewer + nominalAge
  s = s.replace(
    'export interface AgeTimelineViewer { name: string | null; age: number | null }',
    'export interface AgeTimelineViewer { name: string | null; age: number | null; /** 今日虛歲（大限制）；pinnedSummary 剩餘年用 */ nominalAge?: number | null }'
  );

  // (1) buildPinnedSummary
  const oldPin = `/** 置頂摘要（display.pinnedSummary）：由 viewer 實歲＋現在段起訖歲組成；有姓名則前綴。無實歲＝null。 */
export function buildPinnedSummary(timeline: AsuraAgeTimeline | null | undefined, viewer: AgeTimelineViewer | null = null): string | null {
  if (!viewer || typeof viewer.age !== 'number') return null;
  const who = viewer.name ? \`\${viewer.name}，\` : '';
  const cur = timeline?.segments?.find((s) => s.isCurrent);
  const r = cur ? parseAgeLabel(cur.ageLabel) : null;
  return r ? \`\${who}你今年 \${viewer.age} 歲，正走在 \${r[0]}–\${r[1]} 歲這段\` : \`\${who}你今年 \${viewer.age} 歲\`;
}`;
  const newPin = `/** 置頂摘要（display.pinnedSummary）：「{名，}你今年 N 歲，這段還剩 X 年」；N＝實歲，X＝止歲虛歲−今日虛歲（≤0＝這段今年收尾）。無實歲＝null。 */
export function buildPinnedSummary(timeline: AsuraAgeTimeline | null | undefined, viewer: AgeTimelineViewer | null = null): string | null {
  if (!viewer || typeof viewer.age !== 'number') return null;
  const who = viewer.name ? \`\${viewer.name}，\` : '';
  const cur = timeline?.segments?.find((s) => s.isCurrent);
  const r = cur ? parseAgeLabel(cur.ageLabel) : null;
  const nominal = typeof viewer.nominalAge === 'number' ? viewer.nominalAge : null;
  if (r && nominal !== null) {
    const x = r[1] - nominal;
    return x <= 0 ? \`\${who}你今年 \${viewer.age} 歲，這段今年收尾\` : \`\${who}你今年 \${viewer.age} 歲，這段還剩 \${x} 年\`;
  }
  return \`\${who}你今年 \${viewer.age} 歲\`;
}`;
  if (!s.includes('正走在 ${r[0]}–${r[1]} 歲這段')) { console.error('old pin form missing'); process.exit(1); }
  s = s.replace(oldPin, newPin);

  // (2) 現在 opening drops 落在{d}
  const oldOpen = `export const AGE_OPENING_POSITION: Readonly<Record<'過去' | '現在' | '未來', string>> = {
  過去: '你 {from}–{to} 歲走過這段，落在{d}。',
  現在: '{name}你今年虛歲 {n}，正走在這段，落在{d}；{left}',
  未來: '再過 {wait} 年，你 {from} 歲進這段，落在{d}。',
};
/** 現在段剩餘年數句：本段止歲＝今年虛歲→最後一年；否則還有幾年。 */
const leftLine = (to: number, n: number): string => (to - n <= 0 ? '今年是這段最後一年。' : \`這段還有 \${to - n} 年。\`);`;
  const newOpen = `export const AGE_OPENING_POSITION: Readonly<Record<'過去' | '現在' | '未來', string>> = {
  過去: '你 {from}–{to} 歲走過這段，落在{d}。',
  現在: '{name}{left}',
  未來: '再過 {wait} 年，你 {from} 歲進這段，落在{d}。',
};
/** 現在段剩餘年數句（口語收尾）：止歲虛歲−今日虛歲≤0→今年收尾；否則還有幾年。 */
const leftLine = (to: number, n: number): string => (to - n <= 0 ? '今年是這段最後一年，收尾要穩。' : \`這段還有 \${to - n} 年，一步步走穩。\`);`;
  if (!s.includes(oldOpen)) { console.error('opening block mismatch'); process.exit(1); }
  s = s.replace(oldOpen, newOpen);

  // (3) dedupeHookTails helper + use in buildAgeTimelineServer
  if (!s.includes('function dedupeSegmentHookTails')) {
    const helper = `/** 段內去重 hook 套語尾（AGE_HOOK_TO_HISTORY／AGE_HOOK_TO_ACTION）；已用過則改抽池中未用句，池盡則去掉套語尾。 */
function dedupeSegmentHookTails<T extends { basis: { text: string; hook: string }; history: { text: string; source: string; hook: string } | null; action: string[]; close: string }>(depth: T[]): T[] {
  const stock = [...AGE_HOOK_TO_HISTORY, ...AGE_HOOK_TO_ACTION];
  const used = new Set<string>();
  const fix = (hook: string): string => {
    const tail = stock.find((t) => hook.endsWith(t));
    if (!tail) return hook;
    if (!used.has(tail)) { used.add(tail); return hook; }
    const pool = (AGE_HOOK_TO_HISTORY as readonly string[]).includes(tail) ? AGE_HOOK_TO_HISTORY : AGE_HOOK_TO_ACTION;
    const alt = pool.find((t) => !used.has(t));
    if (!alt) return hook.slice(0, Math.max(0, hook.length - tail.length)).replace(/[。．]$/, '') + (hook.slice(0, Math.max(0, hook.length - tail.length)).endsWith('。') ? '' : '。');
    used.add(alt);
    return hook.slice(0, hook.length - tail.length) + alt;
  };
  return depth.map((d) => ({
    ...d,
    basis: { ...d.basis, hook: fix(d.basis.hook) },
    history: d.history ? { ...d.history, hook: fix(d.history.hook) } : null,
    action: [...d.action],
  }));
}

`;
    s = s.replace(
      'export function buildAgeTimelineServer(',
      helper + 'export function buildAgeTimelineServer('
    );
  }

  // depth line: wrap with dedupe
  const oldDepth = `      depth: rows.map((row) => ({ basis: { ...row!.depth.basis }, history: row!.depth.history ? { ...row!.depth.history } : null, action: [...row!.depth.action], close: row!.depth.close })),`;
  const newDepth = `      depth: dedupeSegmentHookTails(rows.map((row) => ({ basis: { ...row!.depth.basis }, history: row!.depth.history ? { ...row!.depth.history } : null, action: [...row!.depth.action], close: row!.depth.close }))),`;
  if (!s.includes(oldDepth)) { console.error('depth map line missing'); process.exit(1); }
  s = s.replace(oldDepth, newDepth);

  // (1) viewerLine without A–B range
  const oldVL = `  const viewerLine = curSeg >= 0 ? \`\${who}\${ageText}，正走在 \${ranges[curSeg][0]}–\${ranges[curSeg][1]} 歲這段。\` : \`\${who}\${ageText}。\`;`;
  const newVL = `  const viewerLine = \`\${who}\${ageText}。\`;`;
  if (!s.includes('正走在 ${ranges[curSeg][0]}–${ranges[curSeg][1]} 歲這段')) { console.error('viewerLine form missing'); process.exit(1); }
  s = s.replace(oldVL, newVL);

  // Pass nominalAge into viewer when building from buildAgeTimelineServer - the viewer param may lack it; merge:
  // At start of buildAgeTimelineServer, effective viewer already has name/age; ensure pinnedSummary callers pass nominalAge.
  // Also fix: when buildAgeTimeline is called with viewer, merge nominalAge for any downstream - not needed inside server.
  // Export remainingYears helper? skip.

  const afterDecree = decreeBodies(s);
  if (JSON.stringify(afterDecree) !== JSON.stringify(beforeDecree)) {
    console.error('TIMELINE_DECREE CHANGED');
    console.error(beforeDecree);
    console.error(afterDecree);
    process.exit(1);
  }
  write('lib/server/ghost-asura-translation-layer.ts', s);
  console.log('OK translation-layer');
}

// ═══════════════════════════════════════
// display.ts — (5) targetName + nominalAge for pinnedSummary
// ═══════════════════════════════════════
{
  let s = read('lib/server/ghost-asura-display.ts');
  const oldTN = `  const targetName = typeof engineInput.name === 'string' && engineInput.name.trim().length >= 2 ? engineInput.name.trim() : null;`;
  const newTN = `  const targetName = sanitizeViewerName(engineInput.name);`;
  if (!s.includes(oldTN)) { console.error('targetName line missing'); process.exit(1); }
  s = s.replace(oldTN, newTN);

  // enrich viewer with nominalAge before ageTimelineFields
  // computeAgeTimeline already has nominal — change it to accept/merge, or enrich in ageTimelineFields via viewerLine parse.
  const oldFields = `function ageTimelineFields(ageTimeline: AsuraDisplay['ageTimeline'], viewer: AgeTimelineViewer | null = null): Pick<AsuraDisplay, 'ageTimeline' | 'decreeAnchors' | 'pinnedSummary'> {
  return {
    ageTimeline: ageTimeline ?? null,
    decreeAnchors: buildDecreeAnchors(ageTimeline, viewer),
    pinnedSummary: buildPinnedSummary(ageTimeline, viewer),
  };
}`;
  const newFields = `function ageTimelineFields(ageTimeline: AsuraDisplay['ageTimeline'], viewer: AgeTimelineViewer | null = null): Pick<AsuraDisplay, 'ageTimeline' | 'decreeAnchors' | 'pinnedSummary'> {
  const enriched: AgeTimelineViewer | null = viewer && ageTimeline?.viewerLine
    ? { ...viewer, nominalAge: viewer.nominalAge ?? (/(?:虛歲)\\s*(\\d+)/.exec(ageTimeline.viewerLine) ? Number(/(?:虛歲)\\s*(\\d+)/.exec(ageTimeline.viewerLine)![1]) : null) }
    : viewer;
  return {
    ageTimeline: ageTimeline ?? null,
    decreeAnchors: buildDecreeAnchors(ageTimeline, enriched),
    pinnedSummary: buildPinnedSummary(ageTimeline, enriched),
  };
}`;
  if (!s.includes(oldFields)) { console.error('ageTimelineFields missing'); process.exit(1); }
  s = s.replace(oldFields, newFields);

  // Also pass nominalAge from computeAgeTimeline into buildAgeTimeline viewer
  const oldCTA = `    return buildAgeTimeline(cells, nowLunarYear - birthLunarYear + 1, { name: sanitizeViewerName(viewerName), age });`;
  const newCTA = `    const nominalAge = nowLunarYear - birthLunarYear + 1;
    return buildAgeTimeline(cells, nominalAge, { name: sanitizeViewerName(viewerName), age, nominalAge });`;
  if (!s.includes(oldCTA)) { console.error('computeAgeTimeline return missing'); process.exit(1); }
  s = s.replace(oldCTA, newCTA);

  write('lib/server/ghost-asura-display.ts', s);
  console.log('OK display');
}

// ═══════════════════════════════════════
// display-contract comments (pinnedSummary / opening docs)
// ═══════════════════════════════════════
{
  let s = read('lib/ghost-asura-display-contract.ts');
  s = s.replace(
    /置頂摘要（新增欄位，只增不改；舊資料無此欄＝不畫）：一句個人定位，例「你今年 52 歲，正走在 44–53 歲這段」；\n   \* 有姓名時前綴「\{姓名\}，」。由 viewer 實歲＋現在段起訖歲組成；無實歲＝null。前端只照印。/,
    '置頂摘要（新增欄位，只增不改；舊資料無此欄＝不畫）：例「你今年 52 歲，這段還剩 1 年」／「…這段今年收尾」；\n   * 有姓名時前綴「{姓名}，」。N＝實歲，X＝止歲虛歲−今日虛歲；無實歲＝null。前端只照印。'
  );
  s = s.replace(
    /過去「你 34–43 歲走過這段，落在家門。」；現在「\{姓名，\}你今年虛歲 53，正走在這段，落在戰功；今年是這段最後一年。」；\n   \* 未來「再過 1 年，你 54 歲進這段，落在身邊人馬。」/,
    '過去「你 34–43 歲走過這段，落在家門。」；現在「{姓名，}今年是這段最後一年，收尾要穩。」（不落領域詞）；\n   * 未來「再過 1 年，你 54 歲進這段，落在身邊的人。」'
  );
  s = s.replace(
    /客人本人一句（後端代入，放在「你現在在這段」列下）：例「你今年 52 歲（虛歲 53），正走在 44–53 歲這段。」；\n   \* 有姓名時前綴「\{姓名\}，」。無現在段＝只報年齡。/,
    '客人本人一句（後端代入）：例「你今年 52 歲（虛歲 53）。」；不重複大限 A–B 歲距（歲距改由 pinnedSummary 報剩餘年）。\n   * 有姓名時前綴「{姓名}，」。'
  );
  write('lib/ghost-asura-display-contract.ts', s);
  console.log('OK contract');
}

console.log('core patches done');
