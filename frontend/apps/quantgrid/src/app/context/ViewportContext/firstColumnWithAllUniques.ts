import { ColumnChunk } from '@frontend/common';

/**
 * Scans the chunks once and returns the first column (according to `fieldNames`)
 * whose values are globally unique.  If no column qualifies, returns `null`.
 *
 */
export function firstColumnWithAllUniques(
  chunks: { [p: number]: ColumnChunk },
  fieldNames: string[]
): string | null {
  const live: Map<string, Set<string>> = new Map();
  for (const col of fieldNames) live.set(col, new Set());

  for (const chunk of Object.values(chunks)) {
    for (const col of fieldNames) {
      const set = live.get(col);
      if (!set) continue;

      const values = chunk[col];
      if (!values) continue;

      for (const v of values) {
        if (set.has(v)) {
          live.delete(col);
          break;
        }
        set.add(v);
      }
    }

    if (live.size === 0) return null;
  }

  for (const col of fieldNames) {
    if (live.has(col)) return col;
  }

  return null;
}
