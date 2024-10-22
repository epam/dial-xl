import { Expression } from './Expression';

export class FunctionExpression implements Expression {
  public name: string;
  public arguments: Expression[];
  public start: number;
  public end: number;

  constructor(name: string, start: number, end: number, ...args: Expression[]) {
    this.name = name;
    this.arguments = args;
    this.start = start;
    this.end = end;
  }
}
