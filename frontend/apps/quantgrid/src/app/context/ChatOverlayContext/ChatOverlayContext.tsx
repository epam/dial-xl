import { createContext } from 'react';

import { ChatOverlay, OverlayConversation } from '@epam/ai-dial-overlay';
import { GPTFocusColumn, GPTSuggestion } from '@frontend/common';

export const playbackLabel = '[Playback]';

type ChatOverlayContextValues = {
  overlay: ChatOverlay | null;
  attachOverlay: (host: HTMLElement | null) => void;

  GPTSuggestions: GPTSuggestion[] | null;
  focusColumns: GPTFocusColumn[] | null;
  projectConversations: OverlayConversation[];
  userLocalConversations: OverlayConversation[];
  selectedConversation: OverlayConversation | undefined;
  isReadOnlyProjectChats: boolean;
  isConversationsLoading: boolean;
  answerIsGenerating: boolean;

  createConversation: () => void;
  createPlayback: (conversationId: string) => void;
  onApplySuggestion: () => void;

  isAIPendingChanges: boolean;
  acceptPendingChanges: () => Promise<void>;
  discardPendingChanges: () => void;
  isAIEditPendingChanges: boolean;
  updateAIEditPendingChanges: (value: boolean) => void;

  isMajorChangedAIAnswer: boolean;
  regenerateSummary: () => void;

  isAIPreview: boolean;
  exitAIPreview: () => void;

  renameConversation: (id: string, newName: string) => Promise<void>;
};

export const ChatOverlayContext = createContext<ChatOverlayContextValues>(
  {} as ChatOverlayContextValues
);
