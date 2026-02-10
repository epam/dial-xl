import { Expression } from './Expression';

export class BinOpExpression implements Expression {
  constructor(
    public left: Expression,
    public right: Expression,
    public operator: string,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}

  toString(): string {
    return `${this.left.toString()} ${this.operator} ${this.right.toString()}`;
  }
}
