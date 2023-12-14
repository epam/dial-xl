import { Monaco } from '@monaco-editor/react';

import { editor, IDisposable, languages, Position } from '../../monaco';
import signatureItem = languages.SignatureHelpResult;
import { CharStreams } from 'antlr4ts';

import { FunctionInfo } from '@frontend/common';
import { SheetLexer } from '@frontend/parser';

import { Language } from '../../codeEditorConfig';
import { getFunctionSignature, missingSignature } from './functionSignatures';

export function registerFunctionSignatureProvider(
  monaco: Monaco,
  codeEditor: editor.IStandaloneCodeEditor,
  functions: FunctionInfo[],
  language: Language
): IDisposable {
  return languages.registerSignatureHelpProvider(language, {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: (
      model: editor.ITextModel,
      position: Position
    ): signatureItem => {
      const currentLine = model.getLineContent(position.lineNumber);
      const formulaInLine = currentLine.indexOf('=', 0);
      const currentFormula = currentLine.substring(
        formulaInLine + 1,
        position.column - 1
      );
      const lexer = new SheetLexer(CharStreams.fromString(currentFormula));
      const tokens = lexer.getAllTokens();

      // Covers a very base case with flat function expression, like 'function_name(1, 2, 3)'
      // For more complex cases, like nested functions, we need to implement a proper parser for formula
      let commasCount = 0;
      let functionName = '';
      for (let i = tokens.length - 1; i >= 0; i--) {
        const { text } = tokens[i];

        if (!text) continue;
        if (text === ')') break;
        if (text === ',') commasCount++;

        const isFunctionName = functions.find(
          (f) => f.name.toLowerCase() === text.toLowerCase()
        );
        const isFunctionNameWithParenthesis =
          i !== tokens.length - 1 && tokens[i + 1].text === '(';
        if (isFunctionName && isFunctionNameWithParenthesis) {
          functionName = text;
          break;
        }
      }

      if (!functionName) return emptySignature;

      const findFunction = functions.find(
        (f) => f.name.toLowerCase() === functionName.toLowerCase()
      );

      const signature = findFunction
        ? getFunctionSignature(findFunction)
        : missingSignature;

      return {
        value: {
          activeParameter: commasCount,
          activeSignature: 0,
          signatures: [signature],
        },
        dispose: () => {},
      };
    },
  });
}

const emptySignature = {
  value: {
    activeParameter: 0,
    activeSignature: 0,
    signatures: [],
  },
  dispose: () => {},
};
