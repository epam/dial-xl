import { ANTLRErrorListener } from 'antlr4ts/ANTLRErrorListener';
import { Recognizer } from 'antlr4ts/Recognizer';

export class ErrorListener implements ANTLRErrorListener<any> {
  private errors: string[] = [];

  public syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any | undefined,
    line: number,
    charPositionInLine: number,
    msg: string
  ) {
    this.errors.push(`line ${line}:${charPositionInLine} ${msg}`);
  }

  public getErrors() {
    return this.errors;
  }
}
