import { useCallback, useContext, useEffect } from 'react';

import {
  dynamicFieldName,
  Expression,
  findFunctionExpressions,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';

import { AppContext, ProjectContext } from '../../../../context';
import { PivotWizardContext } from '../PivotWizardContext';
import {
  defaultAggregationOption,
  parsePivotArguments,
  toSelectOption,
} from '../utils';
import { FieldItem } from '../utils';

export function usePivotTableSetup() {
  const { pivotTableName, pivotTableWizardMode, changePivotTableWizardMode } =
    useContext(AppContext);
  const { parsedSheets } = useContext(ProjectContext);
  const {
    setAvailableFields,
    setRowFields,
    setColumnFields,
    setValueFields,
    aggregationFunctions,
    setSelectedTableName,
    setSelectedAggregation,
  } = useContext(PivotWizardContext);

  const setupExistingPivotTable = useCallback(
    (table: ParsedTable) => {
      const emptyResult = {
        availableFields: [],
        rows: [],
        columns: [],
        values: [],
        aggregation: undefined,
      };

      try {
        const pivotField = table?.fields.find(
          (f) =>
            f.expression &&
            findFunctionExpressions(f.expression).some(
              (func) => func.name === 'PIVOT'
            )
        );

        if (!pivotField || !pivotField.expressionMetadata) {
          return emptyResult;
        }

        const parsed = SheetReader.parseFormula(
          pivotField.expressionMetadata.text
        );
        const fns = findFunctionExpressions(parsed);
        const pivotFn = fns.find((fn) => fn.name === 'PIVOT');

        if (!pivotFn?.arguments) {
          return emptyResult;
        }

        const args = pivotFn.arguments[0] as Expression[];
        const { rows, columns, values, aggregations, tableName } =
          parsePivotArguments(args, aggregationFunctions);

        const sourceTable = Object.values(parsedSheets ?? {})
          .flatMap(({ tables }) => tables)
          .find((t) => t.tableName === tableName);

        if (!sourceTable || !tableName) return emptyResult;

        setSelectedTableName(toSelectOption(tableName));

        const fields =
          sourceTable?.fields.map(({ key }) => ({
            id: key.fieldName,
            name: key.fieldName,
          })) || [];

        if (aggregations.length > 0) {
          // Set the first aggregation as selected
          setSelectedAggregation(
            toSelectOption(aggregations[0].id, aggregations[0].name)
          );
        }

        const availableFields = fields.filter(
          (f: FieldItem) =>
            !rows.some((rf) => rf.id === f.id) &&
            !columns.some((cf) => cf.id === f.id) &&
            !values.some((vf) => vf.id === f.id) &&
            f.name !== dynamicFieldName
        );

        return {
          availableFields,
          rows,
          columns,
          values,
          aggregation: aggregations.length > 0 ? aggregations[0].id : undefined,
        };
      } catch (e) {
        return emptyResult;
      }
    },
    [
      aggregationFunctions,
      parsedSheets,
      setSelectedTableName,
      setSelectedAggregation,
    ]
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
      const { availableFields, rows, columns, values } =
        setupExistingPivotTable(foundTable);

      setAvailableFields(availableFields);
      setRowFields(rows);
      setColumnFields(columns);
      setValueFields(values);
    } else {
      const fields =
        foundTable?.fields
          .filter(({ key }) => key.fieldName !== dynamicFieldName)
          .map(({ key }) => ({
            id: key.fieldName,
            name: key.fieldName,
          })) || [];

      setAvailableFields(fields);
      setRowFields([]);
      setColumnFields([]);
      setValueFields([]);
      setSelectedAggregation(defaultAggregationOption);

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
    setValueFields,
    setSelectedAggregation,
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
