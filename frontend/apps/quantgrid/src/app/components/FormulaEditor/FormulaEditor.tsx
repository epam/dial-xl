import { useCallback, useRef, useState } from 'react';

import { formulaEditorId } from '@frontend/common';

import { FormulaInputWrapper } from './FormulaInputWrapper';
import { useFormulaInputHeight } from './utils';

const expandedHeight = 100;

export function FormulaEditor() {
  const [expanded, setExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { height } = useFormulaInputHeight(containerRef);

  const onExpand = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  return (
    <div
      className="w-screen overflow-x-hidden my-2 pr-2"
      style={{
        height: `${expanded ? height + expandedHeight : height}px`,
        minHeight: `${expanded ? height + expandedHeight : height}px`,
      }}
    >
      <div
        className="flex h-full overflow-x-auto"
        id={formulaEditorId}
        ref={containerRef}
      >
        <FormulaInputWrapper expanded={expanded} onExpand={onExpand} />
      </div>
    </div>
  );
}
