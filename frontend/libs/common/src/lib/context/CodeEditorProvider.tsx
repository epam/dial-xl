import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { ParsingError } from '../services';
import { CodeEditorContext } from './CodeEditorContext';

type CodeEditorProps = {
  dialBaseUrl: string;
};

export function CodeEditorContextProvider({
  children,
  dialBaseUrl,
}: PropsWithChildren<CodeEditorProps>): JSX.Element {
  const auth = useAuth();
  const [selectedError, setSelectedError] = useState<ParsingError | null>(null);
  const [hasUnsavedChanges, showHasUnsavedChanges] = useState<boolean>(false);
  const [initialOffset, setInitialOffset] = useState<number | undefined>();
  const [codeEditorInstance, setCodeEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);

  const updateSelectedError = useCallback((error: ParsingError | null) => {
    setSelectedError(error);
  }, []);

  const updateInitialOffset = useCallback((offset: number | undefined) => {
    setInitialOffset(offset);
  }, []);

  const formatDocument = useCallback(() => {
    if (!codeEditorInstance) return;

    codeEditorInstance.trigger('', 'editor.action.formatDocument', {});
  }, [codeEditorInstance]);

  const getCompletions = useCallback(
    async (body: string) => {
      const url =
        dialBaseUrl +
        '/openai/deployments/gpt-4o-mini-2024-07-18/chat/completions?api-version=2024-02-15-preview';

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (auth.user?.access_token) {
        headers['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      return fetch(url, { method: 'post', headers, body });
    },
    [auth, dialBaseUrl]
  );

  const value = useMemo(
    () => ({
      selectedError,
      updateSelectedError,

      hasUnsavedChanges,
      showHasUnsavedChanges,

      initialOffset,
      updateInitialOffset,

      formatDocument,
      setCodeEditorInstance,

      getCompletions,
    }),
    [
      selectedError,
      updateSelectedError,
      hasUnsavedChanges,
      initialOffset,
      updateInitialOffset,
      formatDocument,
      getCompletions,
    ]
  );

  return (
    <CodeEditorContext.Provider value={value}>
      {children}
    </CodeEditorContext.Provider>
  );
}
