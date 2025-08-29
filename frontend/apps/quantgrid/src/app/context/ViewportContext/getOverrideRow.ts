import {
  CachedOverrideRow,
  defaultRowKey,
  ParsedTable,
} from '@frontend/parser';

export function getOverrideRow(
  table: ParsedTable,
  fieldName: string,
  tableRowIndex: number,
  tableRowData: Record<string, string>,
  cache: Record<number, CachedOverrideRow>
): CachedOverrideRow {
  const override = {
    overrideRow: null,
    overrideIndex: null,
    overrideSectionIndex: null,
  };

  if (!table.overrides) return override;

  const { overrides } = table;

  if (overrides.hasKey(fieldName)) return override;

  if (cache[tableRowIndex]) return cache[tableRowIndex];

  // Manual table overrides
  if (table.isManual()) {
    const overrideRow = overrides.getRowAtIndex(fieldName, tableRowIndex);

    if (!overrideRow) return override;

    cache[tableRowIndex] = {
      overrideRow,
      overrideIndex: tableRowIndex,
      overrideSectionIndex: tableRowIndex,
    };

    return cache[tableRowIndex];
  }

  // Table without keys, use 'row' as index key
  if (!table.hasKeys() && overrides.hasKey(defaultRowKey)) {
    const findOverrideRow = overrides?.getRowByKey(
      defaultRowKey,
      tableRowIndex + 1
    );

    if (findOverrideRow) {
      const { overrideRow, overrideIndex } = findOverrideRow;
      cache[tableRowIndex] = {
        overrideRow,
        overrideIndex: tableRowIndex + 1,
        overrideSectionIndex: overrideIndex,
      };

      return cache[tableRowIndex];
    }

    return override;
  }

  // Table with keys
  const findOverrideRow = overrides.getRowByKeys(tableRowData);

  if (findOverrideRow) {
    const { overrideRow, overrideIndex } = findOverrideRow;
    cache[tableRowIndex] = {
      overrideRow,
      overrideIndex,
      overrideSectionIndex: overrideIndex,
    };

    return cache[tableRowIndex];
  }

  return override;
}
