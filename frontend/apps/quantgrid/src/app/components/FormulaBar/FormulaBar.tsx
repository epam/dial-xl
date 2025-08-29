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
      className="hidden md:block w-screen bg-bgLayer3 text-textPrimary border-b border-b-strokeTertiary"
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
