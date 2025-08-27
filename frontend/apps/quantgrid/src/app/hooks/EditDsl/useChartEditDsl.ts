import { useCallback, useContext } from 'react';

import {
  ChartOrientation,
  ChartType,
  defaultChartCols,
  defaultChartRows,
  isNumericType,
} from '@frontend/common';
import {
  chartHorizontalDecoratorArg,
  chartSelectorDecoratorName,
  chartSeparatorDecoratorName,
  chartSizeDecoratorName,
  chartXAxisDecoratorName,
  Decorator,
  escapeValue,
  lineBreak,
  ParsedTable,
  sourceFieldName,
  unescapeFieldName,
  unescapeTableName,
  visualizationDecoratorName,
} from '@frontend/parser';

import { ChartOrientationValues } from '../../components/Panels/Chart/Components';
import { chartsWithRowNumber } from '../../components/Panels/Chart/utils';
import { ProjectContext, ViewportContext } from '../../context';
import { createUniqueName } from '../../services';
import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';
import {
  createAndPlaceTable,
  editFieldDecorator,
  editTableDecorator,
} from './utils';

export function useChartEditDsl() {
  const { viewGridData } = useContext(ViewportContext);
  const { parsedSheets } = useContext(ProjectContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const getInitialRowNumberArgs = useCallback(
    (parsedTable: ParsedTable, orientation: ChartOrientation): string => {
      let args = `()`;

      if (orientation === 'horizontal') {
        const tableData = viewGridData.getTableData(parsedTable.tableName);
        const { types } = tableData;
        const numericFieldNames = parsedTable.fields
          .filter((f) => {
            return isNumericType(types[f.key.fieldName]);
          })
          .map((f) => f.key.fieldName);

        if (numericFieldNames.length > 0) {
          args = `("${numericFieldNames[0]}")`;
        }
      } else {
        args = `(1)`;
      }

      return args;
    },
    [viewGridData]
  );

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

      const initialOrientation = viewGridData.getChartInitialOrientation(
        parsedTable,
        chartType
      );

      const textFieldNameWithAllUnique =
        viewGridData.findFirstTextColumnWithAllUniques(parsedTable);
      const unescapedTableName = unescapeTableName(tableName);
      const baseName = `${unescapedTableName}_${chartType}`;
      const [row, col] = parsedTable.getPlacement();
      const newCol = col + fields.length + 1;
      const visualizationArgs =
        initialOrientation === 'horizontal'
          ? `("${chartType}","${chartHorizontalDecoratorArg}")`
          : `("${chartType}")`;

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
      table.addField({
        name: uniqueSourceFieldName,
        formula: tableName,
        isDim: true,
      });

      fields
        .map((f) => f.key)
        .forEach(({ fullFieldName, fieldName }) => {
          table.addField({
            name: fullFieldName,
            formula: `[${uniqueSourceFieldName}]${fullFieldName}`,
          });

          if (fieldName === textFieldNameWithAllUnique) {
            const field = table.getField(fieldName);
            editFieldDecorator(field, chartXAxisDecoratorName, '()');
          }
        });

      const isRowNumber = chartsWithRowNumber.includes(chartType);

      if (isRowNumber) {
        const args = getInitialRowNumberArgs(parsedTable, initialOrientation);
        editTableDecorator(table, chartSelectorDecoratorName, args);
      }

      const historyTitle = `Add chart "${newChartName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [
      findEditContext,
      parsedSheets,
      updateDSL,
      viewGridData,
      getInitialRowNumberArgs,
    ]
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
      table.addField({
        name: uniqueSourceFieldName,
        formula: sourceTableName,
        isDim: true,
      });

      fields
        .map((f) => f.key.fullFieldName)
        .forEach((fullName) => {
          table.addField({
            name: fullName,
            formula: `[${uniqueSourceFieldName}]${fullName}`,
          });
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

  const updateChartOrientation = useCallback(
    (tableName: string, value: ChartOrientationValues) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, table, parsedTable } = context;

      const chartType = parsedTable.getChartType();
      const isRowsNumber = chartType && chartsWithRowNumber.includes(chartType);
      const currentChartOrientation = parsedTable.getChartOrientation();
      const currentVisualizationArgs =
        parsedTable.getVisualisationDecoratorValues();

      if (
        !currentVisualizationArgs ||
        !currentVisualizationArgs.length ||
        value === currentChartOrientation
      )
        return;

      const chartTypeArg = escapeValue(currentVisualizationArgs[0]);

      if (value === 'vertical') {
        const args = `(${chartTypeArg})`;
        const success = editTableDecorator(
          table,
          visualizationDecoratorName,
          args
        );
        if (!success) return;
      }

      if (value === 'horizontal') {
        const args = `(${chartTypeArg}, "${chartHorizontalDecoratorArg}")`;
        const success = editTableDecorator(
          table,
          visualizationDecoratorName,
          args
        );
        if (!success) return;
      }

      if (isRowsNumber) {
        const args = getInitialRowNumberArgs(parsedTable, value);
        editTableDecorator(table, chartSelectorDecoratorName, args);
      } else {
        editTableDecorator(table, chartSelectorDecoratorName, '', true);
      }

      const historyTitle = `Update chart orientation "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [findEditContext, getInitialRowNumberArgs, updateDSL]
  );

  const setChartType = useCallback(
    (tableName: string, chartType: ChartType) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, table, parsedTable } = context;
      const currentChartType = parsedTable.getChartType();
      if (currentChartType === chartType) return;

      const initialOrientation = viewGridData.getChartInitialOrientation(
        parsedTable,
        chartType
      );
      const isRowNumber = chartsWithRowNumber.includes(chartType);
      const textFieldNameWithAllUnique =
        viewGridData.findFirstTextColumnWithAllUniques(parsedTable);

      const visualizationArgs =
        initialOrientation === 'horizontal'
          ? `("${chartType}","${chartHorizontalDecoratorArg}")`
          : `("${chartType}")`;

      const success = editTableDecorator(
        table,
        visualizationDecoratorName,
        visualizationArgs
      );

      if (!success) return;

      parsedTable.fields.forEach((f) => {
        const { fieldName } = f.key;

        if (fieldName === textFieldNameWithAllUnique) {
          const field = table.getField(fieldName);
          editFieldDecorator(field, chartXAxisDecoratorName, '()');
        } else if (f.isChartXAxis()) {
          const field = table.getField(fieldName);
          editFieldDecorator(field, chartXAxisDecoratorName, '', true);
        }
      });

      if (isRowNumber) {
        const args = getInitialRowNumberArgs(parsedTable, initialOrientation);
        editTableDecorator(table, chartSelectorDecoratorName, args);
      } else {
        editTableDecorator(table, chartSelectorDecoratorName, '', true);
      }

      const historyTitle = currentChartType
        ? `Change chart ${tableName} type to ${chartType}`
        : `Convert table ${tableName} to chart`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, getInitialRowNumberArgs, updateDSL, viewGridData]
  );

  return {
    addChart: useSafeCallback(addChart),
    chartResize: useSafeCallback(chartResize),
    setChartType: useSafeCallback(setChartType),
    updateChartOrientation: useSafeCallback(updateChartOrientation),
    selectTableForChart: useSafeCallback(selectTableForChart),
    updateChartSections: useSafeCallback(updateChartSections),
    updateSelectorValue: useSafeCallback(updateSelectorValue),
  };
}
