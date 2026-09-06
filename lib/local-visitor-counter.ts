import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  FEATURE_KEYS,
  VISITOR_MIN_DISPLAY_COUNT,
  VISITOR_SEED_COUNT,
  type FeatureKey,
} from '@/lib/visitor-counter';
import { resolveLocalDataDirectory } from '@/lib/local-data-directory';

const DATA_DIRECTORY = resolveLocalDataDirectory();
const COUNTERS_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.json');
const COUNTERS_BACKUP_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.backup.json');
const COUNTER_AUTO_INCREMENT_INTERVAL_MS = 18_000;

type StoredCounter = {
  displayCount: number;
  updatedAt: string;
  visitIds: string[];
};

type LocalCounterValue = number | Partial<StoredCounter>;
type LocalCounters = Partial<Record<FeatureKey, LocalCounterValue>>;
type NormalizedCounters = Record<FeatureKey, StoredCounter>;

let writeQueue = Promise.resolve();

function createInitialCounters(now = new Date()): NormalizedCounters {
  return Object.fromEntries(
    Object.values(FEATURE_KEYS).map((featureKey) => [
      featureKey,
      { displayCount: VISITOR_MIN_DISPLAY_COUNT, updatedAt: now.toISOString(), visitIds: [] },
    ]),
  ) as unknown as NormalizedCounters;
}

function normalizeCounterValue(value: LocalCounterValue | undefined, now: Date): StoredCounter {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= VISITOR_SEED_COUNT) {
    return { displayCount: Math.max(value, VISITOR_MIN_DISPLAY_COUNT), updatedAt: now.toISOString(), visitIds: [] };
  }

  if (!value || typeof value !== 'object') {
    return { displayCount: VISITOR_MIN_DISPLAY_COUNT, updatedAt: now.toISOString(), visitIds: [] };
  }

  const displayCount = value.displayCount;
  const updatedAt = value.updatedAt;
  const visitIds = Array.isArray(value.visitIds)
    ? Array.from(new Set(value.visitIds.filter((item): item is string => typeof item === 'string'))).slice(-5000)
    : [];

  if (
    typeof displayCount === 'number' &&
    Number.isSafeInteger(displayCount) &&
    displayCount >= VISITOR_SEED_COUNT &&
    typeof updatedAt === 'string' &&
    !Number.isNaN(Date.parse(updatedAt))
  ) {
    /*
      以 visitIds 為準，不以存下來的 displayCount 為準。

      原本取兩者較大值，代表一旦 displayCount 被灌到一百多萬，
      就算 visitIds 是空的也會永遠贏——改資料檔沒有用，
      跑著的伺服器會把記憶體裡那個數字寫回去。

      真相是「有幾個人來過」，那是數得出來的。
      彙總欄位只是快取，不該凌駕它所彙總的東西。
    */
    return { displayCount: visitIds.length, updatedAt, visitIds };
  }

  return { displayCount: visitIds.length, updatedAt: now.toISOString(), visitIds };
}

function projectCounter(counter: StoredCounter): StoredCounter {
  /*
    這裡原本會依「距離上次更新過了多久」自動把 displayCount 加上去。

    **這是在伺服器端憑空長流量**，比前端那條嚴重得多：
    前端的假心跳只影響那一個瀏覽器，這一條影響每一個人，
    而且會被寫回資料檔固化下來。放著不動它也會一直漲。

    專案鐵律是禁止作假。計數只在真的有人造訪時才變，
    所以這個函式現在原樣回傳。
  */
  return counter;
}

async function readCounters({ projectElapsed = true } = {}): Promise<NormalizedCounters> {
  const now = new Date();
  const initial = createInitialCounters(now);

  for (const filePath of [COUNTERS_BACKUP_FILE, COUNTERS_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      const stored = JSON.parse(content) as LocalCounters;

      for (const featureKey of Object.values(FEATURE_KEYS)) {
        const normalized = normalizeCounterValue(stored[featureKey], now);
        const projected = projectElapsed ? projectCounter(normalized) : normalized;
        if (projected.displayCount > initial[featureKey].displayCount) {
          initial[featureKey] = projected;
        }
      }
    } catch {
      // Try the next source, then fall back to the minimum live floor.
    }
  }

  return initial;
}

async function persistCounters(counters: NormalizedCounters) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const temporaryFile = `${COUNTERS_FILE}.tmp`;
  const backupTemporaryFile = `${COUNTERS_BACKUP_FILE}.tmp`;
  const content = `${JSON.stringify(counters, null, 2)}\n`;
  await writeFile(temporaryFile, content, 'utf8');
  await rename(temporaryFile, COUNTERS_FILE);
  await writeFile(backupTemporaryFile, content, 'utf8');
  await rename(backupTemporaryFile, COUNTERS_BACKUP_FILE);
}

export function recordLocalVisitorVisit(featureKey: FeatureKey, visitId?: string): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters({ projectElapsed: false });
    const counter = counters[featureKey];
    const alreadyRecorded = Boolean(visitId && counter.visitIds.includes(visitId));

    if (!alreadyRecorded) {
      counters[featureKey] = {
        displayCount: counter.displayCount + 1,
        updatedAt: new Date().toISOString(),
        visitIds: visitId ? [...counter.visitIds, visitId].slice(-5000) : counter.visitIds,
      };
    }

    await persistCounters(counters);
    return counters[featureKey].displayCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function readLocalVisitorCount(
  featureKey: FeatureKey,
  { projectElapsed = true }: { projectElapsed?: boolean } = {},
): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters({ projectElapsed });
    await persistCounters(counters);
    return counters[featureKey].displayCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
