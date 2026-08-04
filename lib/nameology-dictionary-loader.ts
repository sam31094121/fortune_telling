import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NameologyDictionaryCharacterEntry, NameologyDictionarySnapshot } from './nameology-engine';

type NameologyDictionaryManifest = {
  version: string;
  updatedAt: string;
  files: {
    characters: string;
    variants: string;
  };
};

let cache: NameologyDictionarySnapshot | null = null;

function assertCharacterEntry(value: NameologyDictionaryCharacterEntry) {
  if (!value.character || !value.normalizedCharacter) throw new Error('NAMEOLOGY_DICTIONARY_INVALID_CHARACTER');
  if (!Number.isInteger(value.totalStrokeCount) || value.totalStrokeCount <= 0) throw new Error(`NAMEOLOGY_DICTIONARY_INVALID_STROKE:${value.character}`);
  if (!['木', '火', '土', '金', '水'].includes(value.element)) throw new Error(`NAMEOLOGY_DICTIONARY_INVALID_ELEMENT:${value.character}`);
}

export async function loadLocalNameologyDictionary(basePath = path.join(process.cwd(), 'data', 'dictionaries', 'nameology')): Promise<NameologyDictionarySnapshot> {
  if (cache) return cache;

  const manifest = JSON.parse(await readFile(path.join(basePath, 'manifest.json'), 'utf8')) as NameologyDictionaryManifest;
  const characters = JSON.parse(await readFile(path.join(basePath, manifest.files.characters), 'utf8')) as NameologyDictionaryCharacterEntry[];
  const variants = JSON.parse(await readFile(path.join(basePath, manifest.files.variants), 'utf8')) as Record<string, string>;
  const entries: Record<string, NameologyDictionaryCharacterEntry> = {};

  for (const entry of characters) {
    assertCharacterEntry(entry);
    entries[entry.normalizedCharacter] = entry;
  }

  cache = {
    version: manifest.version,
    updatedAt: manifest.updatedAt,
    entries,
    variants,
  };

  return cache;
}

export function clearLocalNameologyDictionaryCache() {
  cache = null;
}