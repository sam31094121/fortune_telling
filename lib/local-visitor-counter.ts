import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

import {
  FEATURE_KEYS,
  VISITOR_SEED_COUNT,
  type FeatureKey,
} from '@/lib/visitor-counter';
import { resolveLocalDataDirectory } from '@/lib/local-data-directory';

const DATA_DIRECTORY = resolveLocalDataDirectory();
const COUNTERS_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.json');
const COUNTERS_BACKUP_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.backup.json');

type StoredCounter = {
  schemaVersion?: 2;
  displayCount: number;
  updatedAt: string;
  visitIds: string[];
  unverifiedHistoricalCount?: number;
};

type LocalCounterValue = number | Partial<StoredCounter>;
type LocalCounters = Partial<Record<FeatureKey, LocalCounterValue>>;
type NormalizedCounters = Record<FeatureKey, StoredCounter>;

let writeQueue = Promise.resolve();

function createInitialCounters(now = new Date()): NormalizedCounters {
  return Object.fromEntries(
    Object.values(FEATURE_KEYS).map((featureKey) => [
      featureKey,
      { schemaVersion: 2, displayCount: 0, updatedAt: now.toISOString(), visitIds: [] },
    ]),
  ) as unknown as NormalizedCounters;
}

function normalizeCounterValue(value: LocalCounterValue | undefined, now: Date): StoredCounter {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= VISITOR_SEED_COUNT) {
    return { schemaVersion: 2, displayCount: 0, updatedAt: now.toISOString(), visitIds: [], unverifiedHistoricalCount: value };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid counter value');
  if (value.unverifiedHistoricalCount !== undefined && (!Number.isSafeInteger(value.unverifiedHistoricalCount) || value.unverifiedHistoricalCount < 0)) throw new Error('Invalid historical count');
  if (value.visitIds !== undefined && (!Array.isArray(value.visitIds) || value.visitIds.some(id => typeof id !== 'string' || !id))) throw new Error('Invalid retained events');

  const displayCount = value.displayCount;
  const updatedAt = value.updatedAt;
  const visitIds = Array.isArray(value.visitIds)
    ? Array.from(new Set(value.visitIds.filter((item): item is string => typeof item === 'string' && item.length > 0)))
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

      留存事件數不是全部歷史真人數；未能核對的累計另存保留。
    */
    // Historical aggregates stay separately recorded, never counted as events.
    return {
      schemaVersion: 2,
      displayCount: visitIds.length,
      unverifiedHistoricalCount: Math.max(value.unverifiedHistoricalCount ?? 0, displayCount - visitIds.length, 0),
      updatedAt,
      visitIds,
    };
  }

  throw new Error('Invalid counter value');
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

async function readCounters({ projectElapsed = true, allowNew = false, requiredFeature }: { projectElapsed?: boolean; allowNew?: boolean; requiredFeature?: FeatureKey } = {}): Promise<NormalizedCounters> {
  if (process.env.VERCEL) throw new Error('Persistent visitor storage is unavailable');
  const now = new Date();
  const initial = createInitialCounters(now);
  let found = false;
  let unreadable = false;
  const present = new Set<FeatureKey>();

  for (const filePath of [COUNTERS_BACKUP_FILE, COUNTERS_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      const stored = JSON.parse(content) as LocalCounters;
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid counter file');
      const entries = Object.values(FEATURE_KEYS).filter(key => stored[key] !== undefined).map(key => [key, normalizeCounterValue(stored[key], now)] as const);
      if (!entries.length) throw new Error('Empty counter file');
      found = true;
      for (const [featureKey, normalized] of entries) {
        present.add(featureKey);
        const projected = projectElapsed ? projectCounter(normalized) : normalized;
        const visitIds = [...new Set([...initial[featureKey].visitIds, ...projected.visitIds])];
        initial[featureKey] = {
          ...projected,
          visitIds,
          displayCount: visitIds.length,
          unverifiedHistoricalCount: Math.max(initial[featureKey].unverifiedHistoricalCount ?? 0, projected.unverifiedHistoricalCount ?? 0),
        };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') unreadable = true;
    }
  }

  if (!found && (!allowNew || unreadable)) throw new Error('Visitor history is unavailable');
  if (requiredFeature && !present.has(requiredFeature)) throw new Error('Visitor history is unavailable');
  return initial;
}

async function persistCounters(counters: NormalizedCounters) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const historyDirectory = path.join(DATA_DIRECTORY, 'counter-history');
  await mkdir(historyDirectory, { recursive: true });
  for (const file of [COUNTERS_FILE, COUNTERS_BACKUP_FILE]) {
    try {
      const original = await readFile(file);
      const stored = JSON.parse(original.toString('utf8'));
      if (Object.values(stored).every(value => value && typeof value === 'object' && (value as StoredCounter).schemaVersion === 2)) continue;
      const hash = createHash('sha256').update(original).digest('hex');
      const archive = path.join(historyDirectory, `${path.basename(file)}.${hash}.bak`);
      await writeFile(archive, original, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const temporaryFile = `${COUNTERS_FILE}.tmp`;
  const backupTemporaryFile = `${COUNTERS_BACKUP_FILE}.tmp`;
  const content = `${JSON.stringify(counters, null, 2)}\n`;
  await writeFile(temporaryFile, content, 'utf8');
  await rename(temporaryFile, COUNTERS_FILE);
  await writeFile(backupTemporaryFile, content, 'utf8');
  await rename(backupTemporaryFile, COUNTERS_BACKUP_FILE);
}

/** Administrative reconciliation: preserve originals and normalize, without adding visits. */
export function reconcileLocalVisitorHistory(): Promise<void> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters({ projectElapsed: false });
    await persistCounters(counters);
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function recordLocalVisitorVisit(featureKey: FeatureKey, visitId?: string): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters({ projectElapsed: false, allowNew: true });
    const counter = counters[featureKey];
    const eventId = visitId || randomUUID();
    const alreadyRecorded = counter.visitIds.includes(eventId);
    if (!alreadyRecorded) {
      counters[featureKey] = {
        ...counter,
        displayCount: counter.visitIds.length + 1,
        updatedAt: new Date().toISOString(),
        visitIds: [...counter.visitIds, eventId],
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
    const counters = await readCounters({ projectElapsed, requiredFeature: featureKey });
    return counters[featureKey].displayCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
