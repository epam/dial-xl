import { useEffect, useRef } from 'react';

import { ControlData } from '@frontend/common';

import { normalizeControlValue } from '../utils';

export function useSyncSingleSelection(
  controlData: ControlData | null,
  setSelected: (v: string | null) => void
) {
  const prevNormRef = useRef<string | null>(null);

  useEffect(() => {
    const selected = controlData?.selectedValues?.[0] ?? null;
    const norm = selected ? normalizeControlValue(selected) : null;

    if (prevNormRef.current === norm) return;

    prevNormRef.current = norm;
    setSelected(selected);
  }, [controlData?.selectedValues, setSelected]);
}

export function useSyncMultiSelection(
  controlData: ControlData | null,
  setSelectedSet: (v: Set<string>) => void
) {
  const prevNormRef = useRef<string[] | null>(null);

  useEffect(() => {
    const selected = controlData?.selectedValues ?? [];
    const norm = selected.map(normalizeControlValue);

    if (prevNormRef.current && isSameArr(prevNormRef.current, norm)) return;

    prevNormRef.current = norm;

    setSelectedSet(new Set(selected));
  }, [controlData?.selectedValues, setSelectedSet]);
}

function isSameArr(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;

  return true;
}
