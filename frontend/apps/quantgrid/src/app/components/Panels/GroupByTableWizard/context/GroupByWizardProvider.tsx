import { DefaultOptionType } from 'antd/es/select';
import {
  type JSX,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SingleValue } from 'react-select';
import { useShallow } from 'zustand/react/shallow';

import { defaultTableName, FunctionType } from '@frontend/common';
import { collectTableNames, findFunctionExpressions } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useFieldEditDsl, useRequestDimTable } from '../../../../hooks';
import { createUniqueName } from '../../../../services';
import { useGroupByStore, useViewStore } from '../../../../store';
import {
  AggregationFunctionInfo,
  FieldItem,
  minTablePlacement,
  normalizeFormula,
  ValueFunctionItem,
} from '../../Shared';
import { availableItemKey, generateFormulaArgs } from '../utils';
import { GroupByWizardContext } from './GroupByWizardContext';

export function GroupByWizardContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
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

  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const {
    functions: projectFunctions,
    parsedSheets,
    sheetName,
  } = useContext(ProjectContext);
  const selectedCell = useViewStore((s) => s.selectedCell);

  const { requestDimSchemaForFormula } = useRequestDimTable();
  const { editExpression } = useFieldEditDsl();

  const [startRow, setStartRow] = useState<number | null>(
    selectedCell?.row || minTablePlacement,
  );
  const [startCol, setStartCol] = useState<number | null>(
    selectedCell?.col || minTablePlacement,
  );
  const [filterText, setFilterText] = useState<string | undefined>(undefined);

  const [rowFields, setRowFields] = useState<FieldItem[]>([]);
  const [valueFunctions, setValueFunctions] = useState<ValueFunctionItem[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldItem[]>([]);
  const [selectedTableName, setSelectedTableName] =
    useState<DefaultOptionType>();

  const lastAppliedKeyRef = useRef<string | null>(null);
  const lastAggregationInfoRef = useRef<AggregationFunctionInfo[]>([]);
  const userActionTriggeredRef = useRef<boolean>(false);

  // Cache aggregation functions info to avoid losing them during temporary parsing states
  const aggregationFunctionInfo: AggregationFunctionInfo[] = useMemo(() => {
    const next = projectFunctions
      .filter((f) => f.functionType?.includes(FunctionType.Aggregations))
      .map((f) => {
        return { name: f.name, argCount: Math.max(1, f.arguments.length) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (next.length === 0 && lastAggregationInfoRef.current.length > 0) {
      return lastAggregationInfoRef.current;
    }

    if (next.length > 0) lastAggregationInfoRef.current = next;

    return next;
  }, [projectFunctions]);

  const fieldById = useMemo(() => {
    const m = new Map<string, FieldItem>();

    availableFields.forEach((f) => m.set(f.id, f));
    rowFields.forEach((f) => m.set(f.id, f));

    valueFunctions.forEach((vf) => {
      vf.args.forEach((a) => {
        if (!a) return;
        m.set(a.id, { id: a.id, name: a.name });
      });
    });

    return m;
  }, [availableFields, rowFields, valueFunctions]);

  const getItemById = useCallback(
    (id: string) => fieldById.get(id) ?? null,
    [fieldById],
  );

  const onChangeTableName = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option) return;
      setSelectedTableName(option);

      const foundTable = Object.values(parsedSheets ?? {})
        .flatMap(({ tables }) => tables)
        .find((t) => t.tableName === option.value);

      if (!foundTable) return;

      setRowFields([]);
      setValueFunctions([]);
      const fields = foundTable.getUserVisibleFields().map(({ key }) => ({
        id: `${availableItemKey}${key.fieldName}`,
        name: key.fieldName,
      }));

      setAvailableFields(fields);
    },
    [parsedSheets],
  );

  const applyChanges = useCallback(() => {
    const formulaArgs = generateFormulaArgs(
      selectedTableName,
      rowFields,
      valueFunctions,
      filterText,
    );
    if (!formulaArgs) return;

    const { formula } = formulaArgs;

    const applyKey = [
      groupByTableWizardMode,
      groupByTableName ?? '',
      startCol ?? '',
      startRow ?? '',
      normalizeFormula(formula),
    ].join('|');

    if (lastAppliedKeyRef.current === applyKey) return;

    if (groupByTableWizardMode === 'create') {
      const newTableName = createUniqueName(
        defaultTableName,
        collectTableNames(parsedSheets),
      );

      requestDimSchemaForFormula(
        startCol || minTablePlacement,
        startRow || minTablePlacement,
        `${newTableName} = ${formula}`,
      );
      lastAppliedKeyRef.current = applyKey;
      changeGroupByTableWizardMode('edit', newTableName);

      if (sheetName) {
        openTable(sheetName, newTableName);
      }

      return;
    }

    if (groupByTableWizardMode === 'edit' && groupByTableName) {
      const foundTable = Object.values(parsedSheets ?? {})
        .flatMap(({ tables }) => tables)
        .find((t) => t.tableName === groupByTableName);

      if (!foundTable) return;

      try {
        const groupByField = foundTable.fields.find(
          (f) =>
            f.expression &&
            findFunctionExpressions(f.expression).some(
              (func) => func.name === 'GROUPBY',
            ),
        );

        const initialFormula = groupByField?.expressionMetadata?.text
          ? normalizeFormula(groupByField.expressionMetadata.text)
          : '';
        const newFormula = normalizeFormula(formula);
        const isFormulaChanged = initialFormula !== newFormula;

        if (!groupByField || !isFormulaChanged) {
          lastAppliedKeyRef.current = applyKey;

          return;
        }

        editExpression(
          groupByTableName,
          groupByField.key.fieldName,
          `= ${formula}`,
        );
        lastAppliedKeyRef.current = applyKey;

        if (sheetName) {
          openTable(sheetName, groupByTableName);
        }
      } catch {
        // noop
      }
    }
  }, [
    selectedTableName,
    rowFields,
    valueFunctions,
    filterText,
    groupByTableWizardMode,
    groupByTableName,
    startCol,
    startRow,
    parsedSheets,
    requestDimSchemaForFormula,
    changeGroupByTableWizardMode,
    sheetName,
    openTable,
    editExpression,
  ]);

  const triggerUserAction = useCallback(() => {
    userActionTriggeredRef.current = true;
  }, []);

  // Apply changes when fields are modified by user actions
  useEffect(() => {
    if (!userActionTriggeredRef.current) return;
    userActionTriggeredRef.current = false;

    const hasAnyFields = rowFields.length > 0 || valueFunctions.length > 0;
    if (!hasAnyFields) return;

    applyChanges();
  }, [rowFields, valueFunctions, filterText, selectedTableName, applyChanges]);

  const value = useMemo(
    () => ({
      availableFields,
      filterText,
      rowFields,
      valueFunctions,
      selectedTableName,
      startCol,
      startRow,
      aggregationFunctionInfo,
      setAvailableFields,
      setFilterText,
      setRowFields,
      setSelectedTableName,
      setStartCol,
      setStartRow,
      setValueFunctions,
      applyChanges,
      getItemById,
      onChangeTableName,
      triggerUserAction,
    }),
    [
      availableFields,
      filterText,
      rowFields,
      valueFunctions,
      selectedTableName,
      startCol,
      startRow,
      aggregationFunctionInfo,
      applyChanges,
      getItemById,
      onChangeTableName,
      triggerUserAction,
    ],
  );

  return (
    <GroupByWizardContext.Provider value={value}>
      {children}
    </GroupByWizardContext.Provider>
  );
}
