import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { ParsingError } from '../services';

type CodeEditorContextActions = {
  selectedError: ParsingError | null;
  updateSelectedError: (error: ParsingError | null) => void;
};

export const CodeEditorContext = createContext<CodeEditorContextActions>(
  {} as CodeEditorContextActions
);

export function CodeEditorContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const [selectedError, setSelectedError] = useState<ParsingError | null>(null);

  const updateSelectedError = useCallback((error: ParsingError | null) => {
    setSelectedError(error);
  }, []);

  const value = useMemo(
    () => ({
      selectedError,
      updateSelectedError,
    }),
    [selectedError, updateSelectedError]
  );

  return (
    <CodeEditorContext.Provider value={value}>
      {children}
    </CodeEditorContext.Provider>
  );
}
