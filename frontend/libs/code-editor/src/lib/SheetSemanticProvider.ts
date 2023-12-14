import {
  CharStreams,
  CommonToken,
  ConsoleErrorListener,
  Lexer,
} from 'antlr4ts';

import { SheetLexer } from '@frontend/parser';

import { tokensMap, tokenTypes } from './codeEditorTheme';
import { editor, languages } from './monaco';

const NotStyledToken = 2 ** 32 - 1;
const EOF = -1;

export class SheetSemanticProvider
  implements languages.DocumentSemanticTokensProvider
{
  private previousTokenLine = 0;
  private previousTokenColumn = 0;
  private tokens: number[] = [];

  getLegend() {
    return {
      tokenModifiers: [],
      tokenTypes,
    };
  }

  provideDocumentSemanticTokens(model: editor.ITextModel) {
    const sheet = model.getValue();
    const lexer = new SheetLexer(CharStreams.fromString(sheet));
    lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);

    this.tokens = [];
    this.previousTokenLine = 0;
    this.previousTokenColumn = 0;

    let done = false;

    while (!done) {
      const token = lexer.nextToken() as CommonToken;

      if (token == null || token.type === EOF) {
        done = true;
      } else {
        const { line, charPositionInLine, type, text, startIndex, stopIndex } =
          token;
        if (!text) continue;

        const typeName = this.getTokenNameByTypeId(lexer, type);

        if (!typeName) continue;

        const currentLine = line - 1;

        this.addToken(
          currentLine - this.previousTokenLine,
          this.previousTokenLine === currentLine
            ? charPositionInLine - this.previousTokenColumn
            : charPositionInLine,
          stopIndex - startIndex + 1,
          typeName
        );

        this.previousTokenLine = currentLine;
        this.previousTokenColumn = charPositionInLine;
      }
    }

    const data = new Uint32Array(this.tokens);
    this.tokens = [];

    return {
      data,
    };
  }

  releaseDocumentSemanticTokens() {
    return undefined;
  }

  private addToken(
    lineDiff: number,
    columnDiff: number,
    tokenLength: number,
    tokenType: string,
    modifiers = 0
  ) {
    this.tokens.push(
      lineDiff,
      columnDiff,
      tokenLength,
      tokensMap.get(tokenType) ?? NotStyledToken,
      modifiers
    );
  }

  private getTokenNameByTypeId(lexer: Lexer, typeId: number) {
    return (
      lexer.vocabulary.getSymbolicName(typeId) ??
      lexer.vocabulary.getDisplayName(typeId) ??
      ''
    );
  }
}
