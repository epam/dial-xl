import { useContext, useEffect, useRef } from 'react';

import { CodeEditorContext, FunctionInfo } from '@frontend/common';
import { Monaco } from '@monaco-editor/react';

import { Language } from '../codeEditorConfig';
import { CancellationToken, languages } from '../monaco';
import {
  buildMessages,
  createSuggestion,
  fetchSuggestion,
  getFilteredAndFormattedSuggestions,
} from '../services';
import { CodeEditorPlace } from '../types';

type Props = {
  monaco?: Monaco;
  codeEditorPlace: CodeEditorPlace;
  disableHelpers: boolean;
  language: Language;
  functions: FunctionInfo[];
  sheetContent: string;
  currentTableName?: string;
  currentFieldName?: string;
};

const debounceDelay = 500;

export function useInlineSuggestions({
  codeEditorPlace,
  disableHelpers,
  monaco,
  language,
  functions,
  sheetContent = '',
  currentTableName,
  currentFieldName,
}: Props) {
  const { getCompletions } = useContext(CodeEditorContext);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingPromise = useRef<{
    resolve: any;
    reject: any;
    token: CancellationToken;
  } | null>(null);

  useEffect(() => {
    if (!monaco) return;

    let inlineCompletionsEmpty = true;

    function cleanUpTimers() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      pendingPromise.current = null;
    }

    const provider = monaco.languages.registerInlineCompletionsProvider(
      language,
      {
        provideInlineCompletions: (
          model,
          position,
          _,
          token
        ): Promise<languages.InlineCompletions | null> => {
          return new Promise((resolve, reject) => {
            if (debounceTimer.current) {
              clearTimeout(debounceTimer.current);
            }

            pendingPromise.current = { resolve, reject, token };

            debounceTimer.current = setTimeout(async () => {
              function cleanUp() {
                resolve(null);
                pendingPromise.current = null;
              }

              if (
                !pendingPromise.current ||
                pendingPromise.current.token.isCancellationRequested
              ) {
                cleanUp();

                return;
              }

              try {
                inlineCompletionsEmpty = true;

                if (
                  !model ||
                  !position ||
                  token.isCancellationRequested ||
                  !inlineCompletionsEmpty ||
                  disableHelpers
                ) {
                  cleanUp();

                  return;
                }

                const messages = buildMessages(
                  model,
                  position,
                  functions,
                  codeEditorPlace,
                  sheetContent,
                  currentTableName,
                  currentFieldName
                );
                const suggestionText = await fetchSuggestion(
                  messages,
                  getCompletions
                );

                if (!suggestionText) {
                  cleanUp();

                  return;
                }

                const newSuggestion = createSuggestion(
                  suggestionText,
                  position
                );

                const items = getFilteredAndFormattedSuggestions(
                  newSuggestion,
                  model,
                  position
                );

                const result = {
                  enableForwardStability: true,
                  items,
                  commands: [],
                };

                inlineCompletionsEmpty = false;

                resolve(result);
              } catch (error) {
                reject(error);
              } finally {
                pendingPromise.current = null;
              }
            }, debounceDelay);
          });
        },
        freeInlineCompletions: () => {
          inlineCompletionsEmpty = true;
          cleanUpTimers();
        },
      }
    );

    return () => {
      provider.dispose();
      cleanUpTimers();
    };
  }, [
    codeEditorPlace,
    getCompletions,
    language,
    monaco,
    functions,
    sheetContent,
    currentTableName,
    currentFieldName,
    disableHelpers,
  ]);

  return null;
}
