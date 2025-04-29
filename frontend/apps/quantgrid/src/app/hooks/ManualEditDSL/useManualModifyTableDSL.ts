import { useCallback, useContext } from 'react';

import { isComplexType } from '@frontend/common';
import {
  manualTableDecorator,
  manualTableDecoratorName,
  newLine,
  overrideKeyword,
  ParsedOverride,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { useDSLUtils } from './useDSLUtils';

type DslChange = {
  start: number;
  end: number;
  content: string;
};

export function useManualModifyTableDSL() {
  const { sheetContent } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { findTable, updateDSL } = useDSLUtils();

  const autoCleanUpTableDSL = useCallback(
    (tableName: string) => {
      const targetTable = findTable(tableName);

      if (!sheetContent || !targetTable) return;

      const { dslPlacement, dslOverridePlacement, decorators } = targetTable;

      if (!dslPlacement) return;

      const hasDimensions = targetTable.fields.some((f) => f.isDim);

      if (hasDimensions) return;

      const { fields, overrides } = targetTable;
      const isManual = targetTable.isManual();
      const fieldHeadersHidden = targetTable.getIsTableFieldsHidden();
      let dslChanges: DslChange[] = [];
      let overrideChanges = false;
      let removeOverrides = false;
      let fieldsToClearCount = 0;

      if (isManual && overrides) {
        let overrideRows = overrides.getSize();

        // while bottom row has no overrides - remove the bottom row
        for (let i = overrideRows - 1; i >= 0; i--) {
          const overrideRow = overrides.getAllRowValuesAtIndex(i);

          if (!overrideRow || Object.keys(overrideRow).length === 0) break;

          const isEmptyOverrideRow = Object.values(overrideRow).every(
            (v) => !v
          );

          if (!isEmptyOverrideRow) break;

          overrides.removeRow(i);
          overrideChanges = true;
        }

        overrideRows = overrides.getSize();

        if (overrideRows === 1) {
          const overrideRow = overrides.getAllRowValuesAtIndex(0);

          if (!overrideRow) return;

          // Move formula from override to field formula
          for (const overrideFieldName of Object.keys(overrideRow)) {
            const field = fields.find(
              (f) => f.key.fieldName === overrideFieldName
            );

            if (!field) continue;

            const overrideValue = overrideRow[overrideFieldName];

            if (!overrideValue) continue;

            const { expressionMetadata, dslFieldNamePlacement } = field;

            if (!dslFieldNamePlacement) continue;

            const fieldFormula = expressionMetadata
              ? overrideValue.toString()
              : ` = ${overrideValue}`;

            dslChanges.push({
              start: expressionMetadata?.start || dslFieldNamePlacement.end,
              end: (expressionMetadata?.end || dslFieldNamePlacement.end) + 1,
              content: fieldFormula,
            });
          }

          // Remove overrides
          if (dslOverridePlacement) {
            dslChanges.push({
              start: dslOverridePlacement.startOffset,
              end: dslOverridePlacement.stopOffset + 1,
              content: '',
            });
            removeOverrides = true;
          }
        }

        // Remove manual decorator
        if (overrideRows === 1 || overrideRows === 0) {
          const manualDecorator = decorators.find(
            (d) => d.decoratorName === manualTableDecoratorName
          );

          if (manualDecorator?.dslPlacement) {
            dslChanges.push({
              start: manualDecorator.dslPlacement.start,
              end: manualDecorator.dslPlacement.end,
              content: newLine,
            });
          }
        }
      }

      if (fieldHeadersHidden) {
        // Remove rightmost fields if they have no formula and no overrides
        for (let i = fields.length - 1; i >= 0; i--) {
          const field = fields[i];
          const { expressionMetadata, dslPlacement, key } = field;
          const { fieldName } = key;
          const fieldOverrides = overrides?.getColumnValues(fieldName) || [];

          const noFormula = !expressionMetadata || !expressionMetadata.text;
          const noOverrides =
            fieldOverrides.every((v) => !v) || fieldOverrides.length === 0;

          if (!dslPlacement || !(noFormula && noOverrides)) break;

          dslChanges.push({
            start: dslPlacement.start,
            end: dslPlacement.end + 1,
            content: '',
          });
          fieldsToClearCount += 1;

          if (overrides) {
            overrideChanges = true;
            overrides.removeField(fieldName);
          }
        }
      }

      if (
        overrideChanges &&
        !removeOverrides &&
        overrides &&
        dslOverridePlacement
      ) {
        const overrideDsl = overrides.convertToDsl();
        const fullOverrideDsl = overrideDsl
          ? `${newLine}${overrideKeyword}${newLine}${overrideDsl}${newLine}`
          : '';

        dslChanges.push({
          start: dslOverridePlacement.startOffset,
          end: dslOverridePlacement.stopOffset + 1,
          content: fullOverrideDsl,
        });
      }

      // Remove entire table if all fields are removed
      if (fieldsToClearCount === fields.length) {
        dslChanges = [
          {
            start: dslPlacement.startOffset,
            end: dslPlacement.stopOffset + 1,
            content: '',
          },
        ];
      }

      if (dslChanges.length === 0) return;

      const reversedDslChanges = dslChanges.sort((a, b) => b.start - a.start);
      let updatedSheetContent = sheetContent;

      for (const { start, end, content } of reversedDslChanges) {
        updatedSheetContent =
          updatedSheetContent.substring(0, start).trimEnd() +
          content +
          updatedSheetContent.substring(end);
      }

      const historyTitle = `Clean up table "${tableName}"`;
      updateDSL({ updatedSheetContent, historyTitle });
    },
    [findTable, sheetContent, updateDSL]
  );

  const addTableRowWithConvertToManualTable = useCallback(
    (tableName: string, fieldName: string, value: string) => {
      const targetTable = findTable(tableName);

      if (!sheetContent || !targetTable) return;

      const { dslPlacement, dslOverridePlacement } = targetTable;

      if (!dslPlacement) return;

      let updatedSheetContent = sheetContent;
      const tableData = viewGridData.getTableData(targetTable.tableName);
      const { types, nestedColumnNames } = tableData;

      const updatedOverrides = new ParsedOverride();

      // Move field formulas to overrides if they are not complex type
      for (const field of targetTable.fields) {
        const { fieldName } = field.key;
        const isComplex = isComplexType({
          type: types[fieldName],
          isNested: nestedColumnNames.has(fieldName),
        });
        const fieldFormulaIsEmpty =
          field.expressionMetadata?.text === undefined;

        if (isComplex || fieldFormulaIsEmpty) {
          const existingOverride = targetTable.overrides?.getValueAtIndex(
            fieldName,
            0
          );

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

      updatedOverrides.setFieldValueByIndex(fieldName, 1, value);

      // Update overrides dsl
      const overrideDsl = updatedOverrides.convertToDsl();
      const fullOverrideDsl = overrideDsl
        ? `${newLine}${overrideKeyword}${newLine}${overrideDsl}${newLine}${newLine}`
        : '';
      const start = dslOverridePlacement
        ? dslOverridePlacement.startOffset
        : dslPlacement.stopOffset;
      const stop = dslOverridePlacement
        ? dslOverridePlacement.stopOffset
        : dslPlacement.stopOffset;

      updatedSheetContent =
        updatedSheetContent.substring(0, start).trimEnd() +
        fullOverrideDsl +
        updatedSheetContent.substring(stop + 1).trimStart();

      // Remove field expressions
      const fieldsToClear = targetTable.fields.sort((a, b) => {
        if (!a.dslFieldNamePlacement || !b.dslFieldNamePlacement) return 0;

        return b.dslFieldNamePlacement.start - a.dslFieldNamePlacement.start;
      });

      for (const field of fieldsToClear) {
        const { expressionMetadata, dslFieldNamePlacement } = field;

        if (!expressionMetadata || !dslFieldNamePlacement) continue;

        updatedSheetContent =
          updatedSheetContent.substring(0, dslFieldNamePlacement.end) +
          ' ' +
          updatedSheetContent.substring(expressionMetadata.end + 1);
      }

      // Add manual table decorator
      updatedSheetContent =
        updatedSheetContent.substring(0, dslPlacement.startOffset) +
        `${manualTableDecorator}${newLine}` +
        updatedSheetContent.substring(dslPlacement.startOffset);

      const historyTitle = `Convert table "${tableName}" to manual table and add row`;
      updateDSL({ updatedSheetContent, historyTitle });
    },
    [findTable, sheetContent, updateDSL, viewGridData]
  );

  return {
    autoCleanUpTableDSL,
    addTableRowWithConvertToManualTable,
  };
}
