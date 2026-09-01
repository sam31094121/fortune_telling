import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveLocalDataDirectory } from './local-data-directory';

export type TaijiSoundVariant = 'SOFT_WOOD' | 'WARM_BELL' | 'AIR_CHIME' | 'LOW_RESONANCE';
export type TaijiSoundEventField = 'assigned' | 'completed' | 'muted_immediately' | 'replayed' | 'next_step';

export const TAIJI_SOUND_VARIANTS: TaijiSoundVariant[] = ['SOFT_WOOD', 'WARM_BELL', 'AIR_CHIME', 'LOW_RESONANCE'];

export interface TaijiSoundVariantStats {
  variant: TaijiSoundVariant;
  assignedCount: number;
  completedCount: number;
  mutedImmediatelyCount: number;
  replayedCount: number;
  nextStepCount: number;
}

const DATA_DIRECTORY = resolveLocalDataDirectory();
const STATS_FILE = path.join(DATA_DIRECTORY, 'taiji-sound-preference.json');
const STATS_BACKUP_FILE = path.join(DATA_DIRECTORY, 'taiji-sound-preference.backup.json');

type StoredStats = Record<TaijiSoundVariant, TaijiSoundVariantStats>;

let writeQueue = Promise.resolve();

function emptyStats(variant: TaijiSoundVariant): TaijiSoundVariantStats {
  return { variant, assignedCount: 0, completedCount: 0, mutedImmediatelyCount: 0, replayedCount: 0, nextStepCount: 0 };
}

function safeCount(value: unknown) {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

function normalize(value: unknown): StoredStats {
  const base = Object.fromEntries(TAIJI_SOUND_VARIANTS.map((variant) => [variant, emptyStats(variant)])) as StoredStats;
  if (!value || typeof value !== 'object') return base;
  const stored = value as Partial<Record<TaijiSoundVariant, Partial<TaijiSoundVariantStats>>>;
  for (const variant of TAIJI_SOUND_VARIANTS) {
    const incoming = stored[variant];
    if (!incoming) continue;
    base[variant] = {
      variant,
      assignedCount: safeCount(incoming.assignedCount),
      completedCount: safeCount(incoming.completedCount),
      mutedImmediatelyCount: safeCount(incoming.mutedImmediatelyCount),
      replayedCount: safeCount(incoming.replayedCount),
      nextStepCount: safeCount(incoming.nextStepCount),
    };
  }
  return base;
}

async function readStats(): Promise<StoredStats> {
  for (const filePath of [STATS_FILE, STATS_BACKUP_FILE]) {
    try {
      const content = await readFile(filePath, 'utf8');
      return normalize(JSON.parse(content));
    } catch {
      // Try the next candidate; a missing file just means no local data yet.
    }
  }
  return normalize(null);
}

async function persistStats(stats: StoredStats) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const content = `${JSON.stringify(stats, null, 2)}\n`;
  const tempFile = `${STATS_FILE}.tmp`;
  const backupTempFile = `${STATS_BACKUP_FILE}.tmp`;

  await writeFile(tempFile, content, 'utf8');
  await rename(tempFile, STATS_FILE);
  await writeFile(backupTempFile, content, 'utf8');
  await rename(backupTempFile, STATS_BACKUP_FILE);
}

export function readLocalTaijiSoundStats(): Promise<TaijiSoundVariantStats[]> {
  const operation = writeQueue.then(async () => {
    const stats = await readStats();
    return TAIJI_SOUND_VARIANTS.map((variant) => stats[variant]);
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function recordLocalTaijiSoundEvent(variant: TaijiSoundVariant, field: TaijiSoundEventField): Promise<TaijiSoundVariantStats> {
  const operation = writeQueue.then(async () => {
    const stats = await readStats();
    const row = stats[variant];
    if (field === 'assigned') row.assignedCount += 1;
    else if (field === 'completed') row.completedCount += 1;
    else if (field === 'muted_immediately') row.mutedImmediatelyCount += 1;
    else if (field === 'replayed') row.replayedCount += 1;
    else if (field === 'next_step') row.nextStepCount += 1;
    await persistStats(stats);
    return row;
  });

  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
