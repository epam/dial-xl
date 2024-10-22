import { useRef } from 'react';

import { formulaEditorId } from '@frontend/common';

import { FormulaBarWrapper } from './FormulaBarWrapper';
import { useFormulaInputHeight } from './utils';

export function FormulaBar() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { containerHeight } = useFormulaInputHeight(containerRef);

  return (
    <div
      className="w-screen overflow-x-hidden bg-bgLayer3 text-textPrimary border-b border-b-strokeTertiary"
      style={{
        height: containerHeight,
        minHeight: containerHeight,
      }}
    >
      <div
        className="flex h-full overflow-x-auto"
        id={formulaEditorId}
        ref={containerRef}
      >
        <FormulaBarWrapper />
      </div>
    </div>
  );
}
