import { Expression } from './Expression';

export class FunctionExpression implements Expression {
  public name: string;
  public arguments: Expression[];
  public start: number;
  public end: number;

  constructor(
    name: string,
    start: number,
    end: number,
    public globalOffsetStart: number,
    public globalOffsetEnd: number,
    ...args: Expression[]
  ) {
    this.name = name;
    this.arguments = args;
    this.start = start;
    this.end = end;
  }

  toString(): string {
    const argsStr = this.arguments.map((arg) => arg.toString()).join(', ');

    return `${this.name}(${argsStr})`;
  }
}
