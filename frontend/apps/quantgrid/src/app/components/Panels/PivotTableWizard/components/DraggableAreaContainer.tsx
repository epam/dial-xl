import { Tooltip } from 'antd';
import classNames from 'classnames';
import { PropsWithChildren, ReactNode } from 'react';

import Icon from '@ant-design/icons';
import { ExclamationCircleIcon } from '@frontend/common';

interface Props {
  className?: string;
  errorMessage?: string;
  icon: ReactNode;
  title: string;
}

export function DraggableAreaContainer({
  errorMessage,
  children,
  className,
  icon,
  title,
}: PropsWithChildren<Props>) {
  return (
    <div
      className={classNames(
        'h-full flex flex-col bg-bg-layer-2 border rounded-[3px]',
        className,
        errorMessage ? 'border-stroke-error' : 'border-stroke-primary'
      )}
    >
      <div className="flex justify-between p-2">
        <div className="flex items-center">
          <Icon
            className="text-text-secondary w-[18px] mr-1"
            component={() => icon}
          />
          <h3 className="text-text-primary text-[12px] leading-[18px]">
            {title}
          </h3>
        </div>
        {errorMessage && (
          <Tooltip placement="top" title={errorMessage} destroyOnHidden>
            <Icon
              className="text-text-error w-[18px] mr-1"
              component={() => <ExclamationCircleIcon />}
            />
          </Tooltip>
        )}
      </div>

      {children}
    </div>
  );
}
