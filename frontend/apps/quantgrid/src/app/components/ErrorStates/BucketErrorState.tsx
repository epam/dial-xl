import { Button } from 'antd';
import classNames from 'classnames';
import { JSX } from 'react';

import Icon from '@ant-design/icons';
import {
  ApiError,
  ExclamationCircleIcon,
  getErrorText,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { useLogout } from '../../hooks';

interface BucketErrorStateProps {
  error: ApiError;
  onRetry: () => void;
}

export function BucketErrorState({
  error,
  onRetry,
}: BucketErrorStateProps): JSX.Element {
  const { logoutWithRedirect } = useLogout();
  const { title, description } = getErrorText(error);

  return (
    <div
      className="size-full flex flex-col items-center pt-[15dvh] max-w-dvw"
      role="alert"
    >
      <div className="flex flex-col gap-7 items-center p-3 max-w-full">
        <Icon
          className="w-[48px] text-text-error"
          component={() => <ExclamationCircleIcon />}
        />
        <div className="flex flex-col gap-3 items-center">
          <h1 className="text-5xl">{title}</h1>
          <span className="text-lg">{description}</span>
        </div>
        <div className="flex gap-4">
          <Button
            className={classNames(primaryButtonClasses)}
            onClick={onRetry}
          >
            Try again
          </Button>
          <Button
            className={classNames(secondaryButtonClasses)}
            onClick={logoutWithRedirect}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
