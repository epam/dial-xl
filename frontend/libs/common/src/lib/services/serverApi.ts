import {
  forkedProjectMetadataKey,
  projectMetadataSettingsKey,
} from '../constants';

interface TableKey {
  table: string;
}

export interface FieldKey {
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
  hash?: string;
  referenceTableName?: string;
}

interface Source {
  startLine?: number; // starts from 1
  startColumn?: number; // starts from 1
  sheet?: string;
  startIndex?: number;
  stopIndex?: number;
}

export interface Viewport {
  fieldKey?: FieldKey;
  totalKey?: TotalKey;
  start_row: number;
  end_row: number;
  is_content?: boolean;
  is_raw: boolean;
}

export enum Status {
  Succeed = 'SUCCEED',
  Failed = 'FAILED',
  VersionConflict = 'VERSION_CONFLICT',
  NotFound = 'NOT_FOUND',
  InvalidConflict = 'INVALID_PROTOCOL',
  Unrecognized = 'UNRECOGNIZED',
}

export interface ForkedFrom {
  bucket: string;
  path: string | null | undefined;
  projectName: string;
}

export type ProjectAIResponseId = {
  responseId: string;
};

export interface ProjectMetadataSetting {
  [forkedProjectMetadataKey]?: ForkedFrom;
  assistantResponseIds?: ProjectAIResponseId[];
}

export type ProjectSettings = {
  [projectMetadataSettingsKey]?: ProjectMetadataSetting;
} & {
  [key: string]: unknown;
};

export interface ProjectState {
  projectName: string;
  bucket: string;
  path: string | null | undefined; // Path relative to project bucket
  sheets: WorksheetState[];
  version: string;
  settings: ProjectSettings;
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
  DOUBLE = 'DOUBLE',
  STRING = 'STRING',
  PERIOD_SERIES = 'PERIOD_SERIES',
  TABLE_REFERENCE = 'TABLE_REFERENCE',
  TABLE_VALUE = 'TABLE_VALUE',
}

export enum FormatType {
  FORMAT_TYPE_GENERAL = 'FORMAT_TYPE_GENERAL',
  FORMAT_TYPE_BOOLEAN = 'FORMAT_TYPE_BOOLEAN',
  FORMAT_TYPE_CURRENCY = 'FORMAT_TYPE_CURRENCY',
  FORMAT_TYPE_DATE = 'FORMAT_TYPE_DATE',
  FORMAT_TYPE_NUMBER = 'FORMAT_TYPE_NUMBER',
  FORMAT_TYPE_PERCENTAGE = 'FORMAT_TYPE_PERCENTAGE',
  FORMAT_TYPE_SCIENTIFIC = 'FORMAT_TYPE_SCIENTIFIC',
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BooleanFormatArgs {}

export interface NumberFormatArgs {
  format: number;
  useThousandsSeparator: boolean;
}

export interface ScientificFormatArgs {
  format: number;
}

export interface CurrencyFormatArgs {
  format: number;
  useThousandsSeparator: boolean;
  symbol: string;
}

export interface DateFormatArgs {
  pattern: string;
}

export interface PercentageFormatArgs {
  format: number;
}

export interface ColumnFormat {
  type: FormatType;

  booleanArgs?: BooleanFormatArgs;
  numberArgs?: NumberFormatArgs;
  scientificArgs?: ScientificFormatArgs;
  currencyArgs?: CurrencyFormatArgs;
  dateArgs?: DateFormatArgs;
  percentageArgs?: PercentageFormatArgs;
}

export interface ColumnData {
  fieldKey?: FieldKey;
  totalKey?: TotalKey;

  startRow: string;
  endRow: string;
  totalRows: string;

  data: string[];

  version: number;
  isPending: boolean;
  errorMessage?: string;

  isNested: boolean;
  type: ColumnDataType;
  format?: ColumnFormat;
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
    fieldInfo?: FieldInfo;
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

export interface ProjectCalculateRequest {
  projectCalculateRequest: {
    project: string;
  };
}

export interface ProjectCancelRequest {
  projectCancelRequest: {
    project: string;
  };
}

export interface ViewportRequest {
  calculateWorksheetsRequest: {
    project_name?: string;
    viewports: Viewport[];
    worksheets: Record<string, string>;
    includeCompilation?: boolean;
    includeProfile?: boolean;
    includeIndices?: boolean;
    shared?: boolean;
  };
}

interface CompileResult {
  compilationErrors?: CompilationError[];
  sheets?: {
    name: string;
    parsingErrors: ParsingError[];
  }[];
  fieldInfo?: FieldInfo[];
}

export interface ViewportResponse {
  columnData?: ColumnData;
  compileResult?: CompileResult;
  fieldInfo: FieldInfo[];
  profile?: Profile;
  index?: Index;
}

export interface Index {
  key: FieldKey;
  errorMessage?: string;
}

export interface Profile {
  tableKey?: TableKey;
  fieldKey?: FieldKey;
  totalKey?: TotalKey;
  overrideKey?: OverrideKey;
  source: Source;
  type: ExecutionType;
  status: ExecutionStatus;
  startedAt?: number;
  stoppedAt?: number;
  executionTime?: number;
}

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}

export enum ExecutionType {
  COMPUTE = 'COMPUTE',
  INDEX = 'INDEX',
}

export interface CompileRequest {
  compileWorksheetsRequest: {
    worksheets: Record<string, string>;
  };
}

export interface CompileResponse {
  compileResult: CompileResult;
}

export interface DownloadRequest {
  downloadRequest: {
    project: string;
    sheets: Record<string, string>;
    table: string;
    columns: string[];
  };
}
