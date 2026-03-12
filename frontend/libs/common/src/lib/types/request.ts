import { MetadataResourceType, ResourceMetadata } from '../services';

export enum ApiErrorType {
  Network = 'network',
  Unauthorized = 'unauthorized',
  ServerError = 'server_error',
  Unknown = 'unknown',
  AbortError = 'abort',
  ComputationPower = 'computation_power',
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  statusCode?: number;
}

export interface BucketFetchState {
  loading: boolean;
  error?: ApiError;
  bucket?: string;
}

export type ApiResult<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

export type ApiRequestFunctionWithError<P, D, E = ApiError> = (
  params: P,
) => Promise<ApiResult<D, E>>;

export type GetFilesParams = {
  path: string | null | undefined;
  isRecursive?: boolean;
  showErrors?: boolean;
};

export type GetMetadataParams = {
  resourceType: MetadataResourceType;
};

export type GetDimensionalSchemaParams = {
  formula: string;
  worksheets: Record<string, string>;
  suppressErrors?: boolean;
  projectPath?: string;
};

export type GetExcelCatalogParams = {
  path: string;
  suppressErrors?: boolean;
};

export type PreviewExcelDataParams = {
  path: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  suppressErrors?: boolean;
};

export type CreateFileParams = {
  bucket: string;
  path?: string | null;
  fileName: string;
  forceCreation?: boolean;
  fileBlob?: File;
  onProgress?: (progress: number, event: ProgressEvent<EventTarget>) => void;
  fileType?: string; // Needed if file blob omitted
  fileData?: string; // Needed if file blob omitted
};

export type CreateFileResult = { file: ResourceMetadata; etag: string | null };

export type CloneFileParams = {
  targetPath: string | null;
  targetBucket: string;
  suppressErrors?: boolean;
  newName?: string;
};
