import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import { JSX } from 'react';

import Icon from '@ant-design/icons';
import {
  ApiError,
  CloseIcon,
  ExclamationCircleIcon,
  getErrorText,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

interface ViewportErrorBannerProps {
  error: ApiError;
  onReload: () => void;
  onHide: () => void;
  onCloseProject: () => void;
}

export function ProjectDataLoadingErrorBanner({
  error,
  onReload,
  onHide,
  onCloseProject,
}: ViewportErrorBannerProps): JSX.Element {
  const { title, description } = getErrorText(error);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/30 z-150"
      role="alert"
    >
      <div className="bg-bg-layer-1 rounded-lg shadow-lg max-w-md w-full mx-4 relative">
        <Tooltip
          placement="top"
          title="Hide this message and continue without project data"
        >
          <button
            aria-label="Close"
            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            onClick={onHide}
          >
            <Icon className="w-5 h-5" component={() => <CloseIcon />} />
          </button>
        </Tooltip>

        <div className="flex flex-col gap-6 items-center p-6">
          <Icon
            className="w-12 h-12 text-text-error"
            component={() => <ExclamationCircleIcon />}
          />
          <div className="flex flex-col gap-2 items-center text-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-text-secondary">{description}</p>
          </div>
          <div className="flex gap-4">
            <Button
              className={classNames(primaryButtonClasses, 'flex-1')}
              onClick={onReload}
            >
              Reload project
            </Button>

            <Button
              className={classNames(secondaryButtonClasses, 'flex-1')}
              onClick={onCloseProject}
            >
              Back to projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
