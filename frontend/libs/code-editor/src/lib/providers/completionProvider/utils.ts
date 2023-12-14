import { Token } from 'antlr4ts/Token';

import { FunctionInfo, ParsedSheets } from '@frontend/common';
import {
  currentTableRef,
  ParsedField,
  ParsedSheet,
  ParsedTable,
} from '@frontend/parser';

import { editor, languages, Position } from '../../monaco';
import { SortText, Suggestion } from '../../types';
import { getFunctionSignature } from '../signatureProvider/functionSignatures';

export function getFields(
  previousCharacter: string,
  table: ParsedTable | null
): Suggestion[] {
  if (!table) return [];

  if (['['].includes(previousCharacter)) {
    return table.fields.map((f) => ({
      label: f.key.fullFieldName,
      insertText: f.key.fullFieldName.replace(/\[|\]/g, ''),
      kind: languages.CompletionItemKind.Field,
      sortText: SortText.field,
    }));
  }

  return [];
}

export function getTables(
  previousCharacter: string,
  parsedSheet: ParsedSheet,
  parsedSheets: ParsedSheets,
  currentTable: ParsedTable | null
): Suggestion[] {
  if (['[', '.'].includes(previousCharacter)) return [];

  const tables = parsedSheet.tables
    .filter((i) => i.tableName !== currentTable?.tableName)
    .map(({ tableName }) => ({
      label: tableName,
      insertText: tableName,
      kind: languages.CompletionItemKind.Variable,
      sortText: SortText.table,
    }));

  for (const sheet of Object.values(parsedSheets)) {
    const filteredTables = sheet.tables.filter(
      (t) => !parsedSheet.tables.some((t2) => t2.tableName === t.tableName)
    );

    for (const table of filteredTables) {
      tables.push({
        label: table.tableName,
        insertText: table.tableName,
        kind: languages.CompletionItemKind.Variable,
        sortText: SortText.table,
      });
    }
  }

  return tables;
}

export function getAllTables(
  previousCharacter: string,
  parsedSheets: ParsedSheets
): Suggestion[] {
  if (['[', '.'].includes(previousCharacter)) return [];

  const tables = [];

  for (const sheet of Object.values(parsedSheets)) {
    for (const table of sheet.tables) {
      tables.push({
        label: table.tableName,
        insertText: table.tableName,
        kind: languages.CompletionItemKind.Variable,
        sortText: SortText.table,
      });
    }
  }

  return tables;
}

export function getFunctions(
  previousCharacter: string,
  functions: FunctionInfo[]
): Suggestion[] {
  if (['['].includes(previousCharacter)) return [];

  return functions.map((func) => ({
    label: func.name,
    insertText: func.name,
    kind: languages.CompletionItemKind.Function,
    sortText: SortText.function,
    documentation: getFunctionSignature(func).documentation,
  }));
}

export function getCurrentInlineExpressionTable(
  tokens: Token[],
  parsedSheets: ParsedSheets
): ParsedTable | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    for (const sheet of Object.values(parsedSheets)) {
      for (const table of sheet.tables) {
        if (table.tableName === token.text) return table;
      }
    }
  }

  return null;
}

export function getCurrentExpressionTable(
  currentTable: ParsedTable | null,
  currentField: ParsedField | null,
  parsedSheet: ParsedSheet,
  parsedSheets: ParsedSheets,
  tokens: Token[],
  caretOffset: number,
  lineNumber: number
): ParsedTable | null {
  if (!currentField || !currentTable) return null;

  const lineTokens = tokens.filter(
    (i) =>
      currentField.expressionMetadata &&
      i.stopIndex <= caretOffset &&
      i.stopIndex >= currentField.expressionMetadata.start &&
      i.line === lineNumber
  );

  if (lineTokens.length === 0) return null;

  for (let i = lineTokens.length - 1; i >= 0; i--) {
    const token = lineTokens[i];

    if (token.text === currentTableRef) {
      return currentTable;
    }

    const table = parsedSheet.tables.find((t) => t.tableName === token.text);

    if (table) return table;

    for (const sheet of Object.values(parsedSheets)) {
      const filteredTables = sheet.tables.filter(
        (t) => !parsedSheet.tables.some((t2) => t2.tableName === t.tableName)
      );

      for (const table of filteredTables) {
        if (table.tableName === token.text) return table;
      }
    }
  }

  return null;
}

export function getCurrentWord(
  model: editor.ITextModel,
  position: Position,
  triggerCharacter: string | undefined
) {
  const currentWord = model.getWordUntilPosition(position);

  if (
    currentWord.word !== '' ||
    (triggerCharacter !== ' ' && triggerCharacter !== undefined)
  ) {
    return currentWord;
  }

  const line = model.getLineContent(position.lineNumber);

  return model.getWordUntilPosition({
    column: line.substring(0, position.column - 1).trimEnd().length + 1,
    lineNumber: position.lineNumber,
  });
}

export function getFieldAtExpression(
  currentTable: ParsedTable | null,
  tokens: Token[],
  wordOffset: number,
  caretOffset: number
): ParsedField | null {
  if (!currentTable) return null;

  let expressionStartIndex = -1;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.stopIndex <= caretOffset && token.text === '=') {
      expressionStartIndex = i;
      break;
    }
  }

  const offset =
    expressionStartIndex !== -1 && tokens.length > expressionStartIndex + 1
      ? tokens[expressionStartIndex + 1].startIndex
      : wordOffset;

  return (
    currentTable.fields.find(
      (f) =>
        f.expressionMetadata &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        f.expressionMetadata.start <= offset! &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        f.expressionMetadata.end >= offset!
    ) || null
  );
}

export function getTableAtPosition(
  sheet: ParsedSheet,
  lineNumber: number
): ParsedTable | null {
  const { tables } = sheet;
  for (let i = 0; i < tables.length; i++) {
    const { dslPlacement } = tables[i];
    if (dslPlacement) {
      const { stopLine, startLine } = dslPlacement;
      if (startLine <= lineNumber && stopLine >= lineNumber) return tables[i];
    }
  }

  return null;
}
