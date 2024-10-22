import { Token } from 'antlr4';

import {
  compareTableNames,
  escapeTableName,
  FunctionInfo,
} from '@frontend/common';
import {
  currentTableRef,
  ParsedField,
  ParsedSheet,
  ParsedSheets,
  ParsedTable,
} from '@frontend/parser';

import { CustomCommands } from '../../codeEditorConfig';
import { editor, languages, Position } from '../../monaco';
import { SortText, Suggestion } from '../../types';
import { getFunctionSignature } from '../signatureProvider/functionSignatures';

export function getFields({
  currentTable,
  currentExpressionTable,
  isInlineEditor = false,

  model,
  position,
  lastToken,
}: {
  model: editor.ITextModel;
  position: Position;
  lastToken: Token | undefined;
  currentTable: ParsedTable | null;
  currentExpressionTable: ParsedTable | null;
  isInlineEditor?: boolean;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (currentTable) {
    getFieldSuggestions({
      suggestions,
      fields: currentTable.fields,
      isInlineEditor,
      model,
      position,
      lastToken,
    });
  }

  if (currentExpressionTable) {
    getFieldSuggestions({
      suggestions,
      fields: currentExpressionTable.fields,
      isInlineEditor,
      model,
      position,
      lastToken,
    });
  }

  return suggestions;
}

export function getTables({
  previousCharacter,
  model,
  position,
  lastToken,
  parsedSheet,
  parsedSheets,
  currentTable,
  currentExpressionTable,
  currentExpressionField,
}: {
  previousCharacter: string;
  model: editor.ITextModel;
  position: Position;
  lastToken: Token | undefined;
  parsedSheet: ParsedSheet;
  parsedSheets: ParsedSheets;
  currentTable: ParsedTable | null;
  currentExpressionTable: ParsedTable | null;
  currentExpressionField: ParsedField | null;
}): Suggestion[] {
  if (['[', '.'].includes(previousCharacter)) return [];

  const tables = parsedSheet.tables
    .filter((i) => i.tableName !== currentTable?.tableName)
    .map(({ tableName }) =>
      getTableSuggestions({
        tableName,
        model,
        position,
        lastToken,
        currentExpressionTable,
        currentExpressionField,
      })
    )
    .flat();

  for (const sheet of Object.values(parsedSheets)) {
    const filteredTables = sheet.tables.filter(
      (t) => !parsedSheet.tables.some((t2) => t2.tableName === t.tableName)
    );

    for (const table of filteredTables) {
      tables.push(
        ...getTableSuggestions({
          tableName: table.tableName,
          model,
          position,
          lastToken,
          currentExpressionTable,
          currentExpressionField,
        })
      );
    }
  }

  return tables;
}

export function getAllTables({
  model,
  position,
  parsedSheets,
  currentExpressionTable,
  currentExpressionField,
  lastToken,
}: {
  model: editor.ITextModel;
  position: Position;
  parsedSheets: ParsedSheets;
  currentExpressionTable: ParsedTable | null;
  currentExpressionField: ParsedField | null;
  lastToken: Token | undefined;
}): Suggestion[] {
  if (['[', '.'].some((char) => lastToken?.text?.endsWith(char))) return [];

  const tables: Suggestion[] = [];

  for (const sheet of Object.values(parsedSheets)) {
    for (const table of sheet.tables) {
      tables.push(
        ...getTableSuggestions({
          tableName: table.tableName,
          model,
          position,
          currentExpressionTable,
          currentExpressionField,
          lastToken,
        })
      );
    }
  }

  return tables;
}

export function getFunctionsSuggestions(
  previousCharacter: string,
  modelId: string,
  functions: FunctionInfo[]
): Suggestion[] {
  if (['['].includes(previousCharacter)) return [];

  const isMethodInvocation = previousCharacter === '.';
  const requiresDot = [']', ')', "'", '"'].includes(previousCharacter);

  return functions.map((f) => {
    const signature = getFunctionSignature(f, isMethodInvocation);
    const argsLength = signature.parameters.length;
    const insertText = `${requiresDot ? '.' : ''}${f.name}()`;

    return {
      insertText,
      label: {
        label: f.name,
        description: f.shortDescription,
      },
      kind: languages.CompletionItemKind.Function,
      sortText: SortText.priority3,
      documentation: signature.documentation,
      detail: signature.label,
      command:
        argsLength > 0
          ? {
              id: CustomCommands.SuggestionInsertFunction,
              title: 'Insert Function',
              arguments: [modelId],
            }
          : undefined,
    };
  });
}

export function getCurrentInlineExpressionTable(
  tokens: Token[],
  parsedSheets: ParsedSheets
): ParsedTable | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    for (const sheet of Object.values(parsedSheets)) {
      for (const table of sheet.tables) {
        const sanitizedTableName = escapeTableName(table.tableName);
        if (sanitizedTableName === token.text) return table;
      }
    }
  }

  return null;
}

