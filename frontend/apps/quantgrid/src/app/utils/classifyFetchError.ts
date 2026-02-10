import { ApiError, ApiErrorType } from '@frontend/common';

/**
 * Classify fetch error from catch block and return corresponding ApiError.
 */
export function classifyFetchError(
  error: unknown,
  defaultMessage: string,
): ApiError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: ApiErrorType.Unknown,
      message: 'Request was aborted',
    };
  }

  if (error instanceof SyntaxError) {
    return {
      type: ApiErrorType.Unknown,
      message: 'Invalid response format',
    };
  }

  if (error instanceof TypeError) {
    return {
      type: ApiErrorType.Network,
      message: defaultMessage,
    };
  }

  return {
    type: ApiErrorType.Unknown,
    message: defaultMessage,
  };
}
