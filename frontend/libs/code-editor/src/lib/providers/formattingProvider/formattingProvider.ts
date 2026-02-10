import { newLine, ParsedSheet, SheetReader } from '@frontend/parser';
import { Monaco } from '@monaco-editor/react';

import { Language } from '../../codeEditorConfig';
import { editor, IDisposable, languages } from '../../monaco';

export type FormattingRule = (
  parsedSheet: ParsedSheet,
  model: editor.ITextModel
) => languages.TextEdit[];

const formattingRules: FormattingRule[] = [shrinkEmptyLinesRule];

export function registerFormattingProvider(
  monaco: Monaco,
  language: Language
): IDisposable {
  return monaco.languages.registerDocumentFormattingEditProvider(language, {
    provideDocumentFormattingEdits: (model: editor.ITextModel, _, __) => {
      const sheetContent = model.getValue();

      try {
        const parsedSheet = SheetReader.parseSheet(sheetContent);

        return formattingRules.flatMap((rule) => rule(parsedSheet, model));
      } catch (error) {
        return;
      }
    },
  });
}

function shrinkEmptyLinesRule(
  parsedSheet: ParsedSheet,
  model: editor.ITextModel
): languages.TextEdit[] {
  const textEdits: languages.TextEdit[] = [];

  const { tables, pythonBlocks } = parsedSheet;

  const tableStartLines = tables
    .filter((t) => t.dslPlacement?.startLine)
    .map((table) => table.dslPlacement?.startLine);

  const lineCount = model.getLineCount();

  for (let i = 1; i <= lineCount; i++) {
    const lineContent = model.getLineContent(i);

    if (lineContent.trim() !== '') continue;

    const isPythonBlock = pythonBlocks?.find(
      (b) => b.dslPlacement.startLine <= i && b.dslPlacement.stopLine >= i
    );

    if (isPythonBlock) continue;

    const isTableStartLine = tableStartLines.includes(i + 1);

    textEdits.push({
      range: {
        startLineNumber: i,
        endLineNumber: i + 1,
        startColumn: 1,
        endColumn: 1,
      },
      text: isTableStartLine ? newLine : '',
    });
  }

  return textEdits;
}
