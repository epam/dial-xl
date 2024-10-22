import { FieldSortOrder } from '@frontend/common';
import { NumericFilter } from '@frontend/parser';

export type ChartUpdate = {
  chartName?: string;
  isKeyUpdate?: boolean;
  isChartDataUpdate?: boolean;
};

export type TableDynamicFieldsLoadUpdate = {
  tableName: string;
  dynamicFields: string[];
};

export type TableDimensions = {
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
};

export type ApplyBlockGridParams = {
  sort: FieldSortOrder;
  isFiltered: boolean;
  numericFilter: NumericFilter | undefined;
  isFieldUsedInSort: boolean;
};
