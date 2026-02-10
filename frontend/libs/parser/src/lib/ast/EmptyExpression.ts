import { Expression } from './Expression';

export class EmptyExpression implements Expression {
  constructor(
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}
}
