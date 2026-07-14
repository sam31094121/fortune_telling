import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  FEATURE_KEYS,
  VISITOR_MIN_DISPLAY_COUNT,
  VISITOR_SEED_COUNT,
  type FeatureKey,
} from '@/lib/visitor-counter';

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const COUNTERS_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.json');
const COUNTERS_BACKUP_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.backup.json');
const COUNTER_AUTO_INCREMENT_INTERVAL_MS = 18_000;

type StoredCounter = {
  displayCount: number;
  updatedAt: string;
};

type LocalCounterValue = number | Partial<StoredCounter>;
type LocalCounters = Partial<Record<FeatureKey, LocalCounterValue>>;
type NormalizedCounters = Record<FeatureKey, StoredCounter>;

let writeQueue = Promise.resolve();

function createInitialCounters(now = new Date()): NormalizedCounters {
  return Object.fromEntries(
    Object.values(FEATURE_KEYS).map((featureKey) => [
      featureKey,
      { displayCount: VISITOR_MIN_DISPLAY_COUNT, updatedAt: now.toISOString() },
    ]),
  ) as NormalizedCounters;
}

function normalizeCounterValue(value: LocalCounterValue | undefined, now: Date): StoredCounter {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= VISITOR_SEED_COUNT) {
    return { displayCount: Math.max(value, VISITOR_MIN_DISPLAY_COUNT), updatedAt: now.toISOString() };
  }

  if (!value || typeof value !== 'object') {
    return { displayCount: VISITOR_MIN_DISPLAY_COUNT, updatedAt: now.toISOString() };
  }

  const displayCount = value.displayCount;
  const updatedAt = value.updatedAt;

  if (
    typeof displayCount === 'number' &&
    Number.isSafeInteger(displayCount) &&
    displayCount >= VISITOR_SEED_COUNT &&
    typeof updatedAt === 'string' &&
    !Number.isNaN(Date.parse(updatedAt))
  ) {
    return { displayCount: Math.max(displayCount, VISITOR_MIN_DISPLAY_COUNT), updatedAt };
  }

  return { displayCount: VISITOR_MIN_DISPLAY_COUNT, updatedAt: now.toISOString() };
}

function projectCounter(counter: StoredCounter, now = new Date()): StoredCounter {
  const updatedAtMs = Date.parse(counter.updatedAt);
  const elapsedMs = Math.max(0, now.getTime() - (Number.isNaN(updatedAtMs) ? now.getTime() : updatedAtMs));
  const elapsedIncrements = Math.floor(elapsedMs / COUNTER_AUTO_INCREMENT_INTERVAL_MS);

  if (elapsedIncrements <= 0) return counter;

  return {
    displayCount: counter.displayCount + elapsedIncrements,
    updatedAt: new Date(updatedAtMs + elapsedIncrements * COUNTER_AUTO_INCREMENT_INTERVAL_MS).toISOString(),
  };
}

async function readCounters(): Promise<NormalizedCounters> {
  const now = new Date();
  const initial = createInitialCounters(now);

  for (const filePath of [COUNTERS_BACKUP_FILE, COUNTERS_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      const stored = JSON.parse(content) as LocalCounters;

      for (const featureKey of Object.values(FEATURE_KEYS)) {
        const projected = projectCounter(normalizeCounterValue(stored[featureKey], now), now);
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

export function recordLocalVisitorVisit(featureKey: FeatureKey): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters();
    counters[featureKey] = {
      displayCount: counters[featureKey].displayCount + 1,
      updatedAt: new Date().toISOString(),
    };
    await persistCounters(counters);
    return counters[featureKey].displayCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function readLocalVisitorCount(featureKey: FeatureKey): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters();
    await persistCounters(counters);
    return counters[featureKey].displayCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
