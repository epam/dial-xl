import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  BugOffIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  NoteIcon,
  RefreshIcon,
  SchoolIcon,
  Shortcut,
  shortcutApi,
  TableIcon,
} from '@frontend/common';

import { Edges, GridApi } from '../../types';
import { AIPromptAction, AIPromptSection } from './types';

export const useAIPromptSuggestions = ({
  api,
  selection,
  previousPrompts,
  isSuggestionReview,
  isTextAnswer,
  isLoading,
  isError,
  onSelectPrompt,
  onAccept,
  onDiscard,
  onTryAgain,
  onNewMessage,
  onAddNote,
  onHide,
}: {
  api: GridApi | null;
  selection: Edges | null;
  previousPrompts: string[];
  isSuggestionReview: boolean;
  isTextAnswer: boolean;
  isLoading: boolean;
  isError: boolean;
  onSelectPrompt: (prompt: string) => void;
  onAccept: () => void;
  onDiscard: () => void;
  onTryAgain: () => void;
  onNewMessage: () => void;
  onAddNote: () => void;
  onHide: () => void;
}) => {
  const predefinedPromptsSection: AIPromptSection = useMemo(() => {
    return {
      section: 'Suggestions',
      items: [
        {
          key: 'explain',
          label: 'Explain ...',
          isPrompt: true,
          icon: (
            <Icon
              className="text-textSecondary w-[20px]"
              component={() => <SchoolIcon />}
            />
          ),
          onClick: async () => {
            onSelectPrompt('Explain ');
          },
        },
        {
          key: 'createTable',
          label: 'Create a table ...',
          isPrompt: true,
          icon: (
            <Icon
              className="text-textSecondary stroke-textSecondary w-[18px]"
              component={() => <TableIcon />}
            />
          ),
          onClick: async () => {
            onSelectPrompt('Create a table ');
          },
        },
        {
          key: 'fixError',
          label: 'Fix error ...',
          isPrompt: true,
          icon: (
            <Icon
              className="text-textSecondary stroke-textSecondary w-[18px]"
              component={() => <BugOffIcon />}
            />
          ),
          onClick: async () => {
            onSelectPrompt('Fix error ');
          },
        },
      ],
    };
  }, [onSelectPrompt]);

  const previousUserPromptsSection: AIPromptSection | undefined =
    useMemo(() => {
      return previousPrompts && previousPrompts.length > 0
        ? {
            section: 'Previous prompts',
            items: previousPrompts.map((prompt, index) => ({
              key: `user-prompt-${index}`,
              label: prompt,
              tooltip: prompt,
              isPrompt: true,
              icon: (
                <Icon
                  className="stroke-textSecondary text-textSecondary w-[18px]"
                  component={() => <EditIcon />}
                />
              ),
              onClick: async () => {
                onSelectPrompt(prompt);
              },
            })),
          }
        : undefined;
    }, [onSelectPrompt, previousPrompts]);

  // Showed before user send
  const promptsMenuItems = useMemo(() => {
    return [predefinedPromptsSection, previousUserPromptsSection].filter(
      Boolean
    ) as AIPromptSection[];
  }, [predefinedPromptsSection, previousUserPromptsSection]);

  // Showed when assistant returned suggestion
  const suggestionItems: AIPromptSection = useMemo(() => {
    return {
      section: 'Result',
      items: [
        {
          key: 'accept',
          label: 'Accept',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <CheckIcon />}
            />
          ),
          onClick: async () => {
            onAccept();
          },
        },
        {
          key: 'discard',
          label: 'Discard',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <CloseIcon />}
            />
          ),
          shortcut: shortcutApi.getLabel(Shortcut.UndoAction),
          onClick: async () => {
            onDiscard();
          },
        },
        {
          key: 'tryAgain',
          label: 'Try again',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <RefreshIcon />}
            />
          ),
          onClick: async () => {
            onTryAgain();
          },
        },
      ],
    };
  }, [onAccept, onDiscard, onTryAgain]);

  const textAnswerItems: AIPromptSection = useMemo(() => {
    let showAddNote = false;
    if (selection) {
      const cell = api?.getCell(selection.startCol, selection.startRow);

      if (cell?.table?.tableName && cell.field?.fieldName) {
        showAddNote = true;
      }
    }

    return {
      section: 'Result',
      items: [
        {
          key: 'ok',
          label: 'Ok',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <CheckIcon />}
            />
          ),
          onClick: async () => {
            onHide();
          },
        },
        showAddNote
          ? {
              key: 'addNote',
              label: 'Add note',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <NoteIcon />}
                />
              ),
              onClick: async () => {
                onAddNote();
              },
            }
          : undefined,
        {
          key: 'tryAgain',
          label: 'Try again',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <RefreshIcon />}
            />
          ),
          onClick: async () => {
            onTryAgain();
          },
        },
        {
          key: 'typeNewMessage',
          label: 'Type new message',
          icon: (
            <Icon
              className="stroke-textSecondary w-[18px]"
              component={() => <EditIcon />}
            />
          ),
          onClick: async () => {
            onNewMessage();
          },
        },
      ].filter(Boolean) as AIPromptAction[],
    };
  }, [api, onAddNote, onHide, onNewMessage, onTryAgain, selection]);

  const contextMenuItems: AIPromptSection[] = useMemo(() => {
    if (isLoading || isError) {
      return [];
    }

    if (isSuggestionReview) {
      return [suggestionItems];
    }

    if (isTextAnswer) {
      return [textAnswerItems];
    }

    return promptsMenuItems;
  }, [
    isError,
    isLoading,
    isSuggestionReview,
    isTextAnswer,
    promptsMenuItems,
    suggestionItems,
    textAnswerItems,
  ]);

  return { contextMenuItems };
};
