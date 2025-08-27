import classNames from 'classnames';
import { ReactNode } from 'react';

import Icon from '@ant-design/icons';
import { ChevronDown, projectPanelSectionHeaderClass } from '@frontend/common';

interface Props {
  title: string;
  index: number;
  maxIndex: number;
  children?: ReactNode;

  isCollapsed: boolean;
  onClick: () => void;
}

export const ProjectPanelSectionHeader = ({
  title,
  index,
  maxIndex,
  children,
  isCollapsed,
  onClick,
}: Props) => {
  return (
    <div
      className={classNames(
        'sticky select-none cursor-pointer h-[42px] flex gap-1 items-center overflow-hidden z-10 bg-bgLayer3 text-textPrimary px-3 py-3 [&:not(:first-child)]:border-t border-strokePrimary',
        projectPanelSectionHeaderClass
      )}
      style={{
        top: index * 42,
        bottom: (maxIndex - index - 1) * 42,
      }}
      onClick={onClick}
    >
      <Icon
        className={classNames(
          'w-[18px] transition-transform shrink-0',
          isCollapsed ? '-rotate-90' : 'rotate-0'
        )}
        component={() => <ChevronDown />}
      />

      <span className="font-semibold truncate grow text-[13px]">{title}</span>

      {children && (
        <span
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </span>
      )}
    </div>
  );
};
