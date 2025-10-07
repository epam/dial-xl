import { Monaco } from '@monaco-editor/react';

import { editor, IDisposable, IRange, languages, Position } from '../../monaco';
import CompletionItem = languages.CompletionItem;

import { CommonMetadata, FunctionInfo } from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { Language } from '../../codeEditorConfig';
import { Suggestion } from '../../types';
import {
  getCodeEditorIntellisenseSuggestions,
  getInlineIntellisenseSuggestions,
} from './getIntellisenseSuggestions';

const triggerCharacters = ['.', ',', '[', '(', '=', '@', "'", ' ', ':'];

export function registerCompletionProvider(
  monaco: Monaco,
  codeEditor: editor.IStandaloneCodeEditor,
  functions: FunctionInfo[],
  inputFiles: CommonMetadata[],
  parsedSheets: ParsedSheets,
  language: Language,
  currentTableName?: string,
  currentFieldName?: string
): IDisposable {
  return languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (
      model: editor.ITextModel,
      position: Position,
      context: languages.CompletionContext
    ) => {
      const currentWord = model.getWordUntilPosition(position);

      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn: currentWord.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: currentWord.endColumn,
      };

      let results: Suggestion[] = [];

      if (language === 'code-editor') {
        results = getCodeEditorIntellisenseSuggestions({
          model,
          position,
          context,
          functions,
          inputFiles,
          parsedSheets,
        });
      } else {
        results = getInlineIntellisenseSuggestions({
          model,
          position,
          context,
          functions,
          inputFiles,
          parsedSheets,
          currentTableName,
          currentFieldName,
        });
      }

      const suggestions: CompletionItem[] = results.map((result) => {
        return {
          ...result,
          kind: result.kind,
          label: result.label,
          insertText: result.insertText,
          sortText: result.sortText,
          detail: result.detail,
          command: result?.command,
          range: result?.range ?? range,
        };
      });

      return {
        suggestions,
      };
    },
    triggerCharacters,
  });
}
