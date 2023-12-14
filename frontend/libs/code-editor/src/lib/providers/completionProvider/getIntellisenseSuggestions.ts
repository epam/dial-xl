import { CharStreams, ConsoleErrorListener } from 'antlr4ts';

import { FunctionInfo, ParsedSheets } from '@frontend/common';
import { ParsedSheet, SheetLexer, SheetReader } from '@frontend/parser';

import { editor, languages, Position } from '../../monaco';
import { Suggestion } from '../../types';
import {
  getAllTables,
  getCurrentExpressionTable,
  getCurrentInlineExpressionTable,
  getCurrentWord,
  getFieldAtExpression,
  getFields,
  getFunctions,
  getTableAtPosition,
  getTables,
} from './utils';

export function getCodeEditorIntellisenseSuggestions(
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets
): Suggestion[] {
  const caretOffset = model.getOffsetAt(position);
  const currentWord = getCurrentWord(model, position, context.triggerCharacter);
  const tokens = getTokens(model);
  let parsedSheet: ParsedSheet | undefined;

  try {
    parsedSheet = SheetReader.parseSheet(model.getValue());
  } catch (error) {
    return [getFunctions('', functions)].flatMap((i) => i);
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

  return currentField
    ? [
        getFunctions(previousCharacter, functions),
        getTables(previousCharacter, parsedSheet, parsedSheets, currentTable),
        getFields(previousCharacter, currentExpressionTable),
      ].flatMap((i) => i)
    : [getFunctions('', functions)].flatMap((i) => i);
}

export function getInlineIntellisenseSuggestions(
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets
): Suggestion[] {
  const currentWord = getCurrentWord(model, position, context.triggerCharacter);
  const tokens = getTokens(model);

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

  return [
    getFunctions(previousCharacter, functions),
    getAllTables(previousCharacter, parsedSheets),
    getFields(previousCharacter, currentExpressionTable),
  ].flatMap((i) => i);
}

function getTokens(model: editor.ITextModel) {
  const sheet = model.getValue();
  const lexer = new SheetLexer(CharStreams.fromString(sheet));
  lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);

  return lexer.getAllTokens();
}

function getPreviousCharacter(
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
