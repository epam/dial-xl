import isEqual from 'react-fast-compare';

import { constructPath } from '../utils';

type SelectedConversationEntry = {
  name: string;
  updatedAt: number;
};

type SelectedConversationsMap = Record<string, SelectedConversationEntry>;
const storageKey = 'selectedConversations';
const maxAgeDays = 60;
const maxEntries = 100;
const msPerDay = 24 * 60 * 60 * 1000;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadMap(): SelectedConversationsMap {
  const parsed = safeParse<unknown>(localStorage.getItem(storageKey));
  if (!parsed || typeof parsed !== 'object') return {};
  const map: SelectedConversationsMap = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const entry = v as Partial<SelectedConversationEntry>;
      if (
        typeof entry.name === 'string' &&
        typeof entry.updatedAt === 'number' &&
        isFinite(entry.updatedAt)
      ) {
        map[k] = { name: entry.name, updatedAt: entry.updatedAt };
      }
    }
  }

  return map;
}

function saveMap(map: SelectedConversationsMap): void {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(map));
    }
  } catch {
    // ignore storage errors
  }
}

function cleanup(map: SelectedConversationsMap): SelectedConversationsMap {
  const raw = safeParse<Record<string, unknown>>(
    localStorage.getItem(storageKey)
  );
  const legacyIds = new Set<string>(
    raw && typeof raw === 'object'
      ? Object.entries(raw)
          .filter(([, v]) => Array.isArray(v))
          .map(([k]) => k)
      : []
  );

  const cutoff = Date.now() - maxAgeDays * msPerDay;
  const entries: [string, SelectedConversationEntry][] = [];
  for (const [id, entry] of Object.entries(map)) {
    if (
      legacyIds.has(id) ||
      !entry ||
      typeof entry.name !== 'string' ||
      typeof entry.updatedAt !== 'number' ||
      entry.updatedAt < cutoff
    ) {
      continue;
    }
    entries.push([id, entry]);
  }

  if (entries.length > maxEntries) {
    entries
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .splice(0, entries.length - maxEntries);
  }

  return Object.fromEntries(entries);
}

export function getAllSelectedConversations(): SelectedConversationsMap {
  const cleaned = cleanup(loadMap());
  const before = loadMap();
  if (!isEqual(before, cleaned)) saveMap(cleaned);

  return cleaned;
}

export function getProjectSelectedConversation(
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
): string | null {
  const id = constructPath([projectBucket, projectPath, projectName]);
  const map = getAllSelectedConversations();

  return map[id]?.name ?? null;
}

export function setProjectSelectedConversation(
  name: string | null,
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
): void {
  const id = constructPath([projectBucket, projectPath, projectName]);
  const map = getAllSelectedConversations();

  if (name === null) {
    delete map[id];
  } else {
    map[id] = { name, updatedAt: Date.now() };
  }

  const cleaned = cleanup(map);
  saveMap(cleaned);
}
