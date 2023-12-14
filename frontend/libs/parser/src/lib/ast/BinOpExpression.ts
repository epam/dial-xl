import { Expression } from './Expression';

export class BinOpExpression implements Expression {
  constructor(
    public left: Expression,
    public right: Expression,
    public operator: string
  ) {}
}
