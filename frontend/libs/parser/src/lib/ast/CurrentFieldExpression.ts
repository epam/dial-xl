import { SheetReader } from '../SheetReader';
import { Expression } from './Expression';

export class CurrentFieldExpression implements Expression {
  public fieldName: string;

  constructor(
    public fullFieldName: string,
    public start: number,
    public end: number,
    public globalOffsetStart: number,
    public globalOffsetEnd: number,
  ) {
    this.fieldName = SheetReader.stripQuotes(fullFieldName);
  }

  toString(): string {
    return `[${this.fieldName}]`;
  }
}
