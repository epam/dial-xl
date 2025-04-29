import { useCallback } from 'react';

import { GridFilterType } from '@frontend/common';
import {
  Apply,
  ApplyFilter,
  escapeValue,
  naExpression,
  naValue,
} from '@frontend/parser';

import { useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';
import { createConditionFilterExpression } from './utils';

export function useFilterEditDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const applyConditionFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      operator: string,
      value: string | string[] | null,
      filterType: GridFilterType
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      const filterExpression = createConditionFilterExpression(
        fieldName,
        operator,
        filterType,
        value
      );

      if (!table.apply && filterExpression) {
        table.apply = new Apply();
        table.apply.filter = new ApplyFilter(filterExpression);
      } else if (table.apply && !table.apply.filter && filterExpression) {
        table.apply.filter = new ApplyFilter(filterExpression);
      } else if (table.apply?.filter && parsedApply?.filter) {
        const filterExpressions =
          parsedApply.filter.getFilterExpressionsWithModify({
            fieldName,
            conditionFilter: filterExpression,
          });

        if (filterExpressions.length > 0) {
          table.apply.filter = new ApplyFilter(filterExpressions.join(' AND '));
        } else {
          table.apply.filter = null;

          if (!table.apply.sort) {
            table.apply = null;
          }
        }
      }

      const historyTitle =
        value !== null
          ? `Change filter of ${tableName}[${fieldName}] to ${operator} ${value}`
          : `Clear filter of the ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const applyListFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      values: string[],
      isNumeric: boolean
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      const fieldFilterExpression = values
        .map((v) => `[${fieldName}] = ${getListFilterValue(isNumeric, v)}`)
        .join(' OR ');

      if (values.length === 0 && (!table.apply || !table.apply.filter)) return;

      if (!table.apply) {
        table.apply = new Apply();
        table.apply.filter = new ApplyFilter(fieldFilterExpression);
      } else if (table.apply && !table.apply.filter) {
        table.apply.filter = new ApplyFilter(fieldFilterExpression);
      } else if (table.apply.filter && parsedApply?.filter) {
        const existingFilterExpressions =
          parsedApply.filter.getFilterExpressionsWithModify({
            excludeFieldName: fieldName,
          });

        let combinedExpression = '';

        if (existingFilterExpressions.length > 0) {
          combinedExpression = `${existingFilterExpressions.join(' AND ')}`;

          if (values.length > 0) {
            combinedExpression += ' AND ';
            combinedExpression +=
              values.length > 1
                ? `(${fieldFilterExpression})`
                : fieldFilterExpression;
          }
        } else if (values.length > 0) {
          combinedExpression = fieldFilterExpression;
        }

        if (combinedExpression) {
          table.apply.filter = new ApplyFilter(combinedExpression);
        } else {
          table.apply.filter = null;

          if (!table.apply.sort) {
            table.apply = null;
          }
        }
      }

      const historyTitle =
        values.length > 0
          ? `Change filter of ${tableName}[${fieldName}] to ${values}`
          : `Clear filter of the ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  return {
    applyListFilter: useSafeCallback(applyListFilter),
    applyConditionFilter: useSafeCallback(applyConditionFilter),
  };
}

function getListFilterValue(isNumeric: boolean, value: string) {
  if (value === naValue) return naExpression;

  return isNumeric ? value : escapeValue(value);
}
