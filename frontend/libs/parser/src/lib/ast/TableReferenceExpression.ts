import { Expression } from './Expression';

export class TableReferenceExpression implements Expression {
  constructor(public tableName: string) {}
}
