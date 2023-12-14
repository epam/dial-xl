export interface ClientRequest {
  id?: string;
  project_list_request?: ProjectListRequest;
  create_project_request?: CreateProjectRequest;
  delete_project_request?: DeleteProjectRequest;
  open_project_request?: OpenProjectRequest;
  rename_project_request?: RenameProjectRequest;
  close_project_request?: CloseProjectRequest;
  put_worksheet_request?: PutWorksheetRequest;
  open_worksheet_request?: OpenWorksheetRequest;
  rename_worksheet_request?: RenameWorksheetRequest;
  delete_worksheet_request?: DeleteWorksheetRequest;
  close_worksheet_request?: CloseWorksheetRequest;
  viewport_request?: ViewportRequest;
  input_list_request?: InputListRequest;
  dimensional_schema_request?: DimensionalSchemaRequest;
  function_request?: FunctionRequest;
  ping?: Ping;
}

export interface ServerResponse {
  status: Status;
  id?: string;
  errorMessage?: string;
  pong?: Ping;
  worksheetState?: WorksheetState;
  projectState?: ProjectState;
  renameProjectResponse?: RenameProjectState;
  renameWorksheetResponse?: RenameWorksheetState;
  projectList?: ProjectList;
  inputList?: InputList;
  viewportState?: ViewportState;
  columnData?: ColumnData;
  dimensionalSchemaResponse?: DimensionalSchemaResponse;
  functionResponse?: FunctionResponse;
}

interface ProjectList {
  projects: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ProjectListRequest {}

interface CreateProjectRequest {
  project_name: string;
}

interface DeleteProjectRequest {
  project_name: string;
  version: number;
}

interface RenameProjectRequest {
  project_name: string;
  version: number;
  new_project_name: string;
}

interface OpenProjectRequest {
  project_name: string;
}

interface OpenWorksheetRequest {
  project_name: string;
  sheet_name: string;
}

interface DeleteWorksheetRequest {
  project_name: string;
  sheet_name: string;
  version: number;
}

interface RenameWorksheetRequest {
  project_name: string;
  version: number;
  old_sheet_name: string;
  new_sheet_name: string;
}

interface CloseWorksheetRequest {
  project_name: string;
  sheet_name: string;
}

interface CloseProjectRequest {
  project_name: string;
}

interface PutWorksheetRequest {
  project_name: string;
  sheet_name: string;
  content?: string;
  version: number;
}

interface ViewportRequest {
  project_name: string;
  viewports: Record<string, Viewport>;
}

export interface Viewport {
  fields: string[];
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
  sheets: WorksheetState[];
  version: number;
  isDeleted: boolean;
}

export interface WorksheetState {
  projectName: string;
  sheetName: string;
  content: string;
  version: number;
  isDeleted: boolean;
  parsingErrors?: ParsingError[];
  compilationErrors?: CompilationError[];
}

export interface ParsingError {
  line: number;
  position: number;
  message: string;
  tableName?: string;
  fieldName?: string;
}

export interface CompilationError {
  tableName: string;
  fieldName: string;
  message: string;
}

export interface RenameWorksheetState {
  projectName: string;
  version: number;
  oldSheetName: string;
  newSheetName: string;
}

export interface RenameProjectState {
  version: number;
  oldProjectName: string;
  newProjectName: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InputListRequest {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FunctionRequest {}

export interface InputFile {
  paths: string[] | undefined;
  inputName: string;
}

export interface InputList {
  inputs: InputFile[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Ping {}

export interface ViewportState {
  columns: ColumnData[];
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
}

export interface ColumnData {
  tableName: string;
  columnName: string;

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
  project_name: string;
  formula: string;
}

export interface DimensionalSchemaResponse {
  projectName: string;
  formula: string;
  errorMessage?: string;
  schema: string[];
  keys: string[];
}

export interface FunctionResponse {
  functions: FunctionInfo[];
}

export interface FunctionInfo {
  name: string;
  description: string;
  arguments: Argument[];
}

export interface Argument {
  name: string;
  description: string;
  repeatable: boolean;
  optional: boolean;
}
