import { useCallback } from 'react';

import { FieldSortOrder } from '@frontend/common';
import { Apply, ApplySort } from '@frontend/parser';

import { useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';

export function useSortEditDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const changeFieldSort = useCallback(
    (tableName: string, fieldName: string, sortOrder: FieldSortOrder) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;
      const sortSign = sortOrder === 'desc' ? '-' : '';
      const sortFormula = `${sortSign}[${fieldName}]`;

      if ((!table.apply || !table.apply?.sort) && sortOrder === null) return;

      if (!table.apply && sortOrder !== null) {
        table.apply = new Apply();
        table.apply.sort = new ApplySort();
        table.apply.sort.append(sortFormula);
      } else if (sortOrder !== null && table.apply && !table.apply?.sort) {
        table.apply.sort = new ApplySort();
        table.apply.sort.append(sortFormula);
      } else if (table.apply?.sort && parsedApply?.sort) {
        const sortExpressions: string[] = parsedApply.sort.getChangedFieldSort(
          fieldName,
          sortOrder
        );

        if (sortExpressions.length > 0) {
          const sort = new ApplySort();
          sortExpressions.forEach((expression) => sort.append(expression));
          table.apply.sort = sort;
        } else {
          table.apply.sort = null;

          if (!table.apply.filter) {
            table.apply = null;
          }
        }
      }

      const historyTitle = sortOrder
        ? `Change sort order of ${tableName}[${fieldName}] to ${sortOrder}"`
        : `Clear sort of the ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  return {
    changeFieldSort: useSafeCallback(changeFieldSort),
  };
}
