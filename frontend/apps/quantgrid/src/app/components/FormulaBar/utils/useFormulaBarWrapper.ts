import { useContext, useEffect, useState } from 'react';

import { SelectedCellType } from '../../../common';
import { AppContext, ProjectContext } from '../../../context';
import { useDSLUtils } from '../../../hooks';
import { useFormulaInput } from './useFormulaInput';

export function useFormulaBarWrapper() {
  const { formulaBarMode } = useContext(AppContext);
  const { selectedCell } = useContext(ProjectContext);

  const [fields, setFields] = useState<string[]>([]);
  const { findTable } = useDSLUtils();
  const { getSelectedCellValue } = useFormulaInput();

  useEffect(() => {
    const { Cell, Field, Override, Table, EmptyCell } = SelectedCellType;

    if (
      !selectedCell ||
      [Cell, Field, Override, EmptyCell].includes(selectedCell.type)
    ) {
      setFields([]);

      return;
    }

    if (selectedCell.type === Table && selectedCell.value) {
      const table = findTable(selectedCell.value);

      if (!table) {
        setFields([]);

        return;
      }

      const fields: string[] = table.fields
        .filter(
          (f, idx, arr) =>
            f.isDim &&
            arr.findIndex((e) => e.fieldGroupIndex === f.fieldGroupIndex) ===
              idx
        )
        .map((f) => f.key.fieldName);

      setFields(fields);
    }
  }, [findTable, formulaBarMode, getSelectedCellValue, selectedCell]);

  return {
    fields,
  };
}
