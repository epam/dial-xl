import { DefaultOptionType } from 'antd/es/select';
import { createContext, Dispatch, SetStateAction } from 'react';
import { SingleValue } from 'react-select';

import {
  AggregationFunctionInfo,
  FieldItem,
  ValueFunctionItem,
} from '../../Shared';

type PivotWizardContextValues = {
  aggregationFunctionInfo: AggregationFunctionInfo[];
  availableFields: FieldItem[];
  columnFields: FieldItem[];
  rowFields: FieldItem[];
  selectedTableName: DefaultOptionType | undefined;
  startCol: number | null;
  startRow: number | null;
  valueFunctions: ValueFunctionItem[];
};
type PivotWizardContextActions = {
  applyChanges: () => void;
  getItemById: (id: string) => FieldItem | null;
  onChangeTableName: (option: SingleValue<DefaultOptionType>) => void;
  setAvailableFields: Dispatch<SetStateAction<FieldItem[]>>;
  setColumnFields: Dispatch<SetStateAction<FieldItem[]>>;
  setRowFields: Dispatch<SetStateAction<FieldItem[]>>;
  setSelectedTableName: (option: DefaultOptionType | undefined) => void;
  setValueFunctions: Dispatch<SetStateAction<ValueFunctionItem[]>>;
  setStartCol: (col: number | null) => void;
  setStartRow: (row: number | null) => void;
  triggerUserAction: () => void;
};

export const PivotWizardContext = createContext<
  PivotWizardContextActions & PivotWizardContextValues
>({} as PivotWizardContextActions & PivotWizardContextValues);
