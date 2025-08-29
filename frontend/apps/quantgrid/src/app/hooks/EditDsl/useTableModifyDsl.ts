import { useCallback, useContext } from 'react';

import { isComplexType } from '@frontend/common';
import {
  Decorator,
  manualTableDecoratorName,
  ParsedOverride,
} from '@frontend/parser';

import { ViewportContext } from '../../context';
import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';

export function useTableModifyDsl() {
  const { viewGridData } = useContext(ViewportContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const autoCleanUpTableDSL = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;

      const { decorators, fields, overrides: parsedOverrides } = parsedTable;

      const hasDimensions = fields.some((f) => f.isDim);

      if (hasDimensions) return;

      const isManual = parsedTable.isManual();
      const fieldHeadersHidden = parsedTable.getIsTableFieldsHidden();
      let changesMade = false;
      let overrideChanges = false;
      let removeOverrides = false;
      let fieldsToClearCount = 0;

      if (isManual && parsedOverrides) {
        let overrideRows = parsedOverrides.getSize();

        // while bottom row has no overrides - remove the bottom row
        for (let i = overrideRows - 1; i >= 0; i--) {
          const overrideRow = parsedOverrides.getAllRowValuesAtIndex(i);

          if (!overrideRow || Object.keys(overrideRow).length === 0) break;

          const isEmptyOverrideRow = Object.values(overrideRow).every(
            (v) => !v
          );

          if (!isEmptyOverrideRow) break;

          parsedOverrides.removeRow(i);
          overrideChanges = true;
        }

        overrideRows = parsedOverrides.getSize();

        if (overrideRows === 1) {
          const overrideRow = parsedOverrides.getAllRowValuesAtIndex(0);

          if (!overrideRow) return;

          // Move formula from override to field formula
          for (const overrideFieldName of Object.keys(overrideRow)) {
            const parsedField = fields.find(
              (f) => f.key.fieldName === overrideFieldName
            );

            if (!parsedField) continue;

            const overrideValue = overrideRow[overrideFieldName];

            if (!overrideValue) continue;

            table.setFieldFormula(
              parsedField.key.fieldName,
              overrideValue.toString()
            );
            changesMade = true;
          }

          // Remove overrides
          if (table.overrides) {
            table.overrides = null;
            removeOverrides = true;
            changesMade = true;
          }
        }

        // Remove manual decorator
        if (overrideRows === 1 || overrideRows === 0) {
          const manualDecorator = decorators.find(
            (d) => d.decoratorName === manualTableDecoratorName
          );

          if (manualDecorator) {
            table.removeDecorator(manualTableDecoratorName);
            changesMade = true;
          }
        }
      }

      if (fieldHeadersHidden) {
        // Remove rightmost fields if they have no formula and no overrides
        for (let i = fields.length - 1; i >= 0; i--) {
          const parsedField = fields[i];
          const { expressionMetadata, key } = parsedField;
          const { fieldName } = key;
          const fieldOverrides =
            parsedOverrides?.getColumnValues(fieldName) || [];

          const noFormula = !expressionMetadata || !expressionMetadata.text;
          const noOverrides =
            fieldOverrides.every((v) => !v) || fieldOverrides.length === 0;

          if (!noFormula || !noOverrides) break;

          table.removeField(fieldName);
          fieldsToClearCount += 1;
          changesMade = true;

          if (parsedOverrides) {
            overrideChanges = true;
            parsedOverrides.removeField(fieldName);
          }
        }
      }

      if (!removeOverrides && overrideChanges && parsedOverrides) {
        table.overrides = parsedOverrides.applyOverrides();
        changesMade = true;
      }

      // Remove entire table if all fields are removed
      if (fieldsToClearCount === fields.length) {
        sheet.removeTable(tableName);
        changesMade = true;
      }

      if (!changesMade) return;

      const historyTitle = `Clean up table "${tableName}"`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [findEditContext, updateDSL]
  );

  const addTableRowWithConvertToManualTable = useCallback(
    (tableName: string, fieldName: string, value: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { fields, overrides } = parsedTable;
      const tableData = viewGridData.getTableData(parsedTable.tableName);
      const { types, nestedColumnNames } = tableData;

      const updatedOverrides = new ParsedOverride();

      // Move field formulas to overrides if they are not complex type
      for (const field of fields) {
        const { fieldName } = field.key;
        const isComplex = isComplexType({
          type: types[fieldName],
          isNested: nestedColumnNames.has(fieldName),
        });
        const fieldFormulaIsEmpty =
          field.expressionMetadata?.text === undefined;

        if (isComplex || fieldFormulaIsEmpty) {
          const existingOverride = overrides?.getValueAtIndex(fieldName, 0);

          if (existingOverride) {
            updatedOverrides.setFieldValueByIndex(
              fieldName,
              0,
              existingOverride
            );
          }

          continue;
        }

        updatedOverrides.setFieldValueByIndex(
          fieldName,
          0,
          field.expressionMetadata?.text || null
        );
      }

      // Clear field formulas
      for (const parsedField of fields) {
        const { fieldName } = parsedField.key;
        table.setFieldFormula(fieldName, null);
      }

      updatedOverrides.setFieldValueByIndex(fieldName, 1, value);
      table.overrides = updatedOverrides.applyOverrides();
      table.addDecorator(new Decorator(manualTableDecoratorName, '()'));

      const historyTitle = `Convert table "${tableName}" to manual table and add row`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [findEditContext, updateDSL, viewGridData]
  );

  return {
    autoCleanUpTableDSL: useSafeCallback(autoCleanUpTableDSL),
    addTableRowWithConvertToManualTable: useSafeCallback(
      addTableRowWithConvertToManualTable
    ),
  };
}
