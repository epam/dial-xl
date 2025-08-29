import { Expression } from './Expression';

export class CurrentFieldExpression implements Expression {
  public fieldName: string;

  constructor(
    public fullFieldName: string,
    public start: number,
    public end: number,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {
    this.fieldName = fullFieldName.replaceAll('[', '').replaceAll(']', '');
  }

  toString(): string {
    return `[${this.fieldName}]`;
  }
}
