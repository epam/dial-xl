import { DefaultOptionType } from 'antd/es/select';
import { createContext, Dispatch, SetStateAction } from 'react';
import { SingleValue } from 'react-select';

import {
  AggregationFunctionInfo,
  FieldItem,
  ValueFunctionItem,
} from '../../Shared';

type GroupByWizardContextValues = {
  availableFields: FieldItem[];
  rowFields: FieldItem[];
  valueFunctions: ValueFunctionItem[];
  aggregationFunctionInfo: AggregationFunctionInfo[];
  selectedTableName?: DefaultOptionType;
  startRow: number | null;
  startCol: number | null;
  filterText?: string;
};
type GroupByWizardContextActions = {
  setAvailableFields: Dispatch<SetStateAction<FieldItem[]>>;
  setRowFields: Dispatch<SetStateAction<FieldItem[]>>;
  setValueFunctions: Dispatch<SetStateAction<ValueFunctionItem[]>>;
  setSelectedTableName: (option?: DefaultOptionType) => void;
  setStartRow: (v: number | null) => void;
  setStartCol: (v: number | null) => void;
  setFilterText: (v?: string) => void;
  getItemById: (id: string) => FieldItem | null;
  onChangeTableName: (option: SingleValue<DefaultOptionType>) => void;
  triggerUserAction: () => void;
  applyChanges: (skipPendingCheck?: boolean) => void;
};

export const GroupByWizardContext = createContext<
  GroupByWizardContextActions & GroupByWizardContextValues
>({} as GroupByWizardContextActions & GroupByWizardContextValues);
