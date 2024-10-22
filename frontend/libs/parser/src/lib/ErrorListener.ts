import { ErrorListener as ANTLRErrorListener, Recognizer } from 'antlr4';

export class ErrorListener implements ANTLRErrorListener<any> {
  private errors: string[] = [];

  public syntaxError(
    recognizer: Recognizer<any>,
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
