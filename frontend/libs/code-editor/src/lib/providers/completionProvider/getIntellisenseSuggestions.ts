import { Token } from 'antlr4';

import {
  CommonMetadata,
  compareTableNames,
  FunctionInfo,
} from '@frontend/common';
import {
  getTokens,
  ParsedSheet,
  ParsedSheets,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';

import { editor, languages, Position } from '../../monaco';
import { SortText, Suggestion } from '../../types';
import {
  getAllTables,
  getCurrentExpressionField,
  getCurrentExpressionTable,
  getCurrentInlineExpressionTable,
  getCurrentWord,
  getFieldAtExpression,
  getFields,
  getFunctionsSuggestions,
  getInputSuggestions,
  getPreviousCharacter,
  getTableAtPosition,
  getTables,
} from './utils';

const sortSuggestions = ({
  tables,
  fields,
  functions,
  inputs,
  currentTableExpressionName,
  currentFieldExpressionName,
  cellTableName,
  currentToken,
}: {
  tables: Suggestion[];
  fields: Suggestion[];
  functions: Suggestion[];
  inputs: Suggestion[];
  currentTableExpressionName?: string;
  currentFieldExpressionName?: string;
  cellTableName?: string;
  currentToken?: Token | undefined;
}): Suggestion[] => {
  let isProbableDisplaying = false;
  const mostUsedFunctionNames = [
    'FILTER',
    'SORT',
    'SORTBY',
    'UNIQUE',
    'UNIQUEBY',
  ];
  let tableSuggestionsPriority = SortText.priority1;
  let fieldSuggestionsPriority = SortText.priority2;
  let functionsSuggestionsPriority = SortText.priority3;

  if (currentTableExpressionName) {
    if (
      currentToken?.text === '.' ||
      (currentToken && currentFieldExpressionName)
    ) {
      functionsSuggestionsPriority = SortText.priority1;
      tableSuggestionsPriority = SortText.priority2;
      fieldSuggestionsPriority = SortText.priority3;
    }
  } else {
    isProbableDisplaying = true;

    if (cellTableName) {
      isProbableDisplaying = true;
      fieldSuggestionsPriority = SortText.priority1;
      functionsSuggestionsPriority = SortText.priority2;
      tableSuggestionsPriority = SortText.priority3;
    }
  }

  return [
    isProbableDisplaying
      ? [
          fields.slice(0, 4).map((val) => ({
            ...val,
            sortText: SortText.priority1Probable,
          })),
          tables.slice(0, 4).map((val) => ({
            ...val,
            sortText: SortText.priority2Probable,
          })),
          functions
            .filter((func) =>
              mostUsedFunctionNames.includes(func.label.toString())
            )
            .map((val) => ({
              ...val,
              sortText: SortText.priority3Probable,
            })),
        ].flat()
      : [],

    tables.slice(isProbableDisplaying ? 4 : 0).map((val) => ({
      ...val,
      sortText:
        val.sortText !== SortText.special
          ? tableSuggestionsPriority
          : SortText.special,
    })),
    inputs.map((val) => ({
      ...val,
      sortText: SortText.priority3,
    })),
    functions
      .filter(
        (func) =>
          !isProbableDisplaying ||
          !mostUsedFunctionNames.includes(func.label.toString())
      )
      .map((val) => ({
        ...val,
        sortText:
          val.sortText !== SortText.special
            ? functionsSuggestionsPriority
            : SortText.special,
      })),
    fields.slice(isProbableDisplaying ? 4 : 0).map((val) => ({
      ...val,
      sortText:
        val.sortText !== SortText.special
          ? fieldSuggestionsPriority
          : SortText.special,
    })),
  ].flatMap((i) => i);
};

export function getCodeEditorIntellisenseSuggestions({
  model,
  position,
  context,
  functions,
  inputFiles,
  parsedSheets,
}: {
  model: editor.ITextModel;
  position: Position;
  context: languages.CompletionContext;
  functions: FunctionInfo[];
  inputFiles: CommonMetadata[];
  parsedSheets: ParsedSheets;
}): Suggestion[] {
  const caretOffset = model.getOffsetAt(position);
  const currentWord = getCurrentWord(model, position, context.triggerCharacter);
  const tokens = getTokens(model.getValue());
  let parsedSheet: ParsedSheet | undefined;
  const lineTokens = getTokens(model.getLineContent(position.lineNumber));
  const currentToken = lineTokens.find(
    (token) =>
      token.start + 1 < position.column && token.stop + 1 >= position.column - 1
  );

  try {
    parsedSheet = SheetReader.parseSheet(model.getValue());
  } catch (error) {
    return [
      getFunctionsSuggestions('', model.id, functions),
      getInputSuggestions(inputFiles),
    ].flatMap((i) => i);
  }

  const previousCharacter = getPreviousCharacter(
    model,
    position,
    context,
    currentWord
  );

  const wordOffset =
    currentWord &&
    model.getOffsetAt(
      new Position(position.lineNumber, currentWord.endColumn)
    ) - 1;

  const currentTable = getTableAtPosition(parsedSheet, position.lineNumber);

  const currentField = getFieldAtExpression(
    currentTable,
    tokens,
    wordOffset,
    caretOffset
  );

  const currentExpressionTable = getCurrentExpressionTable(
    currentTable,
    currentField,
    parsedSheet,
    parsedSheets,
    tokens,
    caretOffset,
    position.lineNumber
  );
  const currentExpressionField = getCurrentExpressionField(
    tokens,
    currentExpressionTable
  );

  const resultTables = currentField
    ? getTables({
        previousCharacter,
        model,
        position,
        lastToken: currentToken,
        parsedSheet,
        parsedSheets,
        currentTable,
      })
    : [];
  const resultFields = currentField
    ? getFields({
        model,
        position,
        lastToken: currentToken,
        currentTable,
        currentExpressionTable,
      })
    : [];
  const resultFunctions = currentField
    ? getFunctionsSuggestions(previousCharacter, model.id, functions)
    : getFunctionsSuggestions('', model.id, functions);

  const inputs = getInputSuggestions(inputFiles);

  return sortSuggestions({
    tables: resultTables,
    functions: resultFunctions,
    fields: resultFields,
    inputs,
    currentTableExpressionName: currentExpressionTable?.tableName,
    currentFieldExpressionName: currentExpressionField?.key.fieldName,
    currentToken,
  });
}

export function getInlineIntellisenseSuggestions({
  model,
  position,
  context,
  functions,
  inputFiles,
  parsedSheets,
  currentTableName,
}: {
  model: editor.ITextModel;
  position: Position;
  context: languages.CompletionContext;
  functions: FunctionInfo[];
  inputFiles: CommonMetadata[];
  parsedSheets: ParsedSheets;
  currentTableName?: string;
  currentFieldName?: string;
}): Suggestion[] {
  const currentWord = getCurrentWord(model, position, context.triggerCharacter);
  const tokens = getTokens(model.getLineContent(position.lineNumber));
  const currentToken = tokens.find(
    (token) =>
      token.start + 1 < position.column && token.stop + 1 >= position.column - 1
  );
  const previousCharacter = getPreviousCharacter(
    model,
    position,
    context,
    currentWord
  );

  const currentExpressionTable = getCurrentInlineExpressionTable(
    tokens,
    parsedSheets
  );
  const currentExpressionField = getCurrentExpressionField(
    tokens,
    currentExpressionTable
  );

  let currentTable: ParsedTable | null = null;

  if (currentTableName) {
    for (const sheet of Object.values(parsedSheets)) {
      const table = sheet.tables.find((t) =>
        compareTableNames(t.tableName, currentTableName)
      );

      if (table) {
        currentTable = table;
        break;
      }
    }
  }

  const resultFunctions = getFunctionsSuggestions(
    previousCharacter,
    model.id,
    functions
  );
  const resultTables = getAllTables({
    model,
    position,
    parsedSheets,
    lastToken: currentToken,
  });
  const resultFields = getFields({
    currentTable,
    currentExpressionTable,
    isInlineEditor: true,
    model,
    position,
    lastToken: currentToken,
  });

  const value = model.getValue();
  if (!value.includes(':') && !value.includes('=')) {
    return [];
  }

  const inputs = getInputSuggestions(inputFiles);

  return sortSuggestions({
    tables: resultTables,
    functions: resultFunctions,
    inputs,
    fields: resultFields,
    currentTableExpressionName: currentExpressionTable?.tableName,
    currentFieldExpressionName: currentExpressionField?.key.fieldName,
    cellTableName: currentTableName,
    currentToken,
  });
}
