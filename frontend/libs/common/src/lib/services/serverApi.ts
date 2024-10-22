interface TableKey {
  table: string;
}

interface FieldKey {
  table: string;
  field: string;
}

interface ApplyKey {
  table: string;
  function: string; // sort/filter
}

export interface TotalKey {
  table: string;
  field: string;
  number: number; // starts from 1
}

export interface OverrideKey {
  table: string;
  field: string;
  row: number; // starts from 1
}

export interface FieldInfo {
  fieldKey?: FieldKey;
  totalKey?: TotalKey;
  overrideKey?: OverrideKey;
  type: ColumnDataType;
  isNested: boolean;
  referenceTableName?: string;
}

interface Source {
  startLine: number; // starts from 1
  startColumn: number; // starts from 1
}

export interface Viewport {
  fieldKey?: FieldKey;
  totalKey?: TotalKey;
  start_row: number;
  end_row: number;
  is_content?: boolean;
}

export enum Status {
  Succeed = 'SUCCEED',
  Failed = 'FAILED',
  VersionConflict = 'VERSION_CONFLICT',
  NotFound = 'NOT_FOUND',
  InvalidConflict = 'INVALID_PROTOCOL',
  Unrecognized = 'UNRECOGNIZED',
}

export interface ProjectState {
  projectName: string;
  bucket: string;
  path: string | null | undefined; // Path relative to project bucket
  sheets: WorksheetState[];
  version: string;
  settings: Record<string, any>; // Specify later, just reservation for future
}

export interface WorksheetState {
  projectName: string;
  sheetName: string;
  content: string;
  parsingErrors?: ParsingError[];
  compilationErrors?: CompilationError[];
}

export interface ParsingError {
  tableKey?: TableKey;
  fieldKey?: FieldKey;
  applyKey?: ApplyKey;
  totalKey?: TotalKey;
  overrideKey?: OverrideKey;
  message: string;
  source: Source;
}

export interface CompilationError {
  tableKey?: TableKey;
  fieldKey?: FieldKey;
  applyKey?: ApplyKey;
  totalKey?: TotalKey;
  overrideKey?: OverrideKey;
  message: string;
  source?: Source;
}

export enum ColumnDataType {
  UNKNOWN = 'UNKNOWN',
  STRING = 'STRING',
  DOUBLE = 'DOUBLE',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  PERIOD_SERIES = 'PERIOD_SERIES',
  TABLE = 'TABLE',
  INPUT = 'INPUT',
  PERIOD_SERIES_POINT = 'PERIOD_SERIES_POINT',
}

export interface ColumnData {
  fieldKey?: FieldKey;
  totalKey?: TotalKey;

  startRow: string;
  endRow: string;

  data: string[];

  version: number;
  isPending: boolean;
  errorMessage?: string;

  isNested: boolean;
  type: ColumnDataType;
  referenceTableName?: string;
  periodSeries: PeriodSeries[];
}

export interface PeriodSeries {
  points: Record<string, string>;
}

export interface DimensionalSchemaRequest {
  dimensionalSchemaRequest: {
    formula: string;
    worksheets: Record<string, string>;
  };
}

export interface DimensionalSchemaResponse {
  dimensionalSchemaResponse: {
    formula: string;
    errorMessage?: string;
    schema: string[];
    keys: string[];
    fieldInfo: FieldInfo;
  };
}

export interface FunctionsRequest {
  functionRequest: {
    worksheets: Record<string, string>;
  };
}

export interface FunctionsResponse {
  functionResponse: {
    functions: FunctionInfo[];
  };
}

export enum FunctionType {
  CreateTable = 'CREATE_TABLE_FUNCTIONS',
  Table = 'TABLE_FUNCTIONS',
  Array = 'ARRAY_FUNCTIONS',
  Lookup = 'LOOKUP_FUNCTIONS',
  Aggregations = 'AGGREGATIONS_FUNCTIONS',
  Math = 'MATH_FUNCTIONS',
  PeriodSeries = 'PERIOD_SERIES_FUNCTIONS',
  Date = 'DATE_FUNCTIONS',
  Text = 'TEXT_FUNCTIONS',
  Logical = 'LOGICAL_FUNCTIONS',
  Python = 'PYTHON_FUNCTIONS',
}

export interface FunctionInfo {
  name: string;
  shortDescription?: string;
  description: string;
  arguments: Argument[];
  functionType?: FunctionType[];
}

export interface Argument {
  name: string;
  description: string;
  repeatable: boolean;
  optional: boolean;
}

export interface NotificationRequest {
  resources: {
    url: string;
  }[];
}

export interface NotificationEvent {
  url: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: number;
  etag?: string;
}

export interface ViewportRequest {
  calculateWorksheetsRequest: {
    project_name: string;
    viewports: Viewport[];
    worksheets: Record<string, string>;
    includeCompilation: boolean;
  };
}

export interface ViewportResponse {
  columnData: ColumnData;
  compileResult?: {
    compilationErrors?: CompilationError[];
    sheets?: {
      name: string;
      parsingErrors: ParsingError[];
    }[];
  };
}
