import { toast } from 'react-toastify';
import { ToastOptions, TypeOptions } from 'react-toastify/dist/types';

import { hashCode } from '@frontend/common';

export function displayToast(type: TypeOptions, message: string) {
  toast(message, {
    ...getToastConfig(message),
    type,
  });
}

function getToastConfig(message: string): ToastOptions {
  return {
    toastId: hashCode(message),
  };
}
