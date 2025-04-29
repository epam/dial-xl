import { ReactNode } from 'react';

export function PanelWrapper({
  children,
  panelName,
  isActive,
}: {
  children: ReactNode;
  panelName: string;
  isActive: boolean;
}) {
  return (
    <div
      className="flex flex-col items-start justify-start h-full w-full overflow-hidden"
      data-panel-active={isActive}
      id={`${panelName}-panel`}
    >
      {children}
    </div>
  );
}
