import { Expression } from './Expression';

export class CurrentFieldExpression implements Expression {
  public fieldName: string;

  constructor(
    public fullFieldName: string,
    public start: number,
    public end: number
  ) {
    this.fieldName = fullFieldName.replaceAll('[', '').replaceAll(']', '');
  }
}
