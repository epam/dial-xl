import { useCallback, useContext, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  findFunctionExpressions,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';

import { ProjectContext } from '../../../../context';
import { useGroupByStore } from '../../../../store';
import { toSelectOption } from '../../Shared';
import { GroupByWizardContext } from '../context';
import { availableItemKey, parseGroupByArguments, rowItemKey } from '../utils';

export function useGroupByTableSetup() {
  const {
    groupByTableName,
    groupByTableWizardMode,
    changeGroupByTableWizardMode,
  } = useGroupByStore(
    useShallow((s) => ({
      groupByTableName: s.groupByTableName,
      groupByTableWizardMode: s.groupByTableWizardMode,
      changeGroupByTableWizardMode: s.changeGroupByTableWizardMode,
    })),
  );

  const { parsedSheets } = useContext(ProjectContext);
  const {
    setAvailableFields,
    setRowFields,
    setValueFunctions,
    aggregationFunctionInfo,
    setSelectedTableName,
    setFilterText,
  } = useContext(GroupByWizardContext);

  const setupExistingGroupByTable = useCallback(
    (table: ParsedTable) => {
      const emptyResult = {
        availableFields: [],
        rows: [],
        valueFunctions: [],
        filterText: undefined,
      };

      try {
        const groupByField = table?.fields.find(
          (f) =>
            f.expression &&
            findFunctionExpressions(f.expression).some(
              (func) => func.name === 'GROUPBY',
            ),
        );

        if (!groupByField || !groupByField.expressionMetadata) {
          return emptyResult;
        }

        const parsed = SheetReader.parseFormula(
          groupByField.expressionMetadata.text,
        );
        const fns = findFunctionExpressions(parsed);
        const groupByFn = fns.find((fn) => fn.name === 'GROUPBY');

        if (!groupByFn?.arguments) {
          return emptyResult;
        }

        const { rows, valueFunctions, filterText, tableName } =
          parseGroupByArguments(
            groupByFn,
            aggregationFunctionInfo,
            groupByField.expressionMetadata.text,
          );

        const sourceTable = Object.values(parsedSheets ?? {})
          .flatMap(({ tables }) => tables)
          .find((t) => t.tableName === tableName);

        if (!sourceTable || !tableName) return emptyResult;

        setSelectedTableName(toSelectOption(tableName));

        const fields =
          sourceTable?.getUserVisibleFields().map(({ key }) => ({
            id: `${availableItemKey}${key.fieldName}`,
            name: key.fieldName,
          })) || [];

        const rowsWithIds = rows.map((r) => ({
          ...r,
          id: `${rowItemKey}${r.name}`,
        }));

        return {
          availableFields: fields,
          rows: rowsWithIds,
          valueFunctions,
          filterText,
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
      .find((t) => t.tableName === groupByTableName);

    if (!foundTable && groupByTableWizardMode !== 'edit') return;
    if (!foundTable && groupByTableWizardMode === 'edit') {
      changeGroupByTableWizardMode(null);

      return;
    }

    if (foundTable && groupByTableWizardMode === 'edit') {
      const { availableFields, rows, valueFunctions, filterText } =
        setupExistingGroupByTable(foundTable);

      setAvailableFields(availableFields);
      setRowFields(rows);
      setValueFunctions(valueFunctions);
      setFilterText(filterText);
    } else {
      const fields =
        foundTable?.getUserVisibleFields().map(({ key }) => ({
          id: `${availableItemKey}${key.fieldName}`,
          name: key.fieldName,
        })) || [];

      setAvailableFields(fields);
      setRowFields([]);
      setValueFunctions([]);
      setFilterText(undefined);

      if (groupByTableName) {
        setSelectedTableName(toSelectOption(groupByTableName));
      }
    }
  }, [
    parsedSheets,
    groupByTableWizardMode,
    groupByTableName,
    changeGroupByTableWizardMode,
    setupExistingGroupByTable,
    setAvailableFields,
    setRowFields,
    setValueFunctions,
    setFilterText,
    setSelectedTableName,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(initializeFields, 200);

    return () => clearTimeout(timeoutId);
  }, [initializeFields, parsedSheets]);

  return {
    initializeFields,
  };
}
