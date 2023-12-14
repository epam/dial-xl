import { ForwardedRef, forwardRef, useContext, useMemo } from 'react';

import { MinimizedPanelProps, PanelPosition } from '../../common';
import { LayoutContext } from '../../context';

type Props = {
  panels?: MinimizedPanelProps[];
  position: PanelPosition;
};

export const PanelStatusBar = forwardRef(function PanelStatusBar(
  { panels, position }: Props,
  ref: ForwardedRef<HTMLDivElement>
) {
  const { togglePanel } = useContext(LayoutContext);

  const listClasses = useMemo(
    () =>
      position === PanelPosition.Bottom
        ? 'justify-start border-t-2 border-t-neutral-100 justify pl-3'
        : 'justify-end transform -rotate-90 -translate-x-100',
    [position]
  );

  return (
    <div
      className="bg-neutral-50 border-y-neutral-100 text-sm text-neutral-400 overflow-hidden w-full h-full"
      ref={ref}
    >
      <ul className={`flex items-center h-6  p-0 m-0  ${listClasses}`}>
        {panels?.map((p) => (
          <div
            className="bg-transparent flex items-center h-6 cursor-pointer text-neutral-600 hover:bg-neutral-200 select-none"
            key={p.name}
            onClick={() => togglePanel(p.name)}
          >
            {p.icon && <div className="flex align-center mr-3">{p.icon}</div>}
            <div className="mr-3">{p.title}</div>
          </div>
        ))}
      </ul>
    </div>
  );
});