export function getCurrentExpressionField(
  tokens: Token[],
  parsedTable: ParsedTable | null
): ParsedField | null {
  if (!parsedTable) {
    return null;
  }
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    for (const field of parsedTable.fields) {
      const sanitizedFieldName = `[${field.key.fieldName}]`;
      if (sanitizedFieldName === token.text) return field;
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
      i.stop <= caretOffset &&
      i.stop >= currentField.expressionMetadata.start &&
      i.line === lineNumber
  );

  if (lineTokens.length === 0) return null;

  for (let i = lineTokens.length - 1; i >= 0; i--) {
    const token = lineTokens[i];
    const { text } = token;

    if (text === undefined) continue;

    if (text === currentTableRef) {
      return currentTable;
    }

    const table = parsedSheet.tables.find((t) =>
      compareTableNames(t.tableName, text)
    );

    if (table) return table;

    for (const sheet of Object.values(parsedSheets)) {
      const filteredTables = sheet.tables.filter(
        (t) =>
          !parsedSheet.tables.some((t2) =>
            compareTableNames(t2.tableName, t.tableName)
          )
      );

      for (const table of filteredTables) {
        if (compareTableNames(table.tableName, text)) return table;
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
    if (token.stop <= caretOffset && token.text === '=') {
      expressionStartIndex = i;
      break;
    }
  }

  const offset =
    expressionStartIndex !== -1 && tokens.length > expressionStartIndex + 1
      ? tokens[expressionStartIndex + 1].start
      : wordOffset;

  return (
    currentTable.fields.find(
      (f) =>
        f.dslPlacement &&
        f.dslPlacement.start <= offset &&
        f.dslPlacement.end >= offset
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

export function getFieldAtPosition(
  sheet: ParsedSheet,
  lineNumber: number,
  offset: number
): ParsedField | null {
  const table = getTableAtPosition(sheet, lineNumber);

  if (!table) return null;

  const { fields } = table;
  for (let i = 0; i < fields.length; i++) {
    const { dslPlacement } = fields[i];
    if (!dslPlacement) continue;

    const { start, end } = dslPlacement;

    if (start - 1 <= offset && end + 1 >= offset) return fields[i];
  }

  return null;
}

export function getPreviousCharacter(
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  currentWord: editor.IWordAtPosition
) {
  return !context.triggerCharacter ||
    (currentWord.word === '' && context.triggerCharacter === ' ')
    ? model
        .getValue()
        .substring(0, model.getOffsetAt(position))
        .trimEnd()
        .slice(-1)
    : context.triggerCharacter;
}

export function getNextCharacter(model: editor.ITextModel, position: Position) {
  const offsetNextCharacter = model.getOffsetAt(position);

  return model.getValue().substring(offsetNextCharacter).charAt(0);
}

export function getPreviousSymbol(
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  tokens: Token[],
  caretOffset: number,
  currentWord: editor.IWordAtPosition
) {
  const letterRegex = /[a-zA-Z]/;

  if (context.triggerCharacter && !letterRegex.test(context.triggerCharacter)) {
    return context.triggerCharacter;
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (
      token.stop <= caretOffset &&
      token.text &&
      !letterRegex.test(token.text)
    ) {
      return token.text;
    }
  }

  return getPreviousCharacter(model, position, context, currentWord);
}

function getTableSuggestions({
  tableName,
  model,
  position,
  currentExpressionTable,
  currentExpressionField,
  lastToken,
}: {
  tableName: string;
  model: editor.ITextModel;
  position: Position;
  currentExpressionTable: ParsedTable | null;
  currentExpressionField: ParsedField | null;
  lastToken: Token | undefined;
}): Suggestion[] {
  const sanitizedName = escapeTableName(tableName);
  let range: Pick<Suggestion, 'range'>['range'] | undefined = undefined;
  const displayAdditionalTables = lastToken?.text === sanitizedName;

  if (
    lastToken &&
    sanitizedName.startsWith("'") &&
    lastToken.text?.startsWith("'")
  ) {
    range = {
      startColumn: lastToken.start + 1,
      endColumn: lastToken.stop + 2,
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
    };
  }

  return [
    !displayAdditionalTables
      ? ({
          label: tableName,
          filterText: sanitizedName,
          insertText: sanitizedName,
          kind: languages.CompletionItemKind.Variable,
          sortText: SortText.priority2,
          detail: 'Table',
          command: {
            id: CustomCommands.SuggestionAcceptTableOrField,
            title: 'Accept table suggestion',
            arguments: [model.id],
          },
          range,
        } as Suggestion)
      : undefined,
    displayAdditionalTables
      ? ({
          label: tableName + '[',
          filterText: sanitizedName + tableName + '[',
          insertText: '[',
          kind: languages.CompletionItemKind.Variable,
          sortText: SortText.special,
          detail: 'Use field',
          command: {
            id: CustomCommands.SuggestionAcceptTableOrField,
            title: 'Accept table suggestion',
            arguments: [model.id],
          },
          range: {
            startColumn: position.column,
            endColumn: position.column,
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
          },
        } as Suggestion)
      : undefined,
    displayAdditionalTables
      ? ({
          label: tableName + '.',
          filterText: sanitizedName + tableName + '.',
          insertText: '.',
          kind: languages.CompletionItemKind.Variable,
          sortText: SortText.special,
          detail: 'Call function',
          command: {
            id: CustomCommands.SuggestionAcceptTableOrField,
            title: 'Accept table suggestion',
            arguments: [model.id],
          },
          range: {
            startColumn: position.column,
            endColumn: position.column,
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
          },
        } as Suggestion)
      : undefined,
  ].filter(Boolean) as Suggestion[];
}

function getFieldSuggestions({
  suggestions,
  fields,
  isInlineEditor,
  model,
  position,
  lastToken,
}: {
  suggestions: Suggestion[];
  fields: ParsedField[];
  isInlineEditor: boolean;

  model: editor.ITextModel;
  position: Position;
  lastToken: Token | undefined;
}): Suggestion[] {
  for (const field of fields) {
    const { fieldName } = field.key;
    let range: Pick<Suggestion, 'range'>['range'] | undefined = undefined;

    if (suggestions.some((s) => s.label === fieldName)) {
      continue;
    }

    const sanitizedName = `[${fieldName}]`;
    let suggestion: Suggestion = {
      insertText: sanitizedName,
      label: fieldName,
      filterText: fieldName,
      kind: languages.CompletionItemKind.Field,
      sortText: SortText.priority1,
      detail: 'Table Field',
      range,
      command: !isInlineEditor
        ? {
            id: CustomCommands.SuggestionAcceptTableOrField,
            title: 'Accept field suggestion',
            arguments: [model.id],
          }
        : undefined,
    };

    if (lastToken && lastToken.text?.startsWith('[')) {
      range = {
        startColumn: lastToken.start + 1,
        endColumn: lastToken.stop + 2,
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
      };

      suggestion = {
        ...suggestion,
        filterText: sanitizedName,
        range,
      };
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}
