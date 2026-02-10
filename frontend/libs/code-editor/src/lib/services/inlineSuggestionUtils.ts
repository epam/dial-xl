import { FunctionInfo, GetCompletionFunction } from '@frontend/common';

import { editor, IRange, languages, Position } from '../monaco';
import {
  codeEditorInlineSuggestionPrompt,
  CompletionFormatter,
  formulaInlineSuggestionPrompt,
} from '../services';
import { CodeEditorPlace } from '../types';

export function getTextAroundCursor(
  model: editor.ITextModel,
  position: Position
) {
  const currentLine = model.getLineContent(position.lineNumber);
  const offset = model.getOffsetAt(position);

  const textBeforeCursor = model.getValue().substring(0, offset);
  const textBeforeCursorOnCurrentLine = currentLine.substring(
    0,
    position.column - 1
  );
  const textAfterCursor = model.getValue().substring(offset);

  return {
    textBeforeCursor,
    textBeforeCursorOnCurrentLine,
    textAfterCursor,
  };
}

export function buildMessages(
  model: editor.ITextModel,
  position: Position,
  functions: FunctionInfo[],
  codeEditorPlace: CodeEditorPlace,
  sheetContent?: string,
  currentTableName?: string,
  currentFieldName?: string
) {
  const { textBeforeCursor, textBeforeCursorOnCurrentLine, textAfterCursor } =
    getTextAroundCursor(model, position);

  const functionList = functions.map((f) => `**${f.name}**`).join(',');

  if (codeEditorPlace === 'codeEditor') {
    return [
      codeEditorInlineSuggestionPrompt(functionList),
      {
        content: textBeforeCursor,
        role: 'user',
        name: 'TextBeforeCursor',
      },
      {
        content: textBeforeCursorOnCurrentLine,
        role: 'user',
        name: 'TextBeforeCursorOnCurrentLine',
      },
      {
        content: textAfterCursor,
        role: 'user',
        name: 'TextAfterCursor',
      },
    ];
  }

  return [
    formulaInlineSuggestionPrompt(functionList),
    {
      content: textBeforeCursor,
      role: 'user',
      name: 'TextBeforeCursor',
    },
    {
      content: sheetContent,
      role: 'user',
      name: 'SheetContent',
    },
    {
      content: currentTableName || '',
      role: 'user',
      name: 'CurrentTable',
    },
    {
      content: currentFieldName || '',
      role: 'user',
      name: 'CurrentFieldName',
    },
  ];
}

export async function fetchSuggestion(
  messages: any[],
  getCompletions: GetCompletionFunction
) {
  const response = await getCompletions(JSON.stringify({ messages }));

  if (!response) return null;

  const data = await response.json();

  if (!data || !data.choices || !data.choices[0]?.message?.content) return null;

  return data.choices[0].message.content;
}

export function createSuggestion(
  suggestionText: string,
  position: Position
): languages.InlineCompletion {
  const lines = suggestionText.split('\n');
  const newLinesInSuggestion = lines.length - 1;
  const lastLineLength = lines[lines.length - 1].length;

  return {
    insertText: suggestionText,
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber + newLinesInSuggestion,
      endColumn: lastLineLength + 1,
    },
  };
}

export function getFilteredAndFormattedSuggestions(
  suggestion: languages.InlineCompletion,
  model: editor.ITextModel,
  position: Position
) {
  if (!suggestion) return [];

  const range = suggestion.range as IRange;

  if (
    !(
      range.startLineNumber === position.lineNumber &&
      range.startColumn >= position.column - 3
    )
  )
    return [];

  return [
    new CompletionFormatter(model, position).format(
      suggestion.insertText as string,
      suggestion.range as IRange
    ),
  ];
}
