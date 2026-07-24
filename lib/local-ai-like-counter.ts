import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const AI_LIKE_INITIAL_COUNT = 630_628;

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const COUNTER_FILE = path.join(DATA_DIRECTORY, 'ai-like-counter.json');
const COUNTER_BACKUP_FILE = path.join(DATA_DIRECTORY, 'ai-like-counter.backup.json');

type LikeLog = {
  deviceId: string;
  ipHash?: string;
  likedAt: string;
};

type StoredAiLikeCounter = {
  totalCount: number;
  highestCount: number;
  deviceIds: string[];
  logs: LikeLog[];
};

let writeQueue = Promise.resolve();

function normalizeCounter(value: unknown): StoredAiLikeCounter {
  if (!value || typeof value !== 'object') {
    return { totalCount: AI_LIKE_INITIAL_COUNT, highestCount: AI_LIKE_INITIAL_COUNT, deviceIds: [], logs: [] };
  }

  const stored = value as Partial<StoredAiLikeCounter>;
  const totalCount = Number(stored.totalCount);
  const highestCount = Number(stored.highestCount);
  const deviceIds = Array.isArray(stored.deviceIds)
    ? Array.from(new Set(stored.deviceIds.filter((item): item is string => typeof item === 'string')))
    : [];
  const logs = Array.isArray(stored.logs)
    ? stored.logs.filter((item): item is LikeLog => (
        typeof item?.deviceId === 'string' &&
        typeof item?.likedAt === 'string'
      ))
    : [];
  const loggedDeviceCount = new Set(logs.map((log) => log.deviceId)).size;
  const countFromLogs = AI_LIKE_INITIAL_COUNT + Math.max(deviceIds.length, loggedDeviceCount);
  const safeTotalCount = Number.isSafeInteger(totalCount) && totalCount >= AI_LIKE_INITIAL_COUNT
    ? totalCount
    : AI_LIKE_INITIAL_COUNT;
  const safeHighestCount = Number.isSafeInteger(highestCount) && highestCount >= AI_LIKE_INITIAL_COUNT
    ? highestCount
    : AI_LIKE_INITIAL_COUNT;
  const permanentCount = Math.max(safeTotalCount, safeHighestCount, countFromLogs);

  return {
    totalCount: permanentCount,
    highestCount: permanentCount,
    deviceIds,
    logs,
  };
}

async function readCounter(): Promise<StoredAiLikeCounter> {
  let strongest = normalizeCounter(null);

  for (const filePath of [COUNTER_BACKUP_FILE, COUNTER_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = normalizeCounter(JSON.parse(content));
      if (parsed.highestCount >= strongest.highestCount) {
        strongest = parsed;
      }
    } catch {
      // Fall back to the seed count when no local counter exists yet.
    }
  }

  return strongest;
}

async function persistCounter(counter: StoredAiLikeCounter) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const permanentCounter = normalizeCounter(counter);
  const content = `${JSON.stringify(permanentCounter, null, 2)}\n`;
  const temporaryFile = `${COUNTER_FILE}.tmp`;
  const backupTemporaryFile = `${COUNTER_BACKUP_FILE}.tmp`;

  await writeFile(temporaryFile, content, 'utf8');
  await rename(temporaryFile, COUNTER_FILE);
  await writeFile(backupTemporaryFile, content, 'utf8');
  await rename(backupTemporaryFile, COUNTER_BACKUP_FILE);
}

export function readLocalAiLikeCount(): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counter = await readCounter();
    await persistCounter(counter);
    return counter.totalCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function recordLocalAiLike(deviceId: string, ipHash?: string): Promise<{ totalCount: number; didLike: boolean }> {
  const operation = writeQueue.then(async () => {
    const counter = await readCounter();

    if (!counter.deviceIds.includes(deviceId)) {
      counter.deviceIds.push(deviceId);
    }

    counter.totalCount = Math.max(counter.totalCount, counter.highestCount, AI_LIKE_INITIAL_COUNT) + 1;
    counter.highestCount = counter.totalCount;
    counter.logs.push({
      deviceId,
      ipHash,
      likedAt: new Date().toISOString(),
    });

    await persistCounter(counter);
    return { totalCount: counter.totalCount, didLike: true };
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
