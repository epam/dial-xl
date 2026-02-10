import { MetadataResourceType } from '../services';

export type ApiRequestFunction<T, K> = (params: T) => Promise<K | undefined>;
export enum ApiErrorType {
  Network = 'network',
  Unauthorized = 'unauthorized',
  ServerError = 'server_error',
  Unknown = 'unknown',
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
