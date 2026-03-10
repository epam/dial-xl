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
  isAssignable: boolean;
  referenceTableName?: string;
  hash?: string;
  format?: ColumnFormat;
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
  start_column?: number;
  end_column?: number;
  is_content?: boolean;
  is_raw: boolean;
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

export interface BooleanFormatArgs {}

export interface NumberFormatArgs {
  format: number | string; // It can be decimal digits, total digits or Compact type(K, M, B)
  useThousandsSeparator: boolean;
}

export interface ScientificFormatArgs {
  format: number | string;
}

export interface CurrencyFormatArgs {
  format: number | string; // It can be decimal digits, total digits or Compact type(K, M, B)
  useThousandsSeparator: boolean;
  symbol: string;
}

export interface DateFormatArgs {
  pattern: string;
}

export interface PercentageFormatArgs {
  format: number | string; // It can be decimal digits, total digits or Compact type(K, M, B)
  useThousandsSeparator: boolean;
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
    table?: string;
    project_name?: string;
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
    project: string;
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

// Import api

export type ProtoStruct = Record<string, unknown>;

export interface ImportDefinitionListRequest {
  importDefinitionListRequest: {
    project: string;
  };
}

export interface ImportDefinitionGetRequest {
  importDefinitionGetRequest: {
    project: string;
    definition: string;
  };
}

export interface ImportSourceListRequest {
  importSourceListRequest: {
    project: string;
  };
}

export interface ImportSourceGetRequest {
  importSourceGetRequest: {
    project: string;
    source: string;
  };
}

export interface ImportSourceCreateRequest {
  importSourceCreateRequest: {
    project: string;
    definition: string;
    name: string;
    configuration: ProtoStruct;
  };
}

export interface ImportSourceUpdateRequest {
  importSourceUpdateRequest: {
    project: string;
    source: string;
    name: string;
    configuration: ProtoStruct;
  };
}

export interface ImportSourceDeleteRequest {
  importSourceDeleteRequest: {
    project: string;
    source: string;
  };
}

export interface ImportConnectionTestRequest {
  importConnectionTestRequest: {
    project: string;
    definition: string;
    configuration: ProtoStruct;
  };
}

export interface ImportCatalogListRequest {
  importCatalogListRequest: {
    project: string;
    source: string;
  };
}

export interface ImportDatasetDiscoverRequest {
  importDatasetDiscoverRequest: {
    project: string;
    source: string;
    dataset: string;
  };
}

export interface ImportSyncListRequest {
  importSyncListRequest: {
    project: string;
    source?: string;
    dataset?: string;
  };
}

export interface ImportSyncGetRequest {
  importSyncGetRequest: {
    project: string;
    sync: string;
  };
}

export interface ImportSyncStartRequest {
  importSyncStartRequest: {
    project: string;
    source: string;
    dataset: string;
    schema: ImportSchema;
  };
}

export interface ImportSyncCancelRequest {
  importSyncCancelRequest: {
    project: string;
    source: string;
    sync: string;
  };
}

export interface ImportDefinitions {
  definitions: Record<string, ImportDefinition>;
}

export interface ImportDefinition {
  definition: string;
  name: string;
  specification?: ProtoStruct;
}

export interface ImportSources {
  sources: Record<string, ImportSource>;
}

export interface ImportSource {
  definition: string;
  source: string;
  name: string;
  configuration?: ProtoStruct;
}

export type ImportConnectionResult = 'SUCCESS' | 'FAILURE';

export interface ImportConnection {
  definition: string;
  result: ImportConnectionResult;
  error?: string;
}

export interface ImportCatalog {
  definition: string;
  source: string;
  datasets: Record<string, ImportDataset>;
}

export interface ImportDataset {
  definition: string;
  source: string;
  dataset: string;
  schema?: ImportSchema;
}

export interface ImportSyncs {
  syncs: Record<string, ImportSync>;
}

export type ImportSyncStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface ImportSync {
  definition: string;
  source: string;
  sync: string;
  version: string;
  status: ImportSyncStatus;
  startedAt: string;
  stoppedAt: string;
  schema: ImportSchema;
}

export interface ImportSchema {
  columns: Record<string, ImportColumn>;
}

export interface ImportColumn {
  column: string;
  type: string;
  targetType: ImportColumnType;
}

export enum ImportColumnType {
  IMPORT_COLUMN_TYPE_STRING = 'IMPORT_COLUMN_TYPE_STRING',
  IMPORT_COLUMN_TYPE_DOUBLE = 'IMPORT_COLUMN_TYPE_DOUBLE',
  IMPORT_COLUMN_TYPE_DATE = 'IMPORT_COLUMN_TYPE_DATE',
  IMPORT_COLUMN_TYPE_DATE_TIME = 'IMPORT_COLUMN_TYPE_DATE_TIME',
  IMPORT_COLUMN_TYPE_BOOLEAN = 'IMPORT_COLUMN_TYPE_BOOLEAN',
}

export interface ImportRequest {
  definition: string;
  path: string;
  dataset: string;
  schema: ImportSchema;
  configuration: ProtoStruct;
}

// Control values api

export interface ControlValuesRequest {
  controlValuesRequest: {
    project: string;
    sheets: Record<string, string>;
    key: FieldKey;
    query: string;
    start_row: number;
    end_row: number;
  };
}

export interface ControlValuesResponse {
  controlValuesResponse: {
    data: ColumnData;
    available: ColumnData;
  };
}

// Excel inputs

export interface ExcelCatalogGetRequest {
  excelCatalogGetRequest: {
    path: string;
  };
}

export interface ExcelCatalogGetResponse {
  excelCatalogGetResponse: {
    sheets: string[];
    tables: string[];
  };
}

export interface ExcelPreviewRequest {
  excelPreviewRequest: {
    path: string;
    start_row: number;
    end_row: number;
    start_column: number;
    end_column: number;
  };
}

export interface ExcelPreviewCell {
  row: number;
  column: number;
  value: string;
}

export interface ExcelPreviewResponse {
  excelPreviewResponse: {
    cell: ExcelPreviewCell[];
  };
}
