import { useEffect, useRef } from 'react';
import isEqual from 'react-fast-compare';

import { FunctionInfo } from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { Monaco } from '@monaco-editor/react';

import { Language } from '../codeEditorConfig';
import { editor, IDisposable } from '../monaco';
import {
  registerCompletionProvider,
  registerFormattingProvider,
  registerFunctionSignatureProvider,
} from '../providers';
import { CodeEditorPlace } from '../types';

type Props = {
  monaco?: Monaco;
  codeEditor?: editor.IStandaloneCodeEditor;
  codeEditorPlace: CodeEditorPlace;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  language: Language;
  disableHelpers: boolean;
  currentTableName?: string;
  currentFieldName?: string;
};

export function useEditorRegisterProviders({
  monaco,
  codeEditor,
  codeEditorPlace,
  functions,
  parsedSheets,
  language,
  disableHelpers,
  currentTableName,
  currentFieldName,
}: Props) {
  const disposeCompletionProvider = useRef<IDisposable>();
  const disposeSignatureProvider = useRef<IDisposable>();
  const disposeFormattingProvider = useRef<IDisposable>();
  const disposeInlineCompletionProvider = useRef<IDisposable>();
  const registeredParsedSheets = useRef({});
  const registeredFunctions = useRef({});
  const registeredCurrentTableName = useRef<string | undefined>(undefined);
  const registeredCurrentFieldName = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isSheetsEqual = isEqual(parsedSheets, registeredParsedSheets.current);
    const isFunctionsEqual = isEqual(functions, registeredFunctions.current);
    const sameContext =
      registeredCurrentTableName.current === currentTableName &&
      registeredCurrentFieldName.current === currentFieldName;

    if (
      monaco &&
      codeEditor &&
      (!isSheetsEqual || !sameContext || !isFunctionsEqual) &&
      !disableHelpers
    ) {
      if (disposeCompletionProvider) {
        disposeCompletionProvider.current?.dispose();
      }

      const newDisposeCompletionProvider = registerCompletionProvider(
        monaco,
        codeEditor,
        functions,
        parsedSheets,
        language,
        currentTableName,
        currentFieldName
      );
      disposeCompletionProvider.current = newDisposeCompletionProvider;
      registeredCurrentTableName.current = currentTableName;
      registeredCurrentFieldName.current = currentFieldName;
    }

    if (
      monaco &&
      codeEditor &&
      (!isSheetsEqual || !isFunctionsEqual) &&
      !disableHelpers
    ) {
      if (disposeSignatureProvider) {
        disposeSignatureProvider.current?.dispose();
      }
      const newDisposeSignatureProvider = registerFunctionSignatureProvider(
        monaco,
        codeEditor,
        functions,
        language
      );
      disposeSignatureProvider.current = newDisposeSignatureProvider;
      registeredParsedSheets.current = parsedSheets;
      registeredFunctions.current = functions;
    }

    if (monaco && codeEditor && codeEditorPlace === 'codeEditor') {
      if (disposeFormattingProvider) {
        disposeFormattingProvider.current?.dispose();
      }
      const newDisposeFormattingProvider = registerFormattingProvider(
        monaco,
        language
      );
      disposeFormattingProvider.current = newDisposeFormattingProvider;
    }
  }, [
    monaco,
    codeEditor,
    codeEditorPlace,
    functions,
    parsedSheets,
    language,
    disableHelpers,
    currentTableName,
    currentFieldName,
  ]);

  useEffect(() => {
    if (disableHelpers) {
      disposeCompletionProvider.current?.dispose();
      disposeSignatureProvider.current?.dispose();
      disposeFormattingProvider.current?.dispose();
      disposeInlineCompletionProvider.current?.dispose();
      registeredParsedSheets.current = {};
      registeredFunctions.current = {};
    }
  }, [disableHelpers]);

  useEffect(() => {
    return () => {
      disposeCompletionProvider.current?.dispose();
      disposeSignatureProvider.current?.dispose();
      disposeFormattingProvider.current?.dispose();
    };
  }, []);
}
