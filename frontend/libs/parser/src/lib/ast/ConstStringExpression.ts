import { Expression } from './Expression';

export class ConstStringExpression implements Expression {
  constructor(public text: string) {}
}
