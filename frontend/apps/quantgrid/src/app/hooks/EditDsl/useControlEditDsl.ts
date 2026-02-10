import { useCallback, useContext } from 'react';

import { isNumericType } from '@frontend/common';
import {
  ControlType,
  Decorator,
  escapeValue,
  findFunctionExpressions,
  hasGlobalOffsets,
  unescapeTableName,
} from '@frontend/parser';

import { ControlRow } from '../../components/Panels/ControlWizard';
import { ProjectContext, ViewportContext } from '../../context';
import { createUniqueName, suggestTablePlacement } from '../../services';
import { createAndPlaceTable, getControlType, useDSLUtils } from '../EditDsl';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';

export function useControlEditDsl() {
  const { parsedSheet, parsedSheets } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const gridApi = useGridApi();
  const { updateDSL, findEditContext } = useDSLUtils();

  const updateSelectedControlValue = useCallback(
    (tableName: string, fieldName: string, values: string[]) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !context?.parsedField) return;

      const { sheetName, sheet, table, parsedField } = context;

      if (!parsedField?.expression) return;

      const initialFormula = parsedField.expressionMetadata?.text;
      if (!initialFormula) return;

      const controlType = getControlType(initialFormula);
      if (!controlType) return;

      const tableData = viewGridData.getTableData(tableName);
      if (!tableData) return;

      const { types } = tableData;
      const isFieldNumeric = isNumericType(types[fieldName]);

      let updatedValuesString = '';

      if (controlType === 'dropdown') {
        if (values.length > 0) {
          updatedValuesString = isFieldNumeric
            ? values[0]
            : `${escapeValue(values[0])}`;
        } else {
          updatedValuesString = '';
        }
      }

      if (controlType === 'checkbox') {
        if (values.length > 0) {
          const formattedValues = values.map((v) =>
            isFieldNumeric ? v : `${escapeValue(v)}`
          );
          updatedValuesString = `{${formattedValues.join(', ')}}`;
        } else {
          updatedValuesString = '';
        }
      }

      const controlExpression = findFunctionExpressions(
        parsedField.expression
      ).filter((fn) => controlType.toUpperCase() === fn.name);

      if (controlExpression.length !== 1) return;

      const controlExpressionObj = controlExpression[0];
      const argsUnknown: unknown = controlExpressionObj.arguments;
      if (!Array.isArray(argsUnknown) || argsUnknown.length === 0) return;

      const firstCallArgs = argsUnknown[0];
      if (!Array.isArray(firstCallArgs) || firstCallArgs.length < 3) return;

      const thirdArg: unknown = firstCallArgs[2];
      if (!hasGlobalOffsets(thirdArg)) return;

      const exprGlobalStart = (controlExpressionObj as any).globalOffsetStart;
      if (typeof exprGlobalStart !== 'number') return;

      const argLocalStart = thirdArg.globalOffsetStart - exprGlobalStart;
      const argLocalEnd = thirdArg.globalOffsetEnd - exprGlobalStart + 1;

      const updatedFormula =
        initialFormula.slice(0, argLocalStart) +
        updatedValuesString +
        initialFormula.slice(argLocalEnd).trimStart();

      if (updatedFormula === initialFormula) return;

      table.setFieldFormula(parsedField.key.fieldName, updatedFormula);

      const historyTitle = `Update control values for ${tableName}[${fieldName}]`;

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL, viewGridData]
  );

  const createControl = useCallback(
    (tableName: string, col: number, row: number, controls: ControlRow[]) => {
      const sheet = parsedSheet?.editableSheet;
      if (!sheet) return;

      const baseName = unescapeTableName(tableName);

      let tableCol = col;
      let tableRow = row;

      if (col === -1 || row === -1) {
        const res = suggestTablePlacement(
          parsedSheet,
          viewGridData.getGridTableStructure(),
          gridApi,
          null,
          null,
          controls.length,
          3
        );

        if (res) {
          tableCol = res.col;
          tableRow = res.row;
        }
      }

      const { table, tableName: newTableName } = createAndPlaceTable({
        sheet,
        baseName,
        parsedSheets,
        col: tableCol,
        row: tableRow,
        layoutOptions: {
          showFieldHeaders: true,
          showTableHeader: false,
        },
      });

      const existingFieldNames: string[] = [];
      controls.forEach(({ dependency, type, valueTable, valueField, name }) => {
        if (!type) return;

        const uniqueFieldName = createUniqueName(name, existingFieldNames);
        existingFieldNames.push(uniqueFieldName);

        const dep = dependency ? dependency : '';
        const values = '';
        const source = `${valueTable}[${valueField}]`;

        const formula = `${type.toUpperCase()}(${dep}, ${source}, ${values})`;
        table.addField({ name: uniqueFieldName, formula });
      });

      table.addDecorator(new Decorator('control', '()'));

      const historyTitle = `Add control "${newTableName}"`;

      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [gridApi, parsedSheet, parsedSheets, updateDSL, viewGridData]
  );

  const createControlFromField = useCallback(
    (tableName: string, fieldName: string, type: ControlType) => {
      if (!parsedSheet) return;

      const { col, row } = suggestTablePlacement(
        parsedSheet,
        viewGridData.getGridTableStructure(),
        gridApi,
        null,
        null,
        1,
        3
      ) ?? { col: 1, row: 1 };

      createControl(tableName, col, row, [
        {
          name: fieldName + ' control',
          type,
          valueTable: tableName,
          valueField: fieldName,
        },
      ]);

      gridApi?.updateSelectionAfterDataChanged({
        startCol: col,
        startRow: row,
        endCol: col,
        endRow: row + 1,
      });
    },
    [createControl, gridApi, parsedSheet, viewGridData]
  );

  return {
    updateSelectedControlValue: useSafeCallback(updateSelectedControlValue),
    createControl: useSafeCallback(createControl),
    createControlFromField: useSafeCallback(createControlFromField),
  };
}
