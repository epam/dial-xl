import { Button } from 'antd';
import classNames from 'classnames';
import { JSX } from 'react';

import Icon from '@ant-design/icons';
import {
  ApiError,
  ExclamationCircleIcon,
  getErrorText,
  primaryButtonClasses,
} from '@frontend/common';

interface FileListErrorStateProps {
  error: ApiError;
  onRetry: () => void;
}

export function FileListErrorState({
  error,
  onRetry,
}: FileListErrorStateProps): JSX.Element {
  const { title, description } = getErrorText(error);

  return (
    <div className="grow flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-4">
          <Icon
            className="text-text-error w-[40px]"
            component={() => <ExclamationCircleIcon />}
          />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <Button className={classNames(primaryButtonClasses)} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
