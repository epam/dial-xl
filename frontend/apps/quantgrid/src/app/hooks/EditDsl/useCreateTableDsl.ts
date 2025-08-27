import { useCallback, useContext } from 'react';

import {
  ChartType,
  ColumnDataType,
  defaultChartCols,
  defaultChartRows,
  defaultFieldName,
  isComplexType,
  isNumericType,
  isTableType,
} from '@frontend/common';
import {
  chartSizeDecoratorName,
  Decorator,
  dynamicFieldName,
  escapeFieldName,
  escapeTableName,
  Field,
  fieldColSizeDecoratorName,
  FieldGroup,
  manualTableDecoratorName,
  Override,
  Overrides,
  sanitizeExpressionOrOverride,
  Sheet,
  sourceFieldName,
  unescapeTableName,
  visualizationDecoratorName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  ViewportContext,
} from '../../context';
import { autoFixSingleExpression, createUniqueName } from '../../services';
import { getExpandedTextSize } from '../../utils';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';
import { numTotals, tableTotals, textTotals } from './useTotalEditDsl';
import {
  autoSizeTableHeader,
  createAndPlaceTable,
  CreateExpandedTableParams,
  getParsedFormulaInfo,
} from './utils';

const defaultSheetName = 'Sheet1';
const defaultTableName = 'Table1';
const defaultChartName = 'Chart1';

