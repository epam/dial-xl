import { Button } from 'antd';
import { useCallback, useContext, useRef } from 'react';

import { ProjectContext } from '../../context';
import { autoTablePlacement } from '../../services';
import { useOverlay } from './useOverlay';

export function ChatWrapper() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { GPTSuggestions } = useOverlay(containerRef);
  const { sheetName, updateSheetContent } = useContext(ProjectContext);

  const onApplySuggestion = useCallback(() => {
    if (!sheetName || !GPTSuggestions) return;

    GPTSuggestions.forEach(({ sheetName: suggestionSheetName, dsl }) => {
      const dslWithAutoPlacedTables = autoTablePlacement(dsl);

      if (suggestionSheetName) {
        updateSheetContent(suggestionSheetName, dslWithAutoPlacedTables);

        return;
      }

      updateSheetContent(sheetName, dslWithAutoPlacedTables);
    });
  }, [GPTSuggestions, sheetName, updateSheetContent]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="h-full min-w-full w-full" ref={containerRef}></div>
      <Button
        className="w-full h-8 mt-1 mb-1"
        disabled={!GPTSuggestions}
        onClick={onApplySuggestion}
      >
        Modify sheets according GPT Suggestions
      </Button>
    </div>
  );
}
