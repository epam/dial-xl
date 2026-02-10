import { Expression } from './Expression';

export class TableReferenceExpression implements Expression {
  constructor(
    public tableName: string,
    public start: number,
    public end: number,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {}
}
