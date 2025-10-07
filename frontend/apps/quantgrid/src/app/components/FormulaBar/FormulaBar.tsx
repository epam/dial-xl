import { useRef } from 'react';

import { formulaEditorId } from '@frontend/common';

import { Formats } from '../Formats';
import { FormulaBarWrapper } from './FormulaBarWrapper';
import { useFormulaInputHeight } from './utils';

export function FormulaBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { containerHeight } = useFormulaInputHeight(containerRef);

  return (
    <div
      className="hidden md:block w-screen bg-bg-layer-3 text-text-primary border-b border-b-stroke-tertiary"
      style={{
        height: containerHeight,
        minHeight: containerHeight,
      }}
    >
      <div className="flex h-full grow">
        <div
          className="flex h-full overflow-x-auto grow"
          id={formulaEditorId}
          ref={containerRef}
        >
          <FormulaBarWrapper />
        </div>
        <div className="h-full">
          <Formats />
        </div>
      </div>
    </div>
  );
}
