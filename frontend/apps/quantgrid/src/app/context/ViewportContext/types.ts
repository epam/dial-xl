import { FieldSortOrder } from '@frontend/common';
import { ParsedConditionFilter } from '@frontend/parser';

export type ChartUpdate = {
  chartName?: string;
  isKeyUpdate?: boolean;
  isChartDataUpdate?: boolean;
  virtualTableName?: string;
};

export type FiltersUpdate = {
  sourceTableName?: string;
  virtualTableName?: string;
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
  filter: ParsedConditionFilter | undefined;
  isFieldUsedInSort: boolean;
};
