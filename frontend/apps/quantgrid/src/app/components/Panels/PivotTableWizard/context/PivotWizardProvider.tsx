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
import { usePivotStore, useViewStore } from '../../../../store';
import {
  AggregationFunctionInfo,
  FieldItem,
  minTablePlacement,
  normalizeFormula,
  ValueFunctionItem,
} from '../../Shared';
import { availableItemKey, generateFormulaArgs } from '../utils';
import { PivotWizardContext } from './PivotWizardContext';

export function PivotWizardContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { pivotTableName, pivotTableWizardMode, changePivotTableWizardMode } =
    usePivotStore(
      useShallow((s) => ({
        pivotTableName: s.pivotTableName,
        pivotTableWizardMode: s.pivotTableWizardMode,
        changePivotTableWizardMode: s.changePivotTableWizardMode,
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

  const [rowFields, setRowFields] = useState<FieldItem[]>([]);
  const [columnFields, setColumnFields] = useState<FieldItem[]>([]);
  const [valueFunctions, setValueFunctions] = useState<ValueFunctionItem[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldItem[]>([]);
  const [selectedTableName, setSelectedTableName] =
    useState<DefaultOptionType>();

  const lastAppliedKeyRef = useRef<string | null>(null);
  const lastAggregationInfoRef = useRef<AggregationFunctionInfo[]>([]);
  const userActionTriggeredRef = useRef<boolean>(false);

  const aggregationFunctionInfo: AggregationFunctionInfo[] = useMemo(() => {
    const next = projectFunctions
      .filter((f) => f.functionType?.includes(FunctionType.Aggregations))
      .map((f) => ({ name: f.name, argCount: Math.max(1, f.arguments.length) }))
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
    columnFields.forEach((f) => m.set(f.id, f));

    valueFunctions.forEach((vf) => {
      vf.args.forEach((a) => {
        if (!a) return;
        m.set(a.id, { id: a.id, name: a.name });
      });
    });

    return m;
  }, [availableFields, rowFields, columnFields, valueFunctions]);

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
      setColumnFields([]);
      setValueFunctions([]);

      const fields = foundTable.getUserVisibleFields().map(({ key }) => ({
        id: `${availableItemKey}${key.fieldName}`,
        name: key.fieldName,
      }));

      setAvailableFields(fields);
    },
    [parsedSheets],
  );

  const triggerUserAction = useCallback(() => {
    userActionTriggeredRef.current = true;
  }, []);

  const applyChanges = useCallback(() => {
    const formulaArgs = generateFormulaArgs(
      selectedTableName,
      rowFields,
      columnFields,
      valueFunctions,
    );
    if (!formulaArgs) return;

    const { formula } = formulaArgs;

    const applyKey = [
      pivotTableWizardMode,
      pivotTableName ?? '',
      startCol ?? '',
      startRow ?? '',
      normalizeFormula(formula),
    ].join('|');

    if (lastAppliedKeyRef.current === applyKey) return;

    if (pivotTableWizardMode === 'create') {
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
      changePivotTableWizardMode('edit', newTableName);

      if (sheetName) openTable(sheetName, newTableName);

      return;
    }

    if (pivotTableWizardMode === 'edit' && pivotTableName) {
      const foundTable = Object.values(parsedSheets ?? {})
        .flatMap(({ tables }) => tables)
        .find((t) => t.tableName === pivotTableName);

      if (!foundTable) return;

      try {
        const pivotField = foundTable.fields.find(
          (f) =>
            f.expression &&
            findFunctionExpressions(f.expression).some(
              (func) => func.name === 'PIVOT',
            ),
        );

        const initialFormula = pivotField?.expressionMetadata?.text
          ? normalizeFormula(pivotField.expressionMetadata.text)
          : '';
        const newFormula = normalizeFormula(formula);

        if (!pivotField || initialFormula === newFormula) {
          lastAppliedKeyRef.current = applyKey;

          return;
        }

        editExpression(
          pivotTableName,
          pivotField.key.fieldName,
          `= ${formula}`,
        );
        lastAppliedKeyRef.current = applyKey;

        if (sheetName) openTable(sheetName, pivotTableName);
      } catch {
        // noop
      }
    }
  }, [
    selectedTableName,
    rowFields,
    columnFields,
    valueFunctions,
    pivotTableWizardMode,
    pivotTableName,
    startCol,
    startRow,
    parsedSheets,
    requestDimSchemaForFormula,
    changePivotTableWizardMode,
    sheetName,
    openTable,
    editExpression,
  ]);

  useEffect(() => {
    if (!userActionTriggeredRef.current) return;
    userActionTriggeredRef.current = false;

    const hasAny =
      rowFields.length > 0 ||
      columnFields.length > 0 ||
      valueFunctions.length > 0;

    if (!hasAny) return;
    applyChanges();
  }, [
    rowFields,
    columnFields,
    valueFunctions,
    selectedTableName,
    applyChanges,
  ]);

  const value = useMemo(
    () => ({
      availableFields,
      rowFields,
      columnFields,
      valueFunctions,
      selectedTableName,
      startCol,
      startRow,
      aggregationFunctionInfo,
      setAvailableFields,
      setRowFields,
      setColumnFields,
      setValueFunctions,
      setSelectedTableName,
      setStartCol,
      setStartRow,
      applyChanges,
      getItemById,
      onChangeTableName,
      triggerUserAction,
    }),
    [
      availableFields,
      rowFields,
      columnFields,
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
    <PivotWizardContext.Provider value={value}>
      {children}
    </PivotWizardContext.Provider>
  );
}
