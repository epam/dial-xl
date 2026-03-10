import { useEffect, useMemo, useState } from 'react';

import { SelectedCellType } from '../../../common';
import { useDSLUtils } from '../../../hooks';
import { useFormulaBarStore, useViewStore } from '../../../store';

export function useFormulaBarWrapper() {
  const formulaBarMode = useFormulaBarStore((s) => s.formulaBarMode);

  const [fields, setFields] = useState<string[]>([]);
  const { findTable } = useDSLUtils();

  const computeFieldsForTable = useMemo(() => {
    return (tableName: string | null | undefined) => {
      if (!tableName) return [];
      const table = findTable(tableName);
      if (!table) return [];

      return table.fields
        .filter(
          (f, idx, arr) =>
            f.isDim &&
            arr.findIndex((e) => e.fieldGroupIndex === f.fieldGroupIndex) ===
              idx,
        )
        .map((f) => f.key.fieldName);
    };
  }, [findTable]);

  useEffect(() => {
    return useViewStore.subscribe(
      (s) => {
        const sc = s.selectedCell;
        if (!sc) return null;

        return sc.type === SelectedCellType.Table && sc.value
          ? ['Table', sc.value]
          : null;
      },
      (next) => {
        if (next === null) {
          setFields((prevFields) => (prevFields.length ? [] : prevFields));

          return;
        }

        const [, tableName] = next;
        const newFields = computeFieldsForTable(tableName);

        setFields((prevFields) => {
          if (prevFields.length === newFields.length) {
            for (let i = 0; i < prevFields.length; i++) {
              if (prevFields[i] !== newFields[i]) return newFields;
            }

            return prevFields;
          }

          return newFields;
        });
      },
    );
  }, [computeFieldsForTable, formulaBarMode]);

  return {
    fields,
  };
}
