import { DefaultOptionType } from 'antd/es/select';
import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SingleValue } from 'react-select';

import { defaultTableName, FunctionType } from '@frontend/common';
import {
  collectTableNames,
  dynamicFieldName,
  findFunctionExpressions,
} from '@frontend/parser';

import { AppContext, ProjectContext } from '../../../../context';
import { useFieldEditDsl, useRequestDimTable } from '../../../../hooks';
import { createUniqueName } from '../../../../services';
import { PivotWizardContext } from '../PivotWizardContext';
import {
  defaultAggregationArgsCount,
  defaultAggregationOption,
  FieldItem,
  formatFieldReference,
  minPlacement,
} from '../utils';

export function PivotWizardContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { pivotTableWizardMode, changePivotTableWizardMode, pivotTableName } =
    useContext(AppContext);
  const { functions, parsedSheets, selectedCell } = useContext(ProjectContext);

  const { requestDimSchemaForFormula } = useRequestDimTable();
  const { editExpression } = useFieldEditDsl();

  const [startRow, setStartRow] = useState<number | null>(
    selectedCell?.row || minPlacement
  );
  const [startCol, setStartCol] = useState<number | null>(
    selectedCell?.col || minPlacement
  );
  const [rowFields, setRowFields] = useState<FieldItem[]>([]);
  const [columnFields, setColumnFields] = useState<FieldItem[]>([]);
  const [valueFields, setValueFields] = useState<FieldItem[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldItem[]>([]);
  const [selectedTableName, setSelectedTableName] =
    useState<DefaultOptionType>();
  const [selectedAggregation, setSelectedAggregation] = useState<
    DefaultOptionType | undefined
  >();
  const [aggregationArgsCount, setAggregationArgsCount] = useState(
    defaultAggregationArgsCount
  );
  const lastAppliedKeyRef = useRef<string | null>(null);

  const aggregationFunctions: string[] = useMemo(() => {
    return functions
      .filter((f) => f.functionType?.includes(FunctionType.Aggregations))
      .map((f) => f.name)
      .sort();
  }, [functions]);

  const getItemById = useCallback(
    (id: string): FieldItem | null => {
      const allFields = [
        ...availableFields,
        ...rowFields,
        ...columnFields,
        ...valueFields,
      ];

      return allFields.find((f) => f.id === id) || null;
    },
    [availableFields, rowFields, columnFields, valueFields]
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
      setValueFields([]);
      setSelectedAggregation(defaultAggregationOption);
      const fields = foundTable.fields
        .filter(({ key }) => key.fieldName !== dynamicFieldName)
        .map(({ key }) => ({
          id: key.fieldName,
          name: key.fieldName,
        }));

      setAvailableFields(fields);
    },
    [parsedSheets]
  );

  const onChangeAggregation = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option) return;
      setSelectedAggregation(option);
    },
    []
  );

  const generateFormulaArgs = useCallback(() => {
    if (!selectedTableName) return null;

    const tableName = selectedTableName.value as string;
    const rowsRef = formatFieldReference(rowFields, tableName);
    const columnsRef = formatFieldReference(columnFields, tableName);
    const valuesRef = formatFieldReference(valueFields, tableName);
    const aggregationRef =
      selectedAggregation && valuesRef ? `"${selectedAggregation.value}"` : '';

    if (!rowsRef && !columnsRef && !valuesRef) return null;

    return {
      formula: `PIVOT(${rowsRef}, ${columnsRef}, ${valuesRef}, ${aggregationRef})`,
      tableName,
    };
  }, [
    selectedTableName,
    rowFields,
    columnFields,
    valueFields,
    selectedAggregation,
  ]);

  const applyChanges = useCallback(() => {
    const formulaArgs = generateFormulaArgs();
    if (!formulaArgs) return;

    const { formula } = formulaArgs;

    const applyKey = [
      pivotTableWizardMode,
      pivotTableName ?? '',
      startCol ?? '',
      startRow ?? '',
      formula.trim().replaceAll(/\s/g, ''),
    ].join('|');

    if (lastAppliedKeyRef.current === applyKey) return;

    if (pivotTableWizardMode === 'create') {
      const newTableName = createUniqueName(
        defaultTableName,
        collectTableNames(parsedSheets)
      );

      requestDimSchemaForFormula(
        startCol || minPlacement,
        startRow || minPlacement,
        `${newTableName} = ${formula}`
      );
      lastAppliedKeyRef.current = applyKey;
      changePivotTableWizardMode('edit', newTableName);

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
              (func) => func.name === 'PIVOT'
            )
        );

        const initialFormula = pivotField?.expressionMetadata?.text
          ? pivotField.expressionMetadata.text.trim().replaceAll(/\s/g, '')
          : '';
        const newFormula = formula.trim().replaceAll(/\s/g, '');
        const isFormulaChanged = initialFormula !== newFormula;

        if (!pivotField || !isFormulaChanged) {
          lastAppliedKeyRef.current = applyKey;

          return;
        }

        editExpression(
          pivotTableName,
          pivotField.key.fieldName,
          `= ${formula}`
        );
        lastAppliedKeyRef.current = applyKey;
      } catch {
        // noop
      }
    }
  }, [
    changePivotTableWizardMode,
    generateFormulaArgs,
    pivotTableWizardMode,
    pivotTableName,
    requestDimSchemaForFormula,
    startCol,
    startRow,
    parsedSheets,
    editExpression,
  ]);

  useEffect(() => {
    const hasAnyFields =
      rowFields.length > 0 || columnFields.length > 0 || valueFields.length > 0;
    const isValidAggregation =
      selectedAggregation && valueFields.length !== aggregationArgsCount;

    if (!hasAnyFields && !isValidAggregation) return;

    applyChanges();
  }, [
    aggregationArgsCount,
    columnFields,
    rowFields,
    selectedAggregation,
    valueFields,
    applyChanges,
  ]);

  useEffect(() => {
    if (!selectedAggregation) return;

    let count = defaultAggregationArgsCount;
    const aggregationFunction = functions.find(
      (f) => f.name === selectedAggregation.value
    );

    if (aggregationFunction) {
      count =
        (aggregationFunction.arguments ?? []).length ||
        defaultAggregationArgsCount;
    }

    setAggregationArgsCount(count);
  }, [selectedAggregation, functions]);

  const value = useMemo(
    () => ({
      aggregationArgsCount,
      aggregationFunctions,
      applyChanges,
      availableFields,
      columnFields,
      generateFormulaArgs,
      getItemById,
      onChangeAggregation,
      onChangeTableName,
      rowFields,
      selectedAggregation,
      selectedTableName,
      setAvailableFields,
      setColumnFields,
      setRowFields,
      setSelectedAggregation,
      setSelectedTableName,
      setStartCol,
      setStartRow,
      setValueFields,
      startCol,
      startRow,
      valueFields,
    }),
    [
      aggregationArgsCount,
      aggregationFunctions,
      applyChanges,
      availableFields,
      columnFields,
      generateFormulaArgs,
      getItemById,
      onChangeAggregation,
      onChangeTableName,
      rowFields,
      selectedAggregation,
      selectedTableName,
      setAvailableFields,
      setColumnFields,
      setRowFields,
      setSelectedAggregation,
      setSelectedTableName,
      setStartCol,
      setStartRow,
      setValueFields,
      startCol,
      startRow,
      valueFields,
    ]
  );

  return (
    <PivotWizardContext.Provider value={value}>
      {children}
    </PivotWizardContext.Provider>
  );
}
