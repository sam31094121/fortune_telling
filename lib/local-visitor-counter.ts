import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  FEATURE_KEYS,
  VISITOR_SEED_COUNT,
  type FeatureKey,
} from '@/lib/visitor-counter';

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const COUNTERS_FILE = path.join(DATA_DIRECTORY, 'visitor-counters.json');

type LocalCounters = Partial<Record<FeatureKey, number>>;

let writeQueue = Promise.resolve();

function createInitialCounters(): Record<FeatureKey, number> {
  return Object.fromEntries(
    Object.values(FEATURE_KEYS).map((featureKey) => [featureKey, VISITOR_SEED_COUNT]),
  ) as Record<FeatureKey, number>;
}

async function readCounters(): Promise<Record<FeatureKey, number>> {
  try {
    const content = await readFile(COUNTERS_FILE, 'utf8');
    const stored = JSON.parse(content) as LocalCounters;
    const initial = createInitialCounters();

    for (const featureKey of Object.values(FEATURE_KEYS)) {
      const value = stored[featureKey];
      if (typeof value === 'number' && Number.isSafeInteger(value) && value >= VISITOR_SEED_COUNT) {
        initial[featureKey] = value;
      }
    }

    return initial;
  } catch {
    return createInitialCounters();
  }
}

async function persistCounters(counters: Record<FeatureKey, number>) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const temporaryFile = `${COUNTERS_FILE}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(counters, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, COUNTERS_FILE);
}

export function recordLocalVisitorVisit(featureKey: FeatureKey): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counters = await readCounters();
    counters[featureKey] += 1;
    await persistCounters(counters);
    return counters[featureKey];
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function readLocalVisitorCount(featureKey: FeatureKey): Promise<number> {
  const counters = await readCounters();
  return counters[featureKey];
}
