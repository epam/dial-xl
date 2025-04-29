import classNames from 'classnames';

import Icon from '@ant-design/icons';
import { ArrowNarrowUp } from '@frontend/common';

type Props = {
  title: string;
  isSort: boolean;
  sortAsc: boolean;
  onClick: () => void;
};

export function DashboardFileListHeader({
  title,

  sortAsc,
  isSort,
  onClick,
}: Props) {
  return (
    <div
      className="flex items-center text-textSecondary cursor-pointer"
      onClick={onClick}
    >
      <span className="text-xs font-bold leading-[12px] uppercase select-none">
        {title}
      </span>
      {isSort && (
        <Icon
          className={classNames('size-[18px]', sortAsc ? 'rotate-180' : '')}
          component={() => <ArrowNarrowUp />}
        />
      )}
    </div>
  );
}
