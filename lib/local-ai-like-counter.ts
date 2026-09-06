import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveLocalDataDirectory } from './local-data-directory';

/*
  底數歸零。

  這個常數原本是 630,628——不管實際有幾個人，畫面至少顯示這個數。
  於是 number／iching／karma 三個功能顯示「1,271,2xx 人」，
  而真實訪客是 0。認同數同理：顯示 630,674，真實 46。

  專案鐵律第一條是禁止作假。虛增的社會證明是對客戶說謊，
  不因為「別人都這樣做」而變成可以。歸零之後數字會很難看，
  但難看的真話勝過好看的假話。
*/
export const AI_LIKE_INITIAL_COUNT = 0;

const DATA_DIRECTORY = resolveLocalDataDirectory();
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
  /*
    以「真實紀錄」為準，不是以存下來的彙總欄位為準。

    原本是 Math.max(存的總數, 存的最高值, 從紀錄算出來的)。
    那代表一旦 totalCount 被灌到 630,674，就算實際只有 46 個裝置按過，
    它也會永遠贏——而且每次寫回檔案，虛增值就再固化一次。
    改資料檔沒有用，跑著的伺服器會把記憶體裡那個數字寫回去。

    真相是 deviceIds／logs：誰按過就是誰按過，數得出來。
    彙總欄位只是快取，不該凌駕它所彙總的東西。
  */
  const permanentCount = countFromLogs;
  void safeTotalCount;
  void safeHighestCount;

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
    const alreadyRecorded = counter.deviceIds.includes(deviceId);

    if (!alreadyRecorded) {
      counter.deviceIds.push(deviceId);
      counter.totalCount = Math.max(counter.totalCount, counter.highestCount, AI_LIKE_INITIAL_COUNT) + 1;
      counter.highestCount = counter.totalCount;
      counter.logs.push({
        deviceId,
        ipHash,
        likedAt: new Date().toISOString(),
      });
    }

    await persistCounter(counter);
    return { totalCount: counter.totalCount, didLike: !alreadyRecorded };
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
