import { ColumnDataType } from '@frontend/common';

export type TableVariant = 'dimFormula' | 'expand' | 'rowReference';

export type CreateExpandedTableParams = {
  // coordinates
  col: number;
  row: number;

  // context
  tableName: string;
  fieldName?: string;

  // data & metadata
  formula: string;
  schema: string[];
  keys: string[];
  type: ColumnDataType;

  // mode toggles
  variant: TableVariant;

  // additional parameters
  keyValues?: string | number;
  isSourceDimField?: boolean;
};
