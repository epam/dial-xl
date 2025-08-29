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
        'h-full flex flex-col bg-bgLayer2 border rounded-[3px]',
        className,
        errorMessage ? 'border-strokeError' : 'border-strokePrimary'
      )}
    >
      <div className="flex justify-between p-2">
        <div className="flex items-center">
          <Icon
            className="text-textSecondary w-[18px] mr-1"
            component={() => icon}
          />
          <h3 className="text-textPrimary text-[12px] leading-[18px]">
            {title}
          </h3>
        </div>
        {errorMessage && (
          <Tooltip placement="top" title={errorMessage}>
            <Icon
              className="text-textError w-[18px] mr-1"
              component={() => <ExclamationCircleIcon />}
            />
          </Tooltip>
        )}
      </div>

      {children}
    </div>
  );
}
