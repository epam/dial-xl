import { useCallback, useContext } from 'react';

import {
  ColumnDataType,
  defaultFieldName,
  defaultSheetName,
  defaultTableName,
  isComplexType,
  isNumericType,
  isTableType,
} from '@frontend/common';
import {
  createEditableSheet,
  Decorator,
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
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  ViewportContext,
} from '../../context';
import {
  autoFixSingleExpression,
  autoTablePlacement,
  createUniqueName,
  suggestTablePlacement,
} from '../../services';
import { getExpandedTextSize } from '../../utils';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { UpdateDslParams, useDSLUtils } from './useDSLUtils';
import { numTotals, tableTotals, textTotals } from './useTotalEditDsl';
import {
  autoSizeTableHeader,
  createAndPlaceTable,
  CreateExpandedTableParams,
  getFieldNameFromType,
  getFormulaFromSourceTable,
  getNewTablePlacementFromSourceTable,
  getParsedFormulaInfo,
} from './utils';

export function useCreateTableDsl() {
  const { projectName, sheetName, functions, parsedSheet, parsedSheets } =
    useContext(ProjectContext);
  const grid = useGridApi();
  const { viewGridData } = useContext(ViewportContext);
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const createDerivedTable = useCallback(
    (tableName: string, col?: number, row?: number) => {
      const context = findEditContext(tableName);
      if (!context || !sheetName) return;
      const currentSheet = parsedSheets[sheetName];
      const sheet = currentSheet.editableSheet;
      if (!sheet) return;

      const { parsedTable } = context;
      const { fields } = parsedTable;

      let newTableCol = col;
      let newTableRow = row;
      if (newTableCol === undefined || newTableRow === undefined) {
        [newTableCol, newTableRow] = getNewTablePlacementFromSourceTable(
          tableName,
          viewGridData,
          parsedSheets,
        );
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

      const { formula } = getFormulaFromSourceTable(parsedTable);
      const fieldGroup = new FieldGroup(formula);

      fields
        .filter((f) => !f.isDynamic)
        .forEach((parsedField, index) => {
          const { fieldName } = parsedField.key;
          const field = new Field(fieldName);

          if (index === 0) {
            field.dim = true;
          }

          const fieldSize = getExpandedTextSize({
            text: fieldName,
            col: newTableCol + index,
            grid,
            projectName,
            sheetName,
          });
          if (fieldSize && fieldSize > 1) {
            field.addDecorator(
              new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
            );
          }

          fieldGroup.addField(field);
        });
      table.fieldGroups.append(fieldGroup);

      autoSizeTableHeader(table, newTableCol, grid, projectName, sheetName);

      const historyTitle = `Add derived table "${newTableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [
      findEditContext,
      grid,
      parsedSheets,
      projectName,
      sheetName,
      updateDSL,
      viewGridData,
    ],
  );

  const createSingleValueTable = useCallback(
    (
      col: number,
      row: number,
      value: string,
      tableName?: string,
      showAllHeaders?: boolean,
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
          new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
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
    ],
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
        const fieldName = `Column${index + 1}`;
        const expression = autoFixSingleExpression(
          part.trim(),
          functions,
          parsedSheets,
          newTableName,
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
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
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
    ],
  );

  const createManualTable = useCallback(
    (
      col: number,
      row: number,
      cells: string[][],
      hideTableHeader = false,
      hideFieldHeader = false,
      customTableName?: string,
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
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
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
            sanitizeExpressionOrOverride(value),
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
    ],
  );

  const getDimensionalTableFromFormula = useCallback(
    ({
      tableName,
      isSourceDimField,
      fieldName,
      formula,
      schema,
      keys,
      row,
      col,
      type,
      isAssignable,
      editableSheet,
      isHorizontal = false,
      includeLayoutDecorator = true,
    }: {
      tableName: string;
      isSourceDimField: boolean;
      fieldName: string;
      formula: string;
      schema: string[];
      keys: string[];
      row: number;
      col: number;
      type: ColumnDataType;
      isAssignable: boolean;
      editableSheet?: Sheet;
      isHorizontal?: boolean;
      includeLayoutDecorator?: boolean;
    }) => {
      const sheet = editableSheet || new Sheet(defaultSheetName);

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: tableName || defaultTableName,
        parsedSheets: parsedSheets || {},
        col,
        row,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: true,
          isHorizontal,
        },
        includeLayoutDecorator,
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

        const shouldAddMultiAccessor =
          isPeriodSeries ||
          type === ColumnDataType.TABLE_REFERENCE ||
          !isAssignable;

        const fieldsSelector =
          schema.length > 1
            ? schema
                .map((fieldName) => `[${escapeFieldName(fieldName)}]`)
                .join(',')
            : schema.length
              ? escapeFieldName(schema[0])
              : '';

        finalFormula =
          isFieldReferenceFormula || isPivotFunction
            ? formula
            : shouldAddMultiAccessor
              ? `${formula}[${fieldsSelector}]`
              : formula;

        const tableFields: string[] = [];
        const fieldGroup = new FieldGroup(finalFormula);
        schema.forEach((fieldName, index) => {
          const uniqueFieldName = createUniqueName(fieldName, tableFields);
          tableFields.push(uniqueFieldName);

          const field = new Field(uniqueFieldName);

          if (index === 0 && (isSourceDimField || isPeriodSeries)) {
            field.dim = true;
          }

          if (keys.includes(fieldName)) {
            field.key = true;
          }

          const fieldSize = getExpandedTextSize({
            text: uniqueFieldName,
            col: col + index,
            grid,
            projectName,
            sheetName,
          });
          if (fieldSize && fieldSize > 1) {
            field.addDecorator(
              new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
            );
          }

          fieldGroup.addField(field);
        });
        table.fieldGroups.append(fieldGroup);

        return { dsl: sheet.toDSL(), newTableName };
      }

      const finalSourceFieldName = fieldName
        ? fieldName
        : getFieldNameFromType(type);
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
            uniqueFieldName,
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
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`),
          );
        }
      });

      autoSizeTableHeader(table, col, grid, projectName, sheetName);

      return { dsl: sheet.toDSL(), newTableName };
    },
    [grid, parsedSheets, projectName, sheetName],
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
      isAssignable,
      isSourceDimField = true,
      createInNewSheet = false,
    }: CreateExpandedTableParams) => {
      let sheet =
        variant === 'dimFormula'
          ? parsedSheet?.editableSheet
          : findEditContext(tableName)?.sheet;

      if (createInNewSheet) {
        sheet = createEditableSheet(defaultSheetName, '', []);
      }

      if (!sheet || !sheetName) return;

      const isHorizontal = variant === 'rowReference';
      let baseTableName = tableName;

      if (variant !== 'dimFormula' && keyValues !== undefined && fieldName) {
        const sanitizedKey =
          typeof keyValues === 'string'
            ? keyValues.replaceAll('"', '')
            : keyValues;
        baseTableName = `${unescapeTableName(
          tableName,
        )}_(${sanitizedKey})[${fieldName}]`;
      }

      let adjustedCol = col;
      let adjustedRow = row;

      // Primarily for creating table from inputs when the user does not specify column and row.
      const isAnyPlacement = col === 0 || row === 0;
      if (!createInNewSheet && parsedSheet && isAnyPlacement) {
        const tablePlacement = suggestTablePlacement(
          parsedSheet,
          viewGridData.getGridTableStructure(),
          grid,
          null,
          null,
          schema.length,
          100,
        );

        if (tablePlacement) {
          adjustedCol = tablePlacement.col;
          adjustedRow = tablePlacement.row;
        }
      }

      const { dsl, newTableName } = getDimensionalTableFromFormula({
        tableName: baseTableName,
        isSourceDimField:
          variant === 'dimFormula' ? isSourceDimField : variant === 'expand',
        fieldName,
        formula,
        schema,
        keys,
        row: adjustedRow,
        col: adjustedCol,
        type,
        editableSheet: sheet,
        isHorizontal,
        isAssignable,
      });

      const titlePrefix =
        variant === 'rowReference'
          ? 'Add row reference table'
          : 'Add dimension table';

      const sheetNameToChange = createInNewSheet
        ? createUniqueName(tableName, Object.keys(parsedSheets))
        : sheetName;

      updateDSL({
        updatedSheetContent: dsl,
        historyTitle: `${titlePrefix} "${newTableName}"`,
        sheetNameToChange,
      });

      if (createInNewSheet || isAnyPlacement) {
        openTable(sheetNameToChange, newTableName);
      }
    },
    [
      grid,
      viewGridData,
      findEditContext,
      getDimensionalTableFromFormula,
      openTable,
      parsedSheet,
      parsedSheets,
      sheetName,
      updateDSL,
    ],
  );

  const createAllTableTotals = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, sheetName, parsedTable } = context;
      const tableData = viewGridData.getTableData(tableName);
      const sourceFields = parsedTable.getFieldsWithoutDynamic();
      const [col, row] = getNewTablePlacementFromSourceTable(
        tableName,
        viewGridData,
        parsedSheets,
      );

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName: unescapeTableName(tableName) + ' totals',
        parsedSheets,
        col,
        row,
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
        new Set([...numTotals, ...textTotals, ...tableTotals]),
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
            override.setItem(unescapeFieldName(fieldName), expression);
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
    [findEditContext, openTable, parsedSheets, updateDSL, viewGridData],
  );

  const createMultipleExpandedTables = useCallback(
    (
      requests: Array<{
        tableName: string;
        formula: string;
        schema: string[];
        keys: string[];
        type: ColumnDataType;
        isAssignable: boolean;
        isSourceDimField?: boolean;
      }>,
      inNewSheet: boolean,
    ) => {
      const historyTitle = `Add ${requests.length} input${
        requests.length > 1 ? 's' : ''
      } to the project`;

      if (inNewSheet) {
        const usedSheetNames = new Set(Object.keys(parsedSheets));
        const dslChanges: UpdateDslParams[] = [];

        requests.forEach(
          ({
            tableName,
            formula,
            schema,
            keys,
            type,
            isAssignable,
            isSourceDimField = true,
          }) => {
            const newSheetName = createUniqueName(
              tableName,
              Array.from(usedSheetNames),
            );
            usedSheetNames.add(newSheetName);

            const sheet = createEditableSheet(newSheetName, '', []);

            const { dsl } = getDimensionalTableFromFormula({
              tableName,
              isSourceDimField,
              fieldName: '',
              formula,
              schema,
              keys,
              row: 0,
              col: 0,
              type,
              isAssignable,
              editableSheet: sheet,
            });

            dslChanges.push({
              updatedSheetContent: dsl,
              historyTitle,
              sheetNameToChange: newSheetName,
            });
          },
        );

        if (dslChanges.length > 0) {
          updateDSL(dslChanges);
        }
      } else {
        const sheet = parsedSheet?.editableSheet;
        if (!sheet || !sheetName) return;

        requests.forEach(
          ({
            tableName,
            formula,
            schema,
            keys,
            type,
            isAssignable,
            isSourceDimField = true,
          }) => {
            getDimensionalTableFromFormula({
              tableName,
              isSourceDimField,
              fieldName: '',
              formula,
              schema,
              keys,
              row: 0,
              col: 0,
              type,
              isAssignable,
              editableSheet: sheet,
              includeLayoutDecorator: false,
            });
          },
        );

        const updatedSheetContent = autoTablePlacement(
          sheet.toDSL(),
          viewGridData.getGridTableStructure(),
          grid,
          projectName,
          sheetName,
        );

        updateDSL({
          updatedSheetContent,
          historyTitle,
        });
      }
    },
    [
      getDimensionalTableFromFormula,
      grid,
      parsedSheet?.editableSheet,
      parsedSheets,
      projectName,
      sheetName,
      updateDSL,
      viewGridData,
    ],
  );

  return {
    createAllTableTotals: useSafeCallback(createAllTableTotals),
    createDerivedTable: useSafeCallback(createDerivedTable),
    createDimensionTable: useSafeCallback(createDimensionTable),
    createExpandedTable: useSafeCallback(createExpandedTable),
    createManualTable: useSafeCallback(createManualTable),
    createMultipleExpandedTables: useSafeCallback(createMultipleExpandedTables),
    createSingleValueTable: useSafeCallback(createSingleValueTable),
    getDimensionalTableFromFormula: useSafeCallback(
      getDimensionalTableFromFormula,
    ),
  };
}
