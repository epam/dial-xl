import { Expression } from './Expression';

export class FunctionExpression implements Expression {
  public name: string;
  public arguments: Expression[];

  constructor(name: string, ...args: Expression[]) {
    this.name = name;
    this.arguments = args;
  }
}
