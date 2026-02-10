import { Expression } from './Expression';
import { UnaryOperation } from './UnaryOperation';

export class UniOpExpression implements Expression {
  constructor(
    public exp: Expression,
    public uni_op: UnaryOperation,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}

  toString(): string {
    return `${this.uni_op} ${this.exp.toString()}`;
  }
}
