import { DefaultOptionType } from 'antd/es/select';
import { createContext } from 'react';
import { SingleValue } from 'react-select';

import { FieldItem } from '../utils';

type PivotWizardContextValues = {
  aggregationArgsCount: number;
  aggregationFunctions: string[];
  availableFields: FieldItem[];
  columnFields: FieldItem[];
  rowFields: FieldItem[];
  selectedAggregation: DefaultOptionType | undefined;
  selectedTableName: DefaultOptionType | undefined;
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
