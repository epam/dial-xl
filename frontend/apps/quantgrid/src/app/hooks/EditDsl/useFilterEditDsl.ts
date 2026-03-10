import { useCallback } from 'react';

import { GridFilterType } from '@frontend/common';
import {
  Apply,
  ApplyFilter,
  ControlType,
  escapeFieldName,
  escapeValue,
  naExpression,
  naValue,
} from '@frontend/parser';

import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';
import { createConditionFilterExpression } from './utils';

export function useFilterEditDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const applyConditionFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      operator: string,
      value: string | string[] | null,
      filterType: GridFilterType,
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      const filterExpression = createConditionFilterExpression(
        fieldName,
        operator,
        filterType,
        value,
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
    [findEditContext, updateDSL],
  );

  const applyListFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      values: string[],
      type: 'selected' | 'unselected',
      isNumeric: boolean,
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      const operator = type === 'selected' ? '=' : '<>';
      const joiner = type === 'selected' ? ' OR ' : ' AND ';
      const escapedFieldName = escapeFieldName(fieldName, false, false);
      const fullEscapedFieldName = `[${escapedFieldName}]`;
      const isNotEqualAnythingFilter =
        values.length === 0 && type === 'selected';
      const filtersLength = isNotEqualAnythingFilter ? 1 : values.length;
      const naFilter = values.includes(naValue);
      const simpleFilters = values
        .filter((v) => v !== naValue)
        .map(
          (v) =>
            `[${escapedFieldName}] ${operator} ${getListFilterValue(isNumeric, v)}`,
        )
        .join(joiner);
      let fieldFilterExpression = isNotEqualAnythingFilter
        ? `${fullEscapedFieldName} <> ${fullEscapedFieldName}`
        : simpleFilters;

      const applyNAFilter = (fieldFilterExpression: string) => {
        if (!fieldFilterExpression && !naFilter) return fieldFilterExpression;

        // Even if we just unfiltered NA we need
        if (!fieldFilterExpression) {
          const resultedNABooleanValue =
            type === 'unselected' ? 'FALSE' : 'TRUE';
          const resultedNotNABooleanValue =
            type === 'unselected' ? 'TRUE' : 'FALSE';

          return `IF(ISNA(${fullEscapedFieldName}), ${resultedNABooleanValue}, ${resultedNotNABooleanValue})`;
        }

        if (naFilter && type === 'selected') {
          return `IF(ISNA(${fullEscapedFieldName}), TRUE, ${fieldFilterExpression})`;
        }
        if (naFilter && type === 'unselected') {
          return `IF(ISNA(${fullEscapedFieldName}), FALSE, ${fieldFilterExpression})`;
        }
        if (!naFilter && type === 'unselected') {
          return `IF(ISNA(${fullEscapedFieldName}), TRUE, ${fieldFilterExpression})`;
        }

        return fieldFilterExpression;
      };

      fieldFilterExpression = applyNAFilter(fieldFilterExpression);

      if (!fieldFilterExpression && (!table.apply || !table.apply.filter))
        return;

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

          if (filtersLength > 0) {
            combinedExpression += ' AND ';
            combinedExpression +=
              values.length > 1
                ? `(${fieldFilterExpression})`
                : fieldFilterExpression;
          }
        } else if (filtersLength > 0) {
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
    [findEditContext, updateDSL],
  );

  const applyControlFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      controlTableName: string,
      controlFieldName: string,
      controlType: ControlType,
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      const controlRef = `${controlTableName}[${controlFieldName}]`;
      const filterExpression =
        controlType === 'dropdown'
          ? `[${fieldName}] = ${controlRef}`
          : `IN([${fieldName}], ${controlRef})`;

      if (!table.apply) {
        table.apply = new Apply();
        table.apply.filter = new ApplyFilter(filterExpression);
      } else if (table.apply && !table.apply.filter) {
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

      const historyTitle = `Change filter of ${tableName}[${fieldName}] to control ${controlTableName}[${controlFieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL],
  );

  const applyCustomFormulaFilter = useCallback(
    (tableName: string, fieldName: string, expression: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table } = context;

      const filterExpression = expression.trim() || null;

      if (filterExpression) {
        if (!table.apply) {
          table.apply = new Apply();
        }
        table.apply.filter = new ApplyFilter(filterExpression);
      } else {
        if (table.apply?.filter) {
          table.apply.filter = null;
          if (!table.apply.sort) {
            table.apply = null;
          }
        } else {
          return;
        }
      }

      const historyTitle =
        filterExpression !== null
          ? `Change filter of ${tableName}[${fieldName}] to custom formula`
          : `Clear filter of ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL],
  );

  const clearFieldFilters = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { apply: parsedApply } = parsedTable;

      if (!table.apply?.filter || !parsedApply?.filter) return;

      const filterExpressions =
        parsedApply.filter.getFilterExpressionsWithModify({
          excludeFieldName: fieldName,
        });

      if (filterExpressions.length > 0) {
        table.apply.filter = new ApplyFilter(filterExpressions.join(' AND '));
      } else {
        table.apply.filter = null;

        if (!table.apply.sort) {
          table.apply = null;
        }
      }

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle: `Clear filter of ${tableName}[${fieldName}]`,
        tableName,
      });
    },
    [findEditContext, updateDSL],
  );

  return {
    applyListFilter: useSafeCallback(applyListFilter),
    applyConditionFilter: useSafeCallback(applyConditionFilter),
    applyControlFilter: useSafeCallback(applyControlFilter),
    applyCustomFormulaFilter: useSafeCallback(applyCustomFormulaFilter),
    clearFieldFilters: useSafeCallback(clearFieldFilters),
  };
}

function getListFilterValue(isNumeric: boolean, value: string) {
  if (value === naValue) return naExpression;

  return isNumeric ? value : escapeValue(value);
}
