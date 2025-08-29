import { Tooltip } from 'antd';
import cx from 'classnames';
import { ReactNode } from 'react';

import Icon from '@ant-design/icons';

export interface ProjectTitleTagProps {
  tooltipText: string;
  title: string;
  icon: ReactNode;
  containerClasses?: string;
  iconClasses?: string;
  textClasses?: string;
}

export function ProjectTitleTag({
  tooltipText,
  title,
  icon,
  containerClasses = '',
  iconClasses = '',
  textClasses = '',
}: ProjectTitleTagProps) {
  return (
    <Tooltip placement="bottom" title={tooltipText}>
      <div
        className={cx(
          'flex items-center px-2 leading-[18px] rounded-[30px] border',
          containerClasses
        )}
      >
        <Icon
          className={cx('w-[18px] mr-1', iconClasses)}
          component={() => icon}
        />

        <span className={cx('text-[10px] font-bold', textClasses)}>
          {title}
        </span>
      </div>
    </Tooltip>
  );
}
