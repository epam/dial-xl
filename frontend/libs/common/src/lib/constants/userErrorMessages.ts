import { ApiError, ApiErrorType } from '../types';

export type ErrorText = {
  title: string;
  description: string;
};

const apiErrorTextByType: Partial<Record<ApiErrorType, ErrorText>> = {
  [ApiErrorType.Network]: {
    title: 'Connection Error',
    description:
      'Unable to connect to the service. Please check your internet connection.',
  },
  [ApiErrorType.ServerError]: {
    title: 'Service Unavailable',
    description:
      'The service is temporarily unavailable. Please try again in a moment.',
  },
  [ApiErrorType.Unauthorized]: {
    title: 'Access Denied',
    description: 'You do not have permission to access these items.',
  },
  [ApiErrorType.ComputationPower]: {
    title: 'Insufficient Resources',
    description:
      'There is no computation power at the moment. Please try again later.',
  },
};

const defaultErrorText: ErrorText = {
  title: 'Something went wrong',
  description: 'Please try again.',
};

export function getErrorText(error: ApiError): ErrorText {
  const mapped = error.type ? apiErrorTextByType[error.type] : undefined;

  return {
    title: mapped?.title ?? defaultErrorText.title,
    description:
      mapped?.description ?? error.message ?? defaultErrorText.description,
  };
}
