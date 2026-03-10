import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useUserSettingsStore } from '../store';
import type { UserSettings } from '../utils';

export function shallowEqualArray<T>(a: readonly T[], b: readonly T[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;

  return true;
}

type Options<T> = {
  fallback: T;
  equals?: (a: T, b: T) => boolean;
  normalize?: (v: T) => T;
};

export function useSettingState<
  K extends keyof UserSettings,
  T extends UserSettings[K],
>(
  key: K,
  options: Options<T>,
): [T, (updater: (prev: T) => T, userAction?: boolean) => void] {
  const hydrated = useUserSettingsStore((s) => s.hydrated);
  const remoteValue = useUserSettingsStore((s) => s.data[key]) as T;
  const patch = useUserSettingsStore((s) => s.patch);

  const equals = useMemo(
    () => options.equals ?? ((a: T, b: T) => Object.is(a, b)),
    [options.equals],
  );

  const normalize = useMemo(
    () => options.normalize ?? ((v: T) => v),
    [options.normalize],
  );

  const [value, setValue] = useState<T>(() =>
    normalize(remoteValue ?? options.fallback),
  );

  const didInit = useRef(false);
  const userChanged = useRef(false);

  // init once after hydrated
  useEffect(() => {
    if (!hydrated) return;
    if (didInit.current) return;
    didInit.current = true;

    const initial = normalize((remoteValue ?? options.fallback) as T);
    setValue(initial);
  }, [hydrated, remoteValue, options.fallback, normalize]);

  // persist only for userAction
  useEffect(() => {
    if (!hydrated) return;
    if (!didInit.current) return;
    if (!userChanged.current) return;

    const currentInStore =
      (useUserSettingsStore.getState().data[key] as T) ?? options.fallback;
    const next = normalize(value);

    if (!equals(currentInStore as T, next)) {
      patch({ [key]: next } as Partial<UserSettings>);
    }

    userChanged.current = false;
  }, [value, hydrated, key, patch, options.fallback, equals, normalize]);

  const setWithMeta = useCallback(
    (updater: (prev: T) => T, userAction = false) => {
      if (userAction) userChanged.current = true;

      setValue((prev) => normalize(updater(prev)));
    },
    [normalize],
  );

  return [value, setWithMeta];
}
