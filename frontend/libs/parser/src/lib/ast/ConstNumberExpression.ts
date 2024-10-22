import { Expression } from './Expression';

export class ConstNumberExpression implements Expression {
  constructor(public text: string) {}
}
