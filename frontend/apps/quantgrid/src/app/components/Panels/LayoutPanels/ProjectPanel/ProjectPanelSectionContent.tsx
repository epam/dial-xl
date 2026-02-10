import classNames from 'classnames';
import { ReactNode } from 'react';

export const ProjectPanelSectionContent = ({
  isCollapsed,
  children,
}: {
  isCollapsed: boolean;
  children: ReactNode;
}) => {
  return (
    <div
      className={classNames(
        'px-2 transition-all overflow-hidden',
        isCollapsed ? 'h-0 pb-0' : 'pb-2 h-[calc-size(auto,size)]'
      )}
    >
      {children}
    </div>
  );
};
