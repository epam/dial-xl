import { DefaultOptionType } from 'antd/es/select';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SingleValue } from 'react-select';

import { FunctionType } from '@frontend/common';
import { dynamicFieldName, findFunctionExpressions } from '@frontend/parser';

import { AppContext, ProjectContext } from '../../../context';
import { useFieldEditDsl, useRequestDimTable } from '../../../hooks';
import {
  defaultAggregationArgsCount,
  defaultAggregationOption,
  FieldItem,
  formatFieldReference,
  minPlacement,
} from './utils';

type PivotWizardContextValues = {
  aggregationArgsCount: number;
  aggregationFunctions: string[];
  availableFields: FieldItem[];
  columnFields: FieldItem[];
  rowFields: FieldItem[];
  selectedAggregation: DefaultOptionType | undefined;
  selectedTableName: DefaultOptionType | undefined;
  shouldDisableApplyButton: boolean;
  startCol: number | null;
  startRow: number | null;
  valueFields: FieldItem[];
};
type PivotWizardContextActions = {
  applyChanges: () => void;
  generateFormulaArgs: () => { formula: string; tableName?: string } | null;
  getItemById: (id: string) => FieldItem | null;
  onChangeAggregation: (option: SingleValue<DefaultOptionType>) => void;
  onChangeTableName: (option: SingleValue<DefaultOptionType>) => void;
  setAvailableFields: (fields: FieldItem[]) => void;
  setColumnFields: (fields: FieldItem[]) => void;
  setRowFields: (fields: FieldItem[]) => void;
  setSelectedAggregation: (option: DefaultOptionType | undefined) => void;
  setSelectedTableName: (option: DefaultOptionType | undefined) => void;
  setStartCol: (col: number | null) => void;
  setStartRow: (row: number | null) => void;
  setValueFields: (fields: FieldItem[]) => void;
};

export const PivotWizardContext = createContext<
  PivotWizardContextActions & PivotWizardContextValues
>({} as PivotWizardContextActions & PivotWizardContextValues);

export function PivotWizardContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { changePivotTableWizardMode, pivotTableWizardMode, pivotTableName } =
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

  const shouldDisableApplyButton = useMemo(
    () =>
      !rowFields.length ||
      !columnFields.length ||
      !valueFields.length ||
      !selectedAggregation ||
      valueFields.length !== aggregationArgsCount,
    [
      rowFields,
      columnFields,
      valueFields,
      selectedAggregation,
      aggregationArgsCount,
    ]
  );

  const generateFormulaArgs = useCallback(() => {
    if (!selectedTableName || !selectedAggregation) return null;

    const tableName = selectedTableName.value as string;
    const rowsRef = formatFieldReference(rowFields, tableName);
    const columnsRef = formatFieldReference(columnFields, tableName);
    const valuesRef = formatFieldReference(valueFields, tableName);
    const aggregationRef = `"${selectedAggregation.value}"`;

    return {
      formula: `= PIVOT(${rowsRef}, ${columnsRef}, ${valuesRef}, ${aggregationRef})`,
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

    if (pivotTableWizardMode === 'create') {
      requestDimSchemaForFormula(
        startCol || minPlacement,
        startRow || minPlacement,
        formula
      );
    } else if (pivotTableWizardMode === 'edit' && pivotTableName) {
      const foundTable = Object.values(parsedSheets ?? {})
        .flatMap(({ tables }) => tables)
        .find((t) => t.tableName === pivotTableName);

      if (!foundTable) return;

      const pivotField = foundTable.fields.find(
        (f) =>
          f.expression &&
          findFunctionExpressions(f.expression).some(
            (func) => func.name === 'PIVOT'
          )
      );

      if (!pivotField) return;
      editExpression(pivotTableName, pivotField.key.fieldName, formula);
    }

    changePivotTableWizardMode(null);
  }, [
    generateFormulaArgs,
    pivotTableWizardMode,
    pivotTableName,
    changePivotTableWizardMode,
    requestDimSchemaForFormula,
    startCol,
    startRow,
    parsedSheets,
    editExpression,
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
      shouldDisableApplyButton,
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
      shouldDisableApplyButton,
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
