import { Expression } from './Expression';
import { UnaryOperation } from './UnaryOperation';

export class UniOpExpression implements Expression {
  constructor(public exp: Expression, public uni_op: UnaryOperation) {}
}
