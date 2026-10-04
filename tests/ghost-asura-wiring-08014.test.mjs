/**
 * 080-14｜鬼魅阿修羅解盤接線完整度（附件 3 §十二）
 *
 * 涵蓋：筆數＋唯一編號集合、狀態三分、舊批次、多柱、合成 200+、無隨機。
 */

import assert from 'assert';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadFeature() {
  // TypeScript via Node strip-types
  const mod = await import(
    pathToFileURL(path.join(root, 'features/ghost-asura/index.ts')).href
  );
  return mod;
}

function record(partial) {
  return {
    resultId: partial.resultId,
    ruleId: partial.ruleId ?? partial.resultId,
    originalName: partial.originalName,
    matched: partial.matched,
    pillars: partial.pillars ?? [],
    resultBatchId: partial.resultBatchId ?? 'BATCH_A',
    motherVersion: partial.motherVersion ?? 'TEST_MOTHER',
    backendStatus:
      partial.backendStatus ??
      (partial.matched === true
        ? 'MATCHED'
        : partial.matched === false
          ? 'NOT_MATCHED'
          : 'BLOCKED_DATA'),
    reason: partial.reason,
  };
}

const baseRecords = [
  record({
    resultId: 'wugui',
    originalName: '五鬼',
    matched: true,
    pillars: ['year', 'day'],
  }),
  record({
    resultId: 'tiangou',
    originalName: '天狗',
    matched: true,
    pillars: ['month'],
  }),
  record({
    resultId: 'yima',
    originalName: '驛馬',
    matched: false,
    pillars: [],
  }),
  record({
    resultId: 'zaisha',
    originalName: '災煞',
    matched: true,
    pillars: ['hour'],
  }),
];

console.log('🔍 080-14 鬼魅阿修羅解盤接線測試');

const {
  buildGhostAsuraReading,
  guardCompleteness,
  translateVerifiedRecords,
  assertIdSetsEqual,
  countApprovedSeedDisplayNames,
  GHOST_ASURA_UI,
  APPROVED_BY_ORIGINAL_NAME,
} = await loadFeature();

// ── 0. 母種 51 ──
console.log('\n【0】固定名稱母種計數');
const seedCount = countApprovedSeedDisplayNames();
assert.ok(seedCount >= 51, `母種 displayName 應 ≥ 51，實際 ${seedCount}`);
assert.strictEqual(APPROVED_BY_ORIGINAL_NAME['天煞'].displayName, '逆風破局');
console.log(`✓ 母種 displayName ${seedCount}；本頁直白稱號=逆風破局，原始名稱不變`);

// ── 1. 正常完整結果 ──
console.log('\n【1】正常完整結果');
{
  const reading = buildGhostAsuraReading({ records: baseRecords, resultBatchId: 'BATCH_A' });
  assert.strictEqual(reading.items.length, baseRecords.length);
  assert.strictEqual(reading.guard.backendCount, 4);
  assert.strictEqual(reading.guard.translatedCount, 4);
  assert.strictEqual(reading.guard.displayCount, 4);
  const ids = assertIdSetsEqual(
    reading.guard.backendIds,
    reading.guard.displayIds,
    'backend=display'
  );
  assert.ok(ids.ok, ids.message);
  assert.strictEqual(reading.awakenedCount, 3);
  assert.strictEqual(reading.dormantCount, 1);
  assert.strictEqual(reading.pendingCount, 0);
  // 多柱保留
  const wugui = reading.items.find((item) => item.resultId === 'wugui');
  assert.ok(wugui.pillarLabels.length === 2);
  assert.ok(wugui.pillarLabels.some((label) => label.includes('年柱')));
  assert.ok(wugui.pillarLabels.some((label) => label.includes('日柱')));
  assert.strictEqual(wugui.displayName, '五陰纏影');
  assert.strictEqual(wugui.sealStatus, 'awakened');
  assert.ok(!JSON.stringify(reading).includes('Math.random'));
  console.log('✓', reading.guard.message);
}

