import { useContext, useRef } from 'react';

import { AppContext, ProjectContext } from '../../context';
import { ApplySuggestionButton } from './ApplySuggestionButton';
import { useApplySuggestions } from './useApplySuggestion';
import { useOverlay } from './useOverlay';

export function ChatPanelView() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { GPTSuggestions, lastStageCompleted } = useOverlay(containerRef);
  const { applySuggestion } = useApplySuggestions();
  const { chatWindowPlacement } = useContext(AppContext);
  const { projectSheets, sheetName } = useContext(ProjectContext);

  if (chatWindowPlacement === 'floating') {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="h-full min-w-full w-full" ref={containerRef}></div>
      <ApplySuggestionButton
        applySuggestion={() => applySuggestion(GPTSuggestions)}
        currentSheetName={sheetName}
        GPTSuggestions={GPTSuggestions}
        lastStageCompleted={lastStageCompleted}
        projectSheets={projectSheets}
      />
    </div>
  );
}
