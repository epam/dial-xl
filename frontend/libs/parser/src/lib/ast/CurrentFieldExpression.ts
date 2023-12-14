import { Expression } from './Expression';

export class CurrentFieldExpression implements Expression {
  constructor(public fieldName: string) {}
}
