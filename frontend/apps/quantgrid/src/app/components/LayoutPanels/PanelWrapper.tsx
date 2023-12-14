import { ReactNode } from 'react';

export function PanelWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-start h-full w-full overflow-hidden">
      {children}
    </div>
  );
}
