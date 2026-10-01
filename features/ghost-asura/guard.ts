/**
 * 鬼魅阿修羅 — 完整度檢核
 *
 * 筆數一致 ＋ 唯一編號集合一致（不能只比總數）。
 */

import type {
  GhostAsuraGuardReport,
  GhostAsuraTranslatedItem,
  GhostAsuraVerifiedRecord,
} from './types';

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    else seen.add(id);
  }
  return [...dup].sort();
}

export function guardCompleteness(input: {
  backend: GhostAsuraVerifiedRecord[];
  translated: GhostAsuraTranslatedItem[];
  /** 實際要呈現的項目（通常＝translated；畫面層不得自行 filter） */
  displayed: Array<{ resultId: string }>;
  expectedBatchId?: string;
}): GhostAsuraGuardReport {
  const details: string[] = [];
  const backendIds = input.backend.map((row) => row.resultId);
  const translatedIds = input.translated.map((row) => row.resultId);
  const displayIds = input.displayed.map((row) => row.resultId);

  const backendUnique = uniqueSorted(backendIds);
  const translatedUnique = uniqueSorted(translatedIds);
  const displayUnique = uniqueSorted(displayIds);

  const duplicateIds = uniqueSorted([
    ...findDuplicates(backendIds),
    ...findDuplicates(translatedIds),
    ...findDuplicates(displayIds),
  ]);

  const missingIds = backendUnique.filter(
    (id) => !displayUnique.includes(id) || !translatedUnique.includes(id)
  );
  const extraIds = uniqueSorted([
    ...translatedUnique.filter((id) => !backendUnique.includes(id)),
    ...displayUnique.filter((id) => !backendUnique.includes(id)),
  ]);

  const pendingCount = input.translated.filter(
    (row) => row.sealStatus === 'pending'
  ).length;

  let status: 'PASSED' | 'FAILED' = 'PASSED';

  if (input.backend.length !== input.translated.length) {
    status = 'FAILED';
    details.push(
      `筆數不一致：backend=${input.backend.length} translated=${input.translated.length}`
    );
  }
  if (input.translated.length !== input.displayed.length) {
    status = 'FAILED';
    details.push(
      `筆數不一致：translated=${input.translated.length} displayed=${input.displayed.length}`
    );
  }

  if (backendUnique.join('|') !== translatedUnique.join('|')) {
    status = 'FAILED';
    details.push('後端編號集合 ≠ 轉譯編號集合');
  }
  if (translatedUnique.join('|') !== displayUnique.join('|')) {
    status = 'FAILED';
    details.push('轉譯編號集合 ≠ 畫面編號集合');
  }

  if (duplicateIds.length) {
    status = 'FAILED';
    details.push(`重複編號：${duplicateIds.join(',')}`);
  }
  if (missingIds.length) {
    status = 'FAILED';
    details.push(`缺漏編號：${missingIds.join(',')}`);
  }
  if (extraIds.length) {
    status = 'FAILED';
    details.push(`多餘編號：${extraIds.join(',')}`);
  }

  // 原始事實不可變：matched／originalName／pillars 必須對得上
  for (const backend of input.backend) {
    const translated = input.translated.find(
      (row) => row.resultId === backend.resultId
    );
    if (!translated) continue;
    if (translated.originalName !== backend.originalName) {
      status = 'FAILED';
      details.push(`原始名稱被改寫：${backend.resultId}`);
    }
    if (translated.matched !== backend.matched) {
      status = 'FAILED';
      details.push(`命中狀態被改寫：${backend.resultId}`);
    }
    const pillarA = [...backend.pillars].sort().join(',');
    const pillarB = [...translated.pillars].sort().join(',');
    if (pillarA !== pillarB) {
      status = 'FAILED';
      details.push(`柱位被改寫：${backend.resultId}`);
    }
    if (
      input.expectedBatchId &&
      (backend.resultBatchId !== input.expectedBatchId ||
        translated.resultBatchId !== input.expectedBatchId)
    ) {
      status = 'FAILED';
      details.push(`結果批次不一致：${backend.resultId}`);
    }
  }

  // 待校核不得假裝 PASSED（正式完成狀態）
  if (pendingCount > 0) {
    status = 'FAILED';
    details.push(`尚有 ${pendingCount} 筆待校核，正式狀態維持 FAILED`);
  }

  const message =
    status === 'PASSED'
      ? `GHOST_ASURA_COMPLETE: ${backendUnique.length} 筆三端一致`
      : `GHOST_ASURA_INCOMPLETE: ${details[0] ?? '完整度失敗'}`;

  return {
    status,
    backendCount: input.backend.length,
    translatedCount: input.translated.length,
    displayCount: input.displayed.length,
    backendIds: backendUnique,
    translatedIds: translatedUnique,
    displayIds: displayUnique,
    missingIds,
    extraIds,
    duplicateIds,
    pendingCount,
    message,
    details,
  };
}

/** §十二 關鍵案：集合相等比較 */
export function assertIdSetsEqual(
  a: string[],
  b: string[],
  label: string
): { ok: boolean; message: string } {
  const left = uniqueSorted(a);
  const right = uniqueSorted(b);
  if (left.join('|') === right.join('|')) {
    return { ok: true, message: `${label}: equal (${left.length})` };
  }
  return {
    ok: false,
    message: `${label}: mismatch left=${left.join(',')} right=${right.join(',')}`,
  };
}
