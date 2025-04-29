import { useCallback } from 'react';

import {
  ApplyFilter,
  ApplySort,
  escapeFieldName,
  Field,
  findFieldNameInExpression,
  getLayoutParams,
  layoutDecoratorName,
  SheetReader,
} from '@frontend/parser';

import { createUniqueName } from '../../services';
import { useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';
import { editLayoutDecorator } from './utils';

export function useRenameFieldDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const renameField = useCallback(
    (
      tableName: string,
      oldFieldName: string,
      newFieldName: string,
      withShowHeaders = false
    ) => {
      const context = findEditContext(tableName, oldFieldName);
      if (!context || !context.parsedField) return;

      const { sheet, parsedTable, table } = context;
      const sanitizedNewName = escapeFieldName(newFieldName);

      if (sanitizedNewName === oldFieldName) return;

      const fields = parsedTable.fields.map((field) => field.key.fieldName);
      const uniqueNewFieldName = createUniqueName(sanitizedNewName, fields);
      const {
        overrides: parsedOverrides,
        apply: parsedApply,
        total: parsedTotal,
      } = parsedTable;

      // Rename field in overrides
      if (parsedOverrides) {
        parsedOverrides.renameField(oldFieldName, uniqueNewFieldName);
        table.overrides = parsedOverrides.applyOverrides();
      }

      // Rename field filter/sort
      if (parsedApply && table.apply) {
        const { filter, sort } = parsedApply;

        if (sort && table.apply.sort && sort.isFieldUsedInSort(oldFieldName)) {
          const fieldSortOrder = sort.getFieldSortOrder(oldFieldName);
          const sortExpressions = sort.getChangedFieldSort(
            oldFieldName,
            fieldSortOrder,
            uniqueNewFieldName
          );

          if (sortExpressions.length > 0) {
            const sort = new ApplySort();
            sortExpressions.forEach((e) => sort.append(e));
            table.apply.sort = sort;
          } else {
            table.apply.sort = null;
          }
        }

        if (filter && table.apply.filter) {
          const filterExpressions = filter.getFilterExpressionsWithModify({
            oldFieldName,
            newFieldName: uniqueNewFieldName,
          });
          const combinedExpression =
            filterExpressions.length > 0 ? filterExpressions.join(' AND ') : '';

          if (combinedExpression) {
            table.apply.filter = new ApplyFilter(combinedExpression);
          } else {
            table.apply.filter = null;
          }
        }

        if (!table.apply.sort && !table.apply.filter) {
          table.apply = null;
        }
      }

      // Rename field totals
      if (parsedTotal && parsedTotal.size > 0 && table.totalCount > 0) {
        const fieldTotals = parsedTotal.getFieldTotal(oldFieldName);

        if (fieldTotals) {
          for (const [rowStr, fieldTotal] of Object.entries(fieldTotals)) {
            const row = Number(rowStr);
            const { expression } = fieldTotal;

            try {
              const parsedExpression = SheetReader.parseFormula(expression);
              const expressionFields = findFieldNameInExpression(
                parsedExpression
              )
                .filter(
                  (i) =>
                    i.tableName === tableName &&
                    i.fieldName === `[${oldFieldName}]`
                )
                .sort((a, b) => b.start - a.start);

              let updatedExpression = expression;

              for (const field of expressionFields) {
                const { start, end } = field;

                updatedExpression =
                  updatedExpression.substring(0, start) +
                  `[${newFieldName}]` +
                  updatedExpression.substring(end + 1);
              }

              const targetTotal = table.getTotal(row);
              targetTotal.removeField(oldFieldName);
              targetTotal.addField(
                new Field(uniqueNewFieldName, updatedExpression)
              );
            } catch (e) {
              // empty block
            }
          }

          table.cleanUpTotals();
        }
      }

      if (withShowHeaders) {
        const layoutDecorator = parsedTable.decorators.find(
          ({ decoratorName }) => decoratorName === layoutDecoratorName
        );

        if (layoutDecorator) {
          const isHorizontal = parsedTable.getIsTableDirectionHorizontal();
          const { col, row } = getLayoutParams(layoutDecorator);
          const targetCol = isHorizontal ? col - 1 : col;
          const targetRow = isHorizontal ? row : row - 1;

          editLayoutDecorator(table, parsedTable, {
            targetCol,
            targetRow,
            showFieldHeaders: true,
          });
        }
      }

      const field = table.getField(oldFieldName);
      field.name = uniqueNewFieldName;

      const historyTitle = `Rename column [${oldFieldName}] to [${uniqueNewFieldName}] in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  return {
    renameField: useSafeCallback(renameField),
  };
}
