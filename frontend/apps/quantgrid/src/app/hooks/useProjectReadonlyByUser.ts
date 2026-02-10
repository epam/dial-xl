import { useCallback, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';

import { constructPath } from '../utils';

type StoredMap = Record<string, number>;
const storageKey = 'readonlyProjects';
const maxAgeDays = 30;
const maxEntries = 50;
const msPerDay = 24 * 60 * 60 * 1000;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadMap(): StoredMap {
  try {
    const parsed = safeParse<unknown>(localStorage.getItem(storageKey));
    if (!parsed || typeof parsed !== 'object') return {};
    const map: StoredMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        map[k] = v;
      }
    }

    return map;
  } catch {
    return {};
  }
}

function saveMap(map: StoredMap) {
  try {
    const keys = Object.keys(map);
    if (keys.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(map));
    }
  } catch {
    // ignore storage errors
  }
}

/** Delete expired, enforce maxEntries (LRU by timestamp). */
function cleanup(map: StoredMap): StoredMap {
  const cutoff = Date.now() - maxAgeDays * msPerDay;

  const next = Object.fromEntries(
    Object.entries(map).filter(([_, ts]) => ts && ts >= cutoff)
  );

  const ids = Object.keys(next);
  if (ids.length > maxEntries) {
    ids
      .sort((a, b) => next[a] - next[b])
      .slice(0, ids.length - maxEntries)
      .forEach((id) => delete next[id]);
  }

  return next;
}

export const useProjectReadonlyByUser = ({
  projectPath,
  projectBucket,
  projectName,
}: {
  projectPath: string | null;
  projectName: string | null;
  projectBucket: string | null;
}) => {
  const projectId = useMemo(() => {
    if (!projectName || !projectBucket) return null;

    return constructPath([projectBucket, projectPath, projectName]);
  }, [projectBucket, projectPath, projectName]);

  const [isReadonly, setIsReadonlyState] = useState(false);

  const setIsReadonly = useCallback(
    (value: boolean) => {
      if (!projectId) return;
      const map = loadMap();

      if (value) {
        map[projectId] = Date.now();
      } else {
        delete map[projectId];
      }

      const cleaned = cleanup(map);
      saveMap(cleaned);
      setIsReadonlyState(value);
    },
    [projectId]
  );

  useEffect(() => {
    if (!projectId) return;
    const before = loadMap();
    const cleaned = cleanup({ ...before });
    if (!isEqual(before, cleaned)) {
      saveMap(cleaned);
    }
    setIsReadonlyState(Boolean(cleaned[projectId]));
  }, [projectId]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const map = cleanup(loadMap());
        setIsReadonlyState(Boolean(map[projectId!]));
      }
    };
    window.addEventListener('storage', handler);

    return () => window.removeEventListener('storage', handler);
  }, [projectId]);

  return {
    isReadonly,
    setIsReadonly,
  };
};
