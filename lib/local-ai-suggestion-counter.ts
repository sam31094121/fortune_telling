import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveLocalDataDirectory } from './local-data-directory';

export const AI_SUGGESTION_INITIAL_COUNT = 168;

const DATA_DIRECTORY = resolveLocalDataDirectory();
const COUNTER_FILE = path.join(DATA_DIRECTORY, 'ai-suggestion-counter.json');
const COUNTER_BACKUP_FILE = path.join(DATA_DIRECTORY, 'ai-suggestion-counter.backup.json');

type SuggestionLog = {
  deviceId: string;
  ipHash?: string;
  sentAt: string;
};

type StoredAiSuggestionCounter = {
  totalCount: number;
  highestCount: number;
  deviceIds: string[];
  logs: SuggestionLog[];
};

let writeQueue = Promise.resolve();

function normalizeCounter(value: unknown): StoredAiSuggestionCounter {
  if (!value || typeof value !== 'object') {
    return { totalCount: AI_SUGGESTION_INITIAL_COUNT, highestCount: AI_SUGGESTION_INITIAL_COUNT, deviceIds: [], logs: [] };
  }

  const stored = value as Partial<StoredAiSuggestionCounter>;
  const totalCount = Number(stored.totalCount);
  const highestCount = Number(stored.highestCount);
  const deviceIds = Array.isArray(stored.deviceIds)
    ? Array.from(new Set(stored.deviceIds.filter((item): item is string => typeof item === 'string')))
    : [];
  const logs = Array.isArray(stored.logs)
    ? stored.logs.filter((item): item is SuggestionLog => (
        typeof item?.deviceId === 'string' &&
        typeof item?.sentAt === 'string'
      ))
    : [];
  const loggedDeviceCount = new Set(logs.map((log) => log.deviceId)).size;
  const countFromLogs = AI_SUGGESTION_INITIAL_COUNT + Math.max(deviceIds.length, loggedDeviceCount);
  const safeTotalCount = Number.isSafeInteger(totalCount) && totalCount >= AI_SUGGESTION_INITIAL_COUNT
    ? totalCount
    : AI_SUGGESTION_INITIAL_COUNT;
  const safeHighestCount = Number.isSafeInteger(highestCount) && highestCount >= AI_SUGGESTION_INITIAL_COUNT
    ? highestCount
    : AI_SUGGESTION_INITIAL_COUNT;
  const permanentCount = Math.max(safeTotalCount, safeHighestCount, countFromLogs);

  return {
    totalCount: permanentCount,
    highestCount: permanentCount,
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
      if (parsed.highestCount >= strongest.highestCount) {
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
  const permanentCounter = normalizeCounter(counter);
  const content = `${JSON.stringify(permanentCounter, null, 2)}
`;  const temporaryFile = `${COUNTER_FILE}.tmp`;
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
    const alreadyRecorded = counter.deviceIds.includes(deviceId);

    if (!alreadyRecorded) {
      counter.deviceIds.push(deviceId);
      counter.totalCount = Math.max(counter.totalCount, counter.highestCount, AI_SUGGESTION_INITIAL_COUNT) + 1;
      counter.highestCount = counter.totalCount;
      counter.logs.push({
        deviceId,
        ipHash,
        sentAt: new Date().toISOString(),
      });
    }

    await persistCounter(counter);
    return { totalCount: counter.totalCount, didSend: !alreadyRecorded };
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
