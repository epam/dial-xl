import { Expression } from './Expression';

export class QueryRowExpression implements Expression {
  constructor(
    public expression: Expression,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}
}
