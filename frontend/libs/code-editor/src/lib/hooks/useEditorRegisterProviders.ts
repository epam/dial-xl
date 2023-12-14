import { useEffect, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';

import { FunctionInfo, ParsedSheets } from '@frontend/common';
import { Monaco } from '@monaco-editor/react';

import { Language } from '../codeEditorConfig';
import { editor, IDisposable } from '../monaco';
import {
  registerCompletionProvider,
  registerFunctionSignatureProvider,
} from '../providers';

type Props = {
  monaco?: Monaco;
  codeEditor?: editor.IStandaloneCodeEditor;
  isFormulaBar: boolean;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  language: Language;
  disableHelpers: boolean;
};

export function useEditorRegisterProviders({
  monaco,
  codeEditor,
  isFormulaBar,
  functions,
  parsedSheets,
  language,
  disableHelpers,
}: Props) {
  const [disposeCompletionProvider, setDisposeCompletionProvider] =
    useState<IDisposable>();
  const [disposeSignatureProvider, setDisposeSignatureProvider] =
    useState<IDisposable>();
  const registeredParsedSheets = useRef({});

  useEffect(() => {
    const isSheetsEqual = isEqual(parsedSheets, registeredParsedSheets.current);

    if (monaco && codeEditor && !isSheetsEqual && !disableHelpers) {
      const newDisposeCompletionProvider = registerCompletionProvider(
        monaco,
        codeEditor,
        functions,
        parsedSheets,
        language
      );
      setDisposeCompletionProvider(newDisposeCompletionProvider);

      const newDisposeSignatureProvider = registerFunctionSignatureProvider(
        monaco,
        codeEditor,
        functions,
        language
      );
      setDisposeSignatureProvider(newDisposeSignatureProvider);
      registeredParsedSheets.current = parsedSheets;
    }
  }, [
    monaco,
    codeEditor,
    isFormulaBar,
    functions,
    parsedSheets,
    language,
    disableHelpers,
  ]);

  useEffect(() => {
    if (disableHelpers) {
      disposeCompletionProvider?.dispose();
      disposeSignatureProvider?.dispose();
      registeredParsedSheets.current = {};
    }
  }, [disableHelpers, disposeCompletionProvider, disposeSignatureProvider]);

  useEffect(() => {
    return () => {
      disposeCompletionProvider?.dispose();
    };
  }, [disposeCompletionProvider]);

  useEffect(() => {
    return () => disposeSignatureProvider?.dispose();
  }, [disposeSignatureProvider]);
}
