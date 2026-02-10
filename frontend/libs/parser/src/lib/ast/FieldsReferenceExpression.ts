import { Fields_referenceContext } from '../grammar/SheetParser';
import { Expression } from './Expression';

export class FieldsReferenceExpression implements Expression {
  public fields: string[] = [];
  public relativeStart: number | undefined;
  public relativeEnd: number | undefined;

  constructor(
    public expression: Expression,
    public ctx: Fields_referenceContext,
    public start: number,
    public end: number,
    public globalOffsetStart: number,
    public globalOffsetEnd: number
  ) {
    this.fields = [];

    ctx.field_name_list().forEach((field) => {
      this.fields.push(field.getText());
    });

    const expressionStart = (expression as any).start;

    if (expressionStart && ctx.stop) {
      this.relativeStart = ctx.start.start - expressionStart;
      this.relativeEnd = ctx.stop.stop - expressionStart;
    }
  }
}
