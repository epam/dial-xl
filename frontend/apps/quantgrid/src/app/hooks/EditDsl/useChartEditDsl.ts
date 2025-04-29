import { useCallback, useContext } from 'react';

import {
  ChartType,
  defaultChartCols,
  defaultChartRows,
} from '@frontend/common';
import {
  chartSelectorDecoratorName,
  chartSeparatorDecoratorName,
  chartSizeDecoratorName,
  Decorator,
  Field,
  lineBreak,
  sourceFieldName,
  unescapeFieldName,
  unescapeTableName,
  visualizationDecoratorName,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { createUniqueName } from '../../services';
import { useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';
import {
  createAndPlaceTable,
  editFieldDecorator,
  editTableDecorator,
} from './utils';

export function useChartEditDsl() {
  const { parsedSheets } = useContext(ProjectContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const chartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, parsedTable, table } = context;
      const chartSize = parsedTable.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      if (chartRows === rows && chartCols === cols) return;

      const args = `(${rows}, ${cols})`;
      const success = editTableDecorator(table, chartSizeDecoratorName, args);

      if (!success) return;

      const historyTitle = `Resize chart "${tableName}" to (${rows}, ${cols})`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        sheetNameToChange: sheetName,
      });
    },
    [findEditContext, updateDSL]
  );

  const updateSelectorValue = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: number | string,
      hasNoData: boolean
    ) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !context?.parsedField) return;

      const { sheet, sheetName, field, table, parsedTable, parsedField } =
        context;

      const fieldsToUpdate = hasNoData
        ? parsedTable.fields.filter((f) => f.isChartSelector())
        : [parsedField];

      if (!fieldsToUpdate.length) return;

      fieldsToUpdate.forEach((f) => {
        const currentFieldName = f.key.fieldName;
        if (currentFieldName === fieldName) {
          const decoratorArgs = `(${value})` + lineBreak;
          const success = editFieldDecorator(
            field,
            chartSelectorDecoratorName,
            decoratorArgs
          );
          if (!success) return;
        } else {
          const decoratorArgs = '()' + lineBreak;
          const fieldToRemoveSelector = table.getField(
            unescapeFieldName(currentFieldName)
          );
          const success = editFieldDecorator(
            fieldToRemoveSelector,
            chartSelectorDecoratorName,
            decoratorArgs
          );
          if (!success) return;
        }
      });

      const historyTitle = `Update selector for the chart ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [findEditContext, updateDSL]
  );

  const addChart = useCallback(
    (tableName: string, chartType: ChartType) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { parsedTable, sheet, sheetName } = context;
      const { fields } = parsedTable;

      const unescapedTableName = unescapeTableName(tableName);
      const baseName = `${unescapedTableName}_${chartType}`;
      const [row, col] = parsedTable.getPlacement();
      const newCol = col + fields.length + 1;
      const visualizationArgs = `("${chartType}")`;

      const { table, tableName: newChartName } = createAndPlaceTable({
        sheet,
        baseName,
        parsedSheets,
        col: newCol,
        row,
        layoutOptions: {
          showTableHeader: true,
          showFieldHeaders: true,
        },
        additionalDecorators: [
          new Decorator(visualizationDecoratorName, visualizationArgs),
        ],
      });

      const uniqueSourceFieldName = createUniqueName(
        sourceFieldName,
        fields.map((f) => f.key.fieldName)
      );
      const sourceField = new Field(uniqueSourceFieldName, tableName);
      sourceField.dim = true;
      table.addField(sourceField);

      fields
        .map((f) => f.key.fullFieldName)
        .forEach((fullName) => {
          table.addField(
            new Field(fullName, `[${uniqueSourceFieldName}]${fullName}`)
          );
        });

      const historyTitle = `Add chart "${newChartName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [findEditContext, parsedSheets, updateDSL]
  );

  const selectTableForChart = useCallback(
    (sourceTableName: string, targetTableName: string) => {
      const sourceContext = findEditContext(sourceTableName);
      const targetContext = findEditContext(targetTableName);

      if (!sourceContext || !targetContext) return;

      const { parsedTable: sourceParsedTable } = sourceContext;
      const { table, sheet } = targetContext;
      const { fields } = sourceParsedTable;

      const uniqueSourceFieldName = createUniqueName(
        sourceFieldName,
        fields.map((f) => f.key.fieldName)
      );
      const sourceField = new Field(uniqueSourceFieldName, sourceTableName);
      sourceField.dim = true;
      table.addField(sourceField);

      fields
        .map((f) => f.key.fullFieldName)
        .forEach((fullName) => {
          table.addField(
            new Field(fullName, `[${uniqueSourceFieldName}]${fullName}`)
          );
        });

      const historyTitle = `Select table "${sourceTableName}" for chart "${targetTableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        tableName: targetTableName,
        historyTitle,
      });
    },
    [findEditContext, updateDSL]
  );

  const updateChartSections = useCallback(
    (tableName: string, updatedSections: Record<string | number, string[]>) => {
      const sourceContext = findEditContext(tableName);
      if (!sourceContext) return;

      const { table, parsedTable, sheet } = sourceContext;
      const updatedFieldOrder = Object.values(updatedSections).flat();
      const currentFieldOrder = parsedTable.fields
        .map((f) => f.key.fieldName)
        .filter((f) => updatedFieldOrder.includes(f));

      for (let i = updatedFieldOrder.length - 1; i >= 0; i--) {
        const sourceFieldName = updatedFieldOrder[i];
        const targetFieldName =
          i + 1 < updatedFieldOrder.length ? updatedFieldOrder[i + 1] : null;

        const sourceIndex = currentFieldOrder.indexOf(sourceFieldName);
        if (sourceIndex === -1) continue;

        if (targetFieldName) {
          const targetIndex = currentFieldOrder.indexOf(targetFieldName);
          const validTarget = targetIndex !== -1;

          const alreadyBeforeTarget =
            validTarget && sourceIndex + 1 === targetIndex;
          if (!alreadyBeforeTarget) {
            table.moveFieldBeforeOrAfter(
              sourceFieldName,
              validTarget ? targetFieldName : null,
              true
            );

            currentFieldOrder.splice(sourceIndex, 1);
            let insertAt = validTarget ? targetIndex : currentFieldOrder.length;
            if (validTarget && sourceIndex < targetIndex) {
              insertAt--;
            }
            currentFieldOrder.splice(insertAt, 0, sourceFieldName);
          }
        } else {
          if (sourceIndex !== currentFieldOrder.length - 1) {
            table.moveFieldBeforeOrAfter(sourceFieldName, null, true);
            currentFieldOrder.splice(sourceIndex, 1);
            currentFieldOrder.push(sourceFieldName);
          }
        }
      }

      parsedTable.fields.forEach((f) => {
        if (f.isChartSeparator()) {
          const field = table.getField(f.key.fieldName);
          editFieldDecorator(field, chartSeparatorDecoratorName, '', true);
        }
      });

      Object.keys(updatedSections).forEach((sectionKey, index) => {
        const fieldsInSection = updatedSections[sectionKey] ?? [];
        if (fieldsInSection.length === 0 || index === 0) return;

        const field = table.getField(fieldsInSection[0]);
        editFieldDecorator(field, chartSeparatorDecoratorName, '()');
      });

      const historyTitle = `Update chart sections for ${tableName}`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  return {
    addChart: useSafeCallback(addChart),
    chartResize: useSafeCallback(chartResize),
    selectTableForChart: useSafeCallback(selectTableForChart),
    updateChartSections: useSafeCallback(updateChartSections),
    updateSelectorValue: useSafeCallback(updateSelectorValue),
  };
}
