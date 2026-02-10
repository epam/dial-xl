import { Expression } from './Expression';

export class ConstNumberExpression implements Expression {
  constructor(
    public text: string,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}

  toString(): string {
    return this.text;
  }
}
