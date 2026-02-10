import { CharStreams, Token } from 'antlr4';

import {
  CustomErrorListener,
  CustomParsingError,
} from '../CustomErrorListener';
import { SheetLexer } from '../index';

export function getTokens(content: string): Token[] {
  const lexer = new SheetLexer(CharStreams.fromString(content));
  lexer.removeErrorListeners();
  lexer.addErrorListener(new CustomErrorListener());

  const tokens = lexer.getAllTokens();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const errorListeners = lexer._listeners;
  const customErrorListener = errorListeners.find(
    (i: any) => i instanceof CustomErrorListener
  );

  if (customErrorListener) {
    const errors = (customErrorListener as CustomErrorListener).getErrors();
    if (errors.length) {
      errors.forEach((error) => {
        const token: Token = getToken(error);

        const findTokenIndex = tokens.findIndex((t) => t.start > error.start);

        if (findTokenIndex !== -1) {
          tokens.splice(findTokenIndex, 0, token);
        } else {
          tokens.push(token);
        }
      });
    }
  }

  return tokens;
}

function getToken(error: CustomParsingError): Token {
  const { line, column, start, stop, text } = error;

  const t = new Token();
  t.text = text;
  t.line = line;
  t.column = column;
  t.start = start;
  t.stop = stop;
  t.type = -1;
  t.channel = -1;
  t.tokenIndex = -1;

  return t;
}