// ── 2. 少一項 ──
console.log('\n【2】少一項');
{
  const translated = translateVerifiedRecords(baseRecords).slice(0, 3);
  const report = guardCompleteness({
    backend: baseRecords,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.missingIds.includes('zaisha'));
  console.log('✓', report.message);
}

// ── 3. 多一項 ──
console.log('\n【3】多一項');
{
  const translated = [
    ...translateVerifiedRecords(baseRecords),
    ...translateVerifiedRecords([
      record({ resultId: 'extra', originalName: '五鬼', matched: true, pillars: ['year'] }),
    ]),
  ];
  // 故意讓 displayed 跟著多
  const report = guardCompleteness({
    backend: baseRecords,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.extraIds.includes('extra'));
  console.log('✓', report.message);
}

// ── 4. 筆數相同但編號被替換 ──
console.log('\n【4】筆數相同但唯一編號被替換');
{
  const translated = translateVerifiedRecords([
    record({ resultId: 'wugui', originalName: '五鬼', matched: true, pillars: ['year'] }),
    record({ resultId: 'tiangou', originalName: '天狗', matched: true, pillars: ['month'] }),
    record({ resultId: 'yima', originalName: '驛馬', matched: false, pillars: [] }),
    record({ resultId: 'REPLACED', originalName: '災煞', matched: true, pillars: ['hour'] }),
  ]);
  const report = guardCompleteness({
    backend: baseRecords,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.missingIds.includes('zaisha') || report.extraIds.includes('REPLACED'));
  console.log('✓', report.message);
}

// ── 5. 重複編號 ──
console.log('\n【5】重複編號');
{
  const dup = [
    ...baseRecords,
    record({ resultId: 'wugui', originalName: '五鬼', matched: true, pillars: ['year'] }),
  ];
  const translated = translateVerifiedRecords(dup);
  const report = guardCompleteness({
    backend: dup,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.duplicateIds.includes('wugui'));
  console.log('✓', report.message);
}

// ── 6. 命中被改寫 ──
console.log('\n【6】命中被改為未命中');
{
  const translated = translateVerifiedRecords(baseRecords).map((item) =>
    item.resultId === 'wugui' ? { ...item, matched: false, sealStatus: 'dormant' } : item
  );
  const report = guardCompleteness({
    backend: baseRecords,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.details.some((line) => line.includes('命中狀態被改寫')));
  console.log('✓', report.message);
}

// ── 7. 原始名稱／柱位被改寫 ──
console.log('\n【7】原始名稱或柱位被改寫');
{
  const translated = translateVerifiedRecords(baseRecords).map((item) =>
    item.resultId === 'wugui'
      ? { ...item, originalName: '被改寫', pillars: ['hour'] }
      : item
  );
  const report = guardCompleteness({
    backend: baseRecords,
    translated,
    displayed: translated,
  });
  assert.strictEqual(report.status, 'FAILED');
  console.log('✓', report.message);
}

// ── 8. 未驗證資料 ──
console.log('\n【8】未驗證／待校核');
{
  const reading = buildGhostAsuraReading({
    records: [
      record({
        resultId: 'yuanchen',
        originalName: '元辰',
        matched: null,
        backendStatus: 'BLOCKED_DATA',
      }),
    ],
  });
  assert.strictEqual(reading.items[0].sealStatus, 'pending');
  assert.strictEqual(reading.items[0].sealLabel, GHOST_ASURA_UI.sealPending);
  assert.strictEqual(reading.guard.status, 'FAILED');
  console.log('✓ 待校核不冒充沉眠');
}

// ── 9. 合法零項 vs 載入失敗 ──
console.log('\n【9】合法零項 vs 缺結果');
{
  const zero = buildGhostAsuraReading({ records: [], resultBatchId: 'EMPTY_OK' });
  assert.strictEqual(zero.items.length, 0);
  assert.strictEqual(zero.guard.status, 'PASSED');

  const missing = buildGhostAsuraReading({ result: null });
  assert.strictEqual(missing.guard.status, 'FAILED');
  assert.ok(missing.battleField.finalVerdict.includes('缺少') || missing.guard.message.includes('缺少'));
  console.log('✓ 零項合法；缺結果失敗');
}

// ── 10. 未登錄但已驗證 → 穩定延伸名（不得待核可標題）──
console.log('\n【10】未登錄已驗證 → 穩定延伸命名');
{
  const reading = buildGhostAsuraReading({
    records: [
      record({
        resultId: 'unknownStar',
        originalName: '未登錄神煞甲',
        matched: true,
        pillars: ['day'],
      }),
    ],
  });
  assert.strictEqual(reading.items[0].sealStatus, 'awakened');
  assert.ok(reading.items[0].displayName, '必須有阿修羅 displayName');
  assert.notStrictEqual(reading.items[0].displayName, '未登錄神煞甲');
  assert.notStrictEqual(reading.items[0].displayName, '（名稱待核可）');
  assert.strictEqual(reading.guard.status, 'PASSED');
  const again = buildGhostAsuraReading({
    records: [
      record({
        resultId: 'unknownStar',
        originalName: '未登錄神煞甲',
        matched: true,
        pillars: ['day'],
      }),
    ],
  });
  assert.strictEqual(again.items[0].displayName, reading.items[0].displayName);
  console.log('✓ 穩定延伸 → 覺醒 + PASSED + 重跑同名');
}

// ── 11. 相同資料重跑名稱一致 ──
console.log('\n【11】相同資料重跑名稱一致');
{
  const a = buildGhostAsuraReading({ records: baseRecords, resultBatchId: 'BATCH_A' });
  const b = buildGhostAsuraReading({ records: baseRecords, resultBatchId: 'BATCH_A' });
  assert.deepStrictEqual(
    a.items.map((item) => [item.resultId, item.displayName, item.sealStatus]),
    b.items.map((item) => [item.resultId, item.displayName, item.sealStatus])
  );
  console.log('✓ 重跑一致');
}

// ── 12. 多柱命中完整保留（見案例 1）──
console.log('\n【12】多柱命中完整保留');
console.log('✓ 見案例 1（五鬼 year+day）');

// ── 13. 合成 200+ 不截斷 ──
console.log('\n【13】合成 200+ 不截斷');
{
  const many = Array.from({ length: 220 }, (_, index) => {
    if (index < 4) return baseRecords[index];
    // 其餘用已核可名稱輪替，避免全部 pending
    const pool = [
      ['wugui', '五鬼'],
      ['yima', '驛馬'],
      ['zaisha', '災煞'],
      ['tiangou', '天狗'],
      ['longde', '龍德'],
    ];
    const [ruleId, name] = pool[index % pool.length];
    return record({
      resultId: `${ruleId}__${index}`,
      ruleId,
      originalName: name,
      matched: index % 3 !== 0,
      pillars: index % 3 !== 0 ? ['day'] : [],
    });
  });
  const reading = buildGhostAsuraReading({ records: many, resultBatchId: 'SYNTH_220' });
  assert.strictEqual(reading.items.length, 220);
  assert.strictEqual(reading.guard.displayCount, 220);
  assert.ok(!reading.items.some((item) => item === undefined));
  console.log(`✓ 合成 ${reading.items.length} 筆無截斷`);
}

// ── 14. 舊批次畫面配新批次必須失敗 ──
console.log('\n【14】舊批次配新批次');
{
  const translated = translateVerifiedRecords(baseRecords).map((item) => ({
    ...item,
    resultBatchId: 'BATCH_OLD',
  }));
  const report = guardCompleteness({
    backend: baseRecords.map((row) => ({ ...row, resultBatchId: 'BATCH_NEW' })),
    translated,
    displayed: translated,
    expectedBatchId: 'BATCH_NEW',
  });
  assert.strictEqual(report.status, 'FAILED');
  assert.ok(report.details.some((line) => line.includes('結果批次')));
  console.log('✓', report.message);
}

// ── 額外：無組合依據時不造雙印交鋒 ──
console.log('\n【額外】無組合依據不造雙印／不寫死戰局');
{
  const reading = buildGhostAsuraReading({ records: baseRecords, combos: [] });
  assert.strictEqual(reading.dualClashes.length, 0);
  assert.strictEqual(reading.chains.length, 0);
  assert.ok(reading.battleField.mainSoul !== '');
  // 有覺醒印時主戰魂應有值；無組合時宣判不假裝完整組合
  assert.ok(
    reading.battleField.finalVerdict.includes('連鎖尚未確認') ||
      reading.battleField.finalVerdict.includes('單印')
  );
  console.log('✓ 戰局有依據才填');
}

// ── 額外：有核可組合才出交鋒 ──
console.log('\n【額外】有核可組合 → 印記交鋒');
{
  const reading = buildGhostAsuraReading({
    records: baseRecords,
    combos: [
      {
        comboId: 'outer-waves',
        title: '外來的風浪',
        memberRuleIds: ['wugui', 'zaisha', 'tiangou'],
        memberNames: ['五鬼', '災煞', '天狗'],
        pillar: null,
        evidenceText: '五鬼、災煞、天狗一起出現：外在變數較多。',
      },
    ],
  });
  assert.ok(reading.chains.length >= 1);
  assert.ok(reading.chains[0].memberDisplayNames.includes('五陰纏影'));
  console.log('✓ 三印連鎖依組合依據輸出');
}

// ── 080-17：coverage 65 全量命名＋禁原始名外洩 ──
console.log('\n【080-17】coverage 65 全量＋使用者畫面零原始名');
{
  const { DUAL_SHENSHA_RULES } = await import(
    pathToFileURL(path.join(root, 'lib/dual-chart-iching-shensha.ts')).href
  );
  const coverageRecords = DUAL_SHENSHA_RULES.map(([id, name], index) =>
    record({
      resultId: id,
      ruleId: id,
      originalName: name,
      matched: index % 4 !== 0,
      pillars: index % 4 !== 0 ? ['day'] : [],
      resultBatchId: 'COV65',
    })
  );
  const reading = buildGhostAsuraReading({
    records: coverageRecords,
    resultBatchId: 'COV65',
  });
  assert.strictEqual(reading.items.length, 65);
  assert.strictEqual(reading.guard.status, 'PASSED', reading.guard.message);
  assert.ok(reading.items.every((item) => Boolean(item.displayName)));
  assert.ok(!reading.items.some((item) => item.displayName === '（名稱待核可）'));
  assert.ok(!reading.items.some((item) => item.displayName === '未知神煞'));
  assert.strictEqual(reading.pendingCount, 0);

  for (let i = 0; i < coverageRecords.length; i++) {
    const originalName = coverageRecords[i].originalName;
    const displayName = reading.items[i].displayName;
    assert.notStrictEqual(
      displayName,
      originalName,
      `${originalName} 不得原樣當主標題`
    );
  }

  const userFacing = JSON.stringify({
    items: reading.items.map((item) => ({
      displayName: item.displayName,
      sealLabel: item.sealLabel,
      shortDeclaration: item.shortDeclaration,
      coreMeaning: item.coreMeaning,
      battleSignificance: item.battleSignificance,
      verdict: item.verdict,
      pendingReason: item.pendingReason,
    })),
    pendingEntries: reading.pendingEntries,
    guardMessage: reading.guard.message,
  });
  assert.ok(!userFacing.includes('固定名稱未核可'));
  assert.ok(!userFacing.includes('名稱待核可'));
  assert.ok(!userFacing.includes('未知神煞'));
  // 禁止「固定名稱未核可：××」形態把原始名塞進提示
  assert.ok(!/未核可[:：]/.test(userFacing));
  console.log('✓ 65 項全有 displayName；guard PASSED；無原始名外洩提示');
}

console.log('\n【080-17】別名對齊＋缺名穩定延伸');
{
  const aliasReading = buildGhostAsuraReading({
    records: [
      record({ resultId: 'tiande', originalName: '天德貴人', matched: true, pillars: ['year'] }),
      record({ resultId: 'wenchang', originalName: '文昌', matched: true, pillars: ['month'] }),
      record({ resultId: 'tianyi', originalName: '天乙貴人', matched: true, pillars: ['day'] }),
      record({ resultId: 'taiji', originalName: '太極貴人', matched: true, pillars: ['hour'] }),
      record({ resultId: 'blankStar', originalName: '未知神煞', matched: true, pillars: ['day'] }),
    ],
    resultBatchId: 'ALIAS',
  });
  assert.strictEqual(aliasReading.items.find((i) => i.resultId === 'tiande').displayName, '天德護印');
  assert.strictEqual(aliasReading.items.find((i) => i.resultId === 'wenchang').displayName, '文魂天契');
  assert.strictEqual(aliasReading.items.find((i) => i.resultId === 'tianyi').displayName, '天乙神印');
  assert.strictEqual(aliasReading.items.find((i) => i.resultId === 'taiji').displayName, '玄極天印');
  const blank = aliasReading.items.find((i) => i.resultId === 'blankStar');
  assert.ok(blank.displayName);
  assert.notStrictEqual(blank.displayName, '未知神煞');
  assert.strictEqual(blank.sealStatus, 'awakened');
  assert.strictEqual(aliasReading.guard.status, 'PASSED');
  console.log('✓ 別名／缺名皆有阿修羅名且 PASSED');
}

console.log('\n✅ 080-14 §十二 關鍵案全部執行完畢');
