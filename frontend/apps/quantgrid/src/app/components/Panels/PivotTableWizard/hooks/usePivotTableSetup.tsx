import { useCallback, useContext, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  findFunctionExpressions,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';

import { ProjectContext } from '../../../../context';
import { usePivotStore } from '../../../../store';
import { FieldItem, toSelectOption } from '../../Shared';
import { PivotWizardContext } from '../context';
import {
  availableItemKey,
  colItemKey,
  parsePivotArguments,
  rowItemKey,
} from '../utils';

export function usePivotTableSetup() {
  const { pivotTableName, pivotTableWizardMode, changePivotTableWizardMode } =
    usePivotStore(
      useShallow((s) => ({
        pivotTableName: s.pivotTableName,
        pivotTableWizardMode: s.pivotTableWizardMode,
        changePivotTableWizardMode: s.changePivotTableWizardMode,
      })),
    );

  const { parsedSheets } = useContext(ProjectContext);
  const {
    setAvailableFields,
    setRowFields,
    setColumnFields,
    setValueFunctions,
    aggregationFunctionInfo,
    setSelectedTableName,
  } = useContext(PivotWizardContext);

  const setupExistingPivotTable = useCallback(
    (table: ParsedTable) => {
      const emptyResult = {
        availableFields: [],
        rows: [],
        columns: [],
        valueFunctions: [],
      };

      try {
        const pivotField = table?.fields.find(
          (f) =>
            f.expression &&
            findFunctionExpressions(f.expression).some(
              (func) => func.name === 'PIVOT',
            ),
        );

        if (!pivotField?.expressionMetadata?.text) return emptyResult;

        const parsed = SheetReader.parseFormula(
          pivotField.expressionMetadata.text,
        );
        const fns = findFunctionExpressions(parsed);
        const pivotFn = fns.find((fn) => fn.name === 'PIVOT');
        if (!pivotFn?.arguments) return emptyResult;

        const { rows, columns, valueFunctions, tableName } =
          parsePivotArguments(pivotFn, aggregationFunctionInfo);

        const sourceTable = Object.values(parsedSheets ?? {})
          .flatMap(({ tables }) => tables)
          .find((t) => t.tableName === tableName);

        if (!sourceTable || !tableName) return emptyResult;

        setSelectedTableName(toSelectOption(tableName));

        const fields: FieldItem[] =
          sourceTable.getUserVisibleFields().map(({ key }) => ({
            id: `${availableItemKey}${key.fieldName}`,
            name: key.fieldName,
          })) || [];

        const rowsWithIds = rows.map((r) => ({
          ...r,
          id: `${rowItemKey}${r.name}`,
        }));
        const columnsWithIds = columns.map((c) => ({
          ...c,
          id: `${colItemKey}${c.name}`,
        }));

        return {
          availableFields: fields,
          rows: rowsWithIds,
          columns: columnsWithIds,
          valueFunctions,
        };
      } catch {
        return emptyResult;
      }
    },
    [aggregationFunctionInfo, parsedSheets, setSelectedTableName],
  );

  const initializeFields = useCallback(() => {
    const foundTable = Object.values(parsedSheets ?? {})
      .flatMap(({ tables }) => tables)
      .find((t) => t.tableName === pivotTableName);

    if (!foundTable && pivotTableWizardMode !== 'edit') return;
    if (!foundTable && pivotTableWizardMode === 'edit') {
      changePivotTableWizardMode(null);

      return;
    }

    if (foundTable && pivotTableWizardMode === 'edit') {
      const { availableFields, rows, columns, valueFunctions } =
        setupExistingPivotTable(foundTable);

      setAvailableFields(availableFields);
      setRowFields(rows);
      setColumnFields(columns);
      setValueFunctions(valueFunctions);
    } else {
      const fields: FieldItem[] =
        foundTable?.getUserVisibleFields().map(({ key }) => ({
          id: `${availableItemKey}${key.fieldName}`,
          name: key.fieldName,
        })) || [];

      setAvailableFields(fields);
      setRowFields([]);
      setColumnFields([]);
      setValueFunctions([]);

      if (pivotTableName) {
        setSelectedTableName(toSelectOption(pivotTableName));
      }
    }
  }, [
    parsedSheets,
    pivotTableWizardMode,
    pivotTableName,
    changePivotTableWizardMode,
    setupExistingPivotTable,
    setAvailableFields,
    setRowFields,
    setColumnFields,
    setValueFunctions,
    setSelectedTableName,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(initializeFields, 200);

    return () => clearTimeout(timeoutId);
  }, [initializeFields, parsedSheets]);

  return {
    setupExistingPivotTable,
    initializeFields,
  };
}
