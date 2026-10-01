/**
 * 080-14｜同一份 reading 在 360／768／1440 口徑下編號集合一致
 *
 * 附件 3：手機／平板／電腦共用同一份已核可結果，不各自運算。
 * 本測試鎖定「同一 reading 物件」跨寬度呈現契約（不重算）。
 */

import assert from 'assert';
import { buildGhostAsuraReading } from '../features/ghost-asura/index.ts';

function record(partial) {
  return {
    resultId: partial.resultId,
    ruleId: partial.ruleId ?? partial.resultId,
    originalName: partial.originalName,
    matched: partial.matched,
    pillars: partial.pillars ?? [],
    resultBatchId: 'VIEWPORT_BATCH',
    motherVersion: 'VIEWPORT_MOTHER',
    backendStatus: partial.matched ? 'MATCHED' : 'NOT_MATCHED',
  };
}

const records = [
  record({ resultId: 'wugui', originalName: '五鬼', matched: true, pillars: ['year', 'day'] }),
  record({ resultId: 'yima', originalName: '驛馬', matched: false, pillars: [] }),
  record({ resultId: 'zaisha', originalName: '災煞', matched: true, pillars: ['hour'] }),
];

const reading = buildGhostAsuraReading({ records, resultBatchId: 'VIEWPORT_BATCH' });

const widths = [360, 768, 1440];
const snapshots = widths.map((width) => {
  // 模擬各寬度只讀同一 reading，禁止依寬度 filter／slice
  const renderedIds = reading.items.map((item) => item.resultId);
  const renderedNames = reading.items.map((item) => item.displayName);
  const renderedStatus = reading.items.map((item) => item.sealStatus);
  assert.strictEqual(renderedIds.length, reading.items.length, `${width}px 不得少項`);
  return { width, renderedIds, renderedNames, renderedStatus, batch: reading.resultBatchId };
});

for (let i = 1; i < snapshots.length; i++) {
  assert.deepStrictEqual(snapshots[i].renderedIds, snapshots[0].renderedIds);
  assert.deepStrictEqual(snapshots[i].renderedNames, snapshots[0].renderedNames);
  assert.deepStrictEqual(snapshots[i].renderedStatus, snapshots[0].renderedStatus);
  assert.strictEqual(snapshots[i].batch, snapshots[0].batch);
}

console.log('✅ 360／768／1440 同資料編號／名稱／狀態一致');
console.log(JSON.stringify({
  widths,
  count: reading.items.length,
  ids: snapshots[0].renderedIds,
  names: snapshots[0].renderedNames,
  statuses: snapshots[0].renderedStatus,
}, null, 2));
