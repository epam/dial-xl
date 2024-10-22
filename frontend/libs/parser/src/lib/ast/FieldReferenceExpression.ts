import { Expression } from './Expression';

export class FieldReferenceExpression implements Expression {
  constructor(
    public expression: Expression,
    public fieldName: string,
    public start: number,
    public end: number
  ) {}
}