export function useCreateTableDsl() {
  const {
    projectName,
    sheetName,
    functions,
    parsedSheet,
    parsedSheets,
    selectedCell,
  } = useContext(ProjectContext);
  const grid = useGridApi();
  const { viewGridData } = useContext(ViewportContext);
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const createDerivedTable = useCallback(
    (tableName: string, col?: number, row?: number) => {
      const context = findEditContext(tableName);

      if (!context) return;

      const { sheet, sheetName, parsedTable } = context;
      const { fields } = parsedTable;

      let newTableCol = col;
      let newTableRow = row;
      if (!newTableCol || !newTableRow) {
        const placement = parsedTable.getPlacement();
        newTableRow = placement[0];
        newTableCol = placement[1] + fields.length + 1;
      }

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: unescapeTableName(tableName) + '_derived',
        parsedSheets,
        col: newTableCol,
        row: newTableRow,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: true,
        },
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

      fields.forEach((f, index) => {
        const { fieldName, fullFieldName } = f.key;
        table.addField({
          name: fieldName,
          formula: `[${uniqueSourceFieldName}]${fullFieldName}`,
        });
        const field = table.getField(fieldName);
        const fieldSize = getExpandedTextSize({
          text: field.name,
          col: newTableCol + index,
          grid,
          projectName,
          sheetName,
        });
        if (fieldSize && fieldSize > 1) {
          field.addDecorator(
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
          );
        }
      });

      autoSizeTableHeader(table, newTableCol, grid, projectName, sheetName);

      const historyTitle = `Add derived table "${newTableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [findEditContext, grid, parsedSheets, projectName, updateDSL]
  );

  const createSingleValueTable = useCallback(
    (
      col: number,
      row: number,
      value: string,
      tableName?: string,
      showAllHeaders?: boolean
    ) => {
      const sheet = parsedSheet?.editableSheet;
      if (!sheet) return;

      const showTableHeader = showAllHeaders ? true : !!tableName;
      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: tableName || defaultTableName,
        parsedSheets,
        col,
        row,
        layoutOptions: {
          showTableHeader,
          showFieldHeaders: showAllHeaders,
        },
      });

      const sanitizedValue = sanitizeExpressionOrOverride(value);
      table.addField({ name: defaultFieldName, formula: sanitizedValue });
      const field = table.getField(defaultFieldName);
      const fieldSize = getExpandedTextSize({
        text: field.name,
        col,
        grid,
        projectName,
        sheetName,
      });
      if (fieldSize && fieldSize > 1) {
        field.addDecorator(
          new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
        );
      }

      if (showTableHeader) {
        autoSizeTableHeader(table, col, grid, projectName, sheetName);
      }

      const historyTitle = `Add table "${newTableName}"`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [
      grid,
      parsedSheet?.editableSheet,
      parsedSheets,
      projectName,
      sheetName,
      updateDSL,
    ]
  );

  const createDimensionTable = useCallback(
    (col: number, row: number, value: string) => {
      const sheet = parsedSheet?.editableSheet;
      if (!sheet) return;

      const parts = value.split(':');
      if (parts.length < 2) return;

      const baseName = unescapeTableName(parts[0]) || defaultTableName;

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName,
        parsedSheets,
        col,
        row,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: true,
        },
      });

      parts.slice(1).forEach((part, index) => {
        const fieldName = `${sourceFieldName}${index + 1}`;
        const expression = autoFixSingleExpression(
          part.trim(),
          functions,
          parsedSheets,
          newTableName
        );
        table.addField({ name: fieldName, formula: expression, isDim: true });
        const field = table.getField(fieldName);
        const fieldSize = getExpandedTextSize({
          text: field.name,
          col: col + index,
          grid,
          projectName,
          sheetName,
        });
        if (fieldSize && fieldSize > 1) {
          field.addDecorator(
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
          );
        }
      });

      autoSizeTableHeader(table, col, grid, projectName, sheetName);

      const historyTitle = `Add dimension table "${newTableName}"`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [
      functions,
      grid,
      parsedSheet?.editableSheet,
      parsedSheets,
      projectName,
      sheetName,
      updateDSL,
    ]
  );

  const createEmptyChartTable = useCallback(
    (chartType: ChartType) => {
      const sheet = parsedSheet?.editableSheet;
      if (!sheet) return;

      const visualizationArgs = `("${chartType}")`;
      const sizeArgs = `(${defaultChartRows},${defaultChartCols})`;
      const { tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: defaultChartName,
        parsedSheets,
        col: selectedCell?.col,
        row: selectedCell?.row,
        layoutOptions: {
          showTableHeader: true,
          showFieldHeaders: true,
        },
        additionalDecorators: [
          new Decorator(visualizationDecoratorName, visualizationArgs),
          new Decorator(chartSizeDecoratorName, sizeArgs),
        ],
      });

      const historyTitle = `Add chart "${newTableName}"`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [parsedSheet, parsedSheets, selectedCell?.col, selectedCell?.row, updateDSL]
  );

  const createManualTable = useCallback(
    (
      col: number,
      row: number,
      cells: string[][],
      hideTableHeader = false,
      hideFieldHeader = false,
      customTableName?: string
    ) => {
      const sheet = parsedSheet?.editableSheet;
      if (!sheet) return;

      const rowOffset = Number(!hideTableHeader) + Number(!hideFieldHeader);
      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: customTableName || defaultTableName,
        parsedSheets,
        col,
        row: row - rowOffset,
        layoutOptions: {
          showTableHeader: !hideTableHeader,
          showFieldHeaders: !hideFieldHeader,
        },
        additionalDecorators: [new Decorator(manualTableDecoratorName, '()')],
      });

      const fieldCount = cells[0].length;
      for (let i = 0; i < fieldCount; i++) {
        const fieldName = `Column${i + 1}`;
        table.addField({
          name: fieldName,
          formula: null,
        });
        const field = table.getField(fieldName);
        const fieldSize = getExpandedTextSize({
          text: field.name,
          col: col + i,
          grid,
          projectName,
          sheetName,
        });
        if (fieldSize && fieldSize > 1) {
          field.addDecorator(
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
          );
        }
      }

      const overrides = new Overrides();
      for (let r = 0; r < cells.length; r++) {
        const override = new Override();
        for (let c = 0; c < cells[r].length; c++) {
          const value = cells[r][c];
          override.setItem(
            `Column${c + 1}`,
            sanitizeExpressionOrOverride(value)
          );
        }
        overrides.append(override);
      }
      table.overrides = overrides;

      if (!hideTableHeader) {
        autoSizeTableHeader(table, col, grid, projectName, sheetName);
      }

      const historyTitle = `Add manual table "${newTableName}"`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [
      grid,
      parsedSheet?.editableSheet,
      parsedSheets,
      projectName,
      sheetName,
      updateDSL,
    ]
  );

  const getDimensionalTableFromFormula = useCallback(
    (
      tableName: string,
      isSourceDimField: boolean,
      fieldName: string,
      formula: string,
      schema: string[],
      keys: string[],
      row: number,
      col: number,
      type: ColumnDataType,
      editableSheet?: Sheet,
      isHorizontal = false
    ) => {
      const sheet = editableSheet || new Sheet(defaultSheetName);

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: tableName || defaultTableName,
        parsedSheets,
        col,
        row,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: true,
          isHorizontal,
        },
      });

      const isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;

      if (isTableType(type) || isPeriodSeries) {
        let finalFormula = formula;

        const { isPivotFunction, isFieldReferenceFormula } =
          getParsedFormulaInfo(formula);

        // For PeriodSeries create schema manually
        if (isPeriodSeries && !isFieldReferenceFormula) {
          schema = ['date', 'value'];
        }

        const fieldsSelector =
          schema.length > 1
            ? schema
                .map((fieldName) => `[${escapeFieldName(fieldName)}]`)
                .join(',')
            : escapeFieldName(schema[0]);
        finalFormula =
          isFieldReferenceFormula || isPivotFunction
            ? formula
            : `${formula}[${fieldsSelector}]`;
        const fieldGroup = new FieldGroup(finalFormula);
        schema.forEach((fieldName, index) => {
          const field = new Field(fieldName);

          if (index === 0 && (isSourceDimField || isPeriodSeries)) {
            field.dim = true;
          }

          if (keys.includes(fieldName)) {
            field.key = true;
          }

          const fieldSize = getExpandedTextSize({
            text: fieldName,
            col: col + index,
            grid,
            projectName,
            sheetName,
          });
          if (fieldSize && fieldSize > 1) {
            field.addDecorator(
              new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
            );
          }

          fieldGroup.addField(field);
        });
        table.fieldGroups.append(fieldGroup);

        return { dsl: sheet.toDSL(), newTableName };
      }

      const finalSourceFieldName = fieldName || sourceFieldName;
      table.addField({
        name: finalSourceFieldName,
        isDim: isSourceDimField,
        formula,
      });

      const tableFields: string[] = [finalSourceFieldName];
      schema.forEach((fieldName, index) => {
        const uniqueFieldName = createUniqueName(fieldName, tableFields);
        tableFields.push(uniqueFieldName);
        table.addField({
          name: uniqueFieldName,
          formula: `[${finalSourceFieldName}][${escapeFieldName(
            uniqueFieldName
          )}]`,
          isKey: keys.includes(fieldName),
        });
        const field = table.getField(uniqueFieldName);
        const fieldSize = getExpandedTextSize({
          text: field.name,
          col: col + index,
          grid,
          projectName,
          sheetName,
        });
        if (fieldSize && fieldSize > 1) {
          field.addDecorator(
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
          );
        }
      });

      autoSizeTableHeader(table, col, grid, projectName, sheetName);

      return { dsl: sheet.toDSL(), newTableName };
    },
    [grid, parsedSheets, projectName, sheetName]
  );

  const createExpandedTable = useCallback(
    ({
      col,
      row,
      tableName,
      fieldName = '',
      formula,
      schema,
      keys,
      type,
      variant,
      keyValues,
      isSourceDimField = true,
    }: CreateExpandedTableParams) => {
      const sheet =
        variant === 'dimFormula'
          ? parsedSheet?.editableSheet
          : findEditContext(tableName)?.sheet;

      if (!sheet) return;

      const isHorizontal = variant === 'rowReference';
      let baseTableName = tableName;

      if (variant !== 'dimFormula' && keyValues !== undefined && fieldName) {
        const sanitizedKey =
          typeof keyValues === 'string'
            ? keyValues.replaceAll('"', '')
            : keyValues;
        baseTableName = `${unescapeTableName(
          tableName
        )}_(${sanitizedKey})[${fieldName}]`;
      }

      const { dsl, newTableName } = getDimensionalTableFromFormula(
        baseTableName,
        variant === 'dimFormula' ? isSourceDimField : variant === 'expand',
        fieldName,
        formula,
        schema,
        keys,
        row,
        col,
        type,
        sheet,
        isHorizontal
      );

      const titlePrefix =
        variant === 'rowReference'
          ? 'Add row reference table'
          : 'Add dimension table';

      updateDSL({
        updatedSheetContent: dsl,
        historyTitle: `${titlePrefix} "${newTableName}"`,
      });
    },
    [findEditContext, getDimensionalTableFromFormula, parsedSheet, updateDSL]
  );

  const createAllTableTotals = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, sheetName, parsedTable } = context;
      const { fields } = parsedTable;
      const tableData = viewGridData.getTableData(tableName);
      const tableStructure = viewGridData
        .getGridTableStructure()
        .find((t) => t.tableName === tableName);

      const sourceFields = fields.filter(
        (f) => f.key.fieldName !== dynamicFieldName && !f.isDynamic
      );

      const placement = parsedTable.getPlacement();
      const newTableRow = placement[0];
      let newTableCol = placement[1] + parsedTable.getTableFieldsSizes() + 1;

      if (tableStructure) {
        newTableCol = tableStructure.endCol + 2;
      }

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: unescapeTableName(tableName) + ' totals',
        parsedSheets,
        col: newTableCol,
        row: newTableRow,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: true,
        },
        additionalDecorators: [new Decorator(manualTableDecoratorName, '()')],
      });

      const statFieldName = 'Stat';
      table.addField({ name: statFieldName, formula: null });

      sourceFields
        .map((f) => f.key.fullFieldName)
        .forEach((f) => {
          table.addField({ name: f, formula: null });
        });

      const overrides = new Overrides();
      const allTotals = Array.from(
        new Set([...numTotals, ...textTotals, ...tableTotals])
      );

      allTotals.forEach((totalType) => {
        const override = new Override();
        let hasAnyExpression = false;

        sourceFields.forEach((f) => {
          const { fieldName } = f.key;
          const fieldType = tableData.types[fieldName];
          if (!fieldType) return;

          const isNum =
            isNumericType(fieldType) && numTotals.includes(totalType);
          const isText =
            fieldType === 'STRING' && textTotals.includes(totalType);
          const isTable =
            isComplexType({
              type: fieldType,
              isNested: tableData.nestedColumnNames.has(fieldName),
            }) && tableTotals.includes(totalType);

          if (isNum || isText || isTable) {
            override.setItem(statFieldName, `"${totalType.toUpperCase()}"`);
            const expression = `${totalType.toUpperCase()}(${tableName}[${fieldName}])`;
            override.setItem(fieldName, expression);
            hasAnyExpression = true;
          }
        });

        if (hasAnyExpression) {
          overrides.append(override);
        }
      });

      table.overrides = overrides;

      const historyTitle = `Add totals table "${newTableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
      });
      openTable(sheetName, escapeTableName(newTableName), 'move');
    },
    [findEditContext, openTable, parsedSheets, updateDSL, viewGridData]
  );

  return {
    createAllTableTotals: useSafeCallback(createAllTableTotals),
    createDerivedTable: useSafeCallback(createDerivedTable),
    createDimensionTable: useSafeCallback(createDimensionTable),
    createEmptyChartTable: useSafeCallback(createEmptyChartTable),
    createExpandedTable: useSafeCallback(createExpandedTable),
    createManualTable: useSafeCallback(createManualTable),
    createSingleValueTable: useSafeCallback(createSingleValueTable),
    getDimensionalTableFromFormula: useSafeCallback(
      getDimensionalTableFromFormula
    ),
  };
}
