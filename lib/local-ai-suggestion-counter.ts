import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const AI_SUGGESTION_INITIAL_COUNT = 168;

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const COUNTER_FILE = path.join(DATA_DIRECTORY, 'ai-suggestion-counter.json');
const COUNTER_BACKUP_FILE = path.join(DATA_DIRECTORY, 'ai-suggestion-counter.backup.json');

type SuggestionLog = {
  deviceId: string;
  ipHash?: string;
  sentAt: string;
};

type StoredAiSuggestionCounter = {
  totalCount: number;
  deviceIds: string[];
  logs: SuggestionLog[];
};

let writeQueue = Promise.resolve();

function normalizeCounter(value: unknown): StoredAiSuggestionCounter {
  if (!value || typeof value !== 'object') {
    return { totalCount: AI_SUGGESTION_INITIAL_COUNT, deviceIds: [], logs: [] };
  }

  const stored = value as Partial<StoredAiSuggestionCounter>;
  const totalCount = Number(stored.totalCount);
  const deviceIds = Array.isArray(stored.deviceIds)
    ? stored.deviceIds.filter((item): item is string => typeof item === 'string')
    : [];
  const logs = Array.isArray(stored.logs)
    ? stored.logs.filter((item): item is SuggestionLog => (
        typeof item?.deviceId === 'string' &&
        typeof item?.sentAt === 'string'
      ))
    : [];

  return {
    totalCount: Number.isSafeInteger(totalCount) && totalCount >= AI_SUGGESTION_INITIAL_COUNT
      ? totalCount
      : AI_SUGGESTION_INITIAL_COUNT,
    deviceIds,
    logs,
  };
}

async function readCounter(): Promise<StoredAiSuggestionCounter> {
  let strongest = normalizeCounter(null);

  for (const filePath of [COUNTER_BACKUP_FILE, COUNTER_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = normalizeCounter(JSON.parse(content));
      if (parsed.totalCount >= strongest.totalCount) {
        strongest = parsed;
      }
    } catch {
      // Fall back to the seed count when no local counter exists yet.
    }
  }

  return strongest;
}

async function persistCounter(counter: StoredAiSuggestionCounter) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const content = `${JSON.stringify(counter, null, 2)}\n`;
  const temporaryFile = `${COUNTER_FILE}.tmp`;
  const backupTemporaryFile = `${COUNTER_BACKUP_FILE}.tmp`;

  await writeFile(temporaryFile, content, 'utf8');
  await rename(temporaryFile, COUNTER_FILE);
  await writeFile(backupTemporaryFile, content, 'utf8');
  await rename(backupTemporaryFile, COUNTER_BACKUP_FILE);
}

export function readLocalAiSuggestionCount(): Promise<number> {
  const operation = writeQueue.then(async () => {
    const counter = await readCounter();
    await persistCounter(counter);
    return counter.totalCount;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function recordLocalAiSuggestion(deviceId: string, ipHash?: string): Promise<{ totalCount: number; didSend: boolean }> {
  const operation = writeQueue.then(async () => {
    const counter = await readCounter();
    const alreadySent = counter.deviceIds.includes(deviceId);

    if (!alreadySent) {
      counter.deviceIds.push(deviceId);
      counter.totalCount += 1;
      counter.logs.push({
        deviceId,
        ipHash,
        sentAt: new Date().toISOString(),
      });
    }

    await persistCounter(counter);
    return { totalCount: counter.totalCount, didSend: !alreadySent };
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
