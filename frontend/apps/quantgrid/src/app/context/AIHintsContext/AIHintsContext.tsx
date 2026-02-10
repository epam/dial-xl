import { createContext } from 'react';

import { AIHint } from '@frontend/common';

type AIHintsContextActions = {
  hints: AIHint[];
  hintsValidationResult: boolean[];
  isHintsLoading: boolean;

  getHints: () => void;
  updateHints: (updatedHints: AIHint[]) => void;
  newHintsModal: () => void;
  editHintModal: (index: number) => void;
  deleteHintModal: (index: number) => void;

  importAIHints: () => void;
  exportAIHints: () => void;

  selectedHintsIndexes: number[];
  toggleSelectionHint: (hintIndex: number) => void;

  toggleHintVisibility: (hintIndex: number) => void;
};

export const AIHintsContext = createContext<AIHintsContextActions>(
  {} as AIHintsContextActions
);
