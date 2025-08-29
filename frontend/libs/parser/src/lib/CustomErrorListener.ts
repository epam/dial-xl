import { Recognizer } from 'antlr4';

export type CustomParsingError = {
  line: number;
  column: number;
  start: number;
  stop: number;
  text: string;
};

export class CustomErrorListener {
  private errors: CustomParsingError[] = [];

  public syntaxError(
    recognizer: Recognizer<any>,
    offendingSymbol: any | undefined,
    line: number,
    column: number
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const text = recognizer.text.replace('\n', '').replace('\r', '');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const start = recognizer._interp.startIndex;
    const stop = start + text.length - 1;

    this.errors.push({
      line,
      column,
      start,
      stop,
      text,
    });
  }

  public getErrors() {
    return this.errors;
  }
}
