import { Expose } from 'class-transformer';

import { ParsedField } from './ParsedField';
import { ParsedText } from './ParsedText';
import { Span } from './Span';

export class ParsedFields {
  @Expose()
  public span: Span | undefined;

  @Expose()
  public fields: ParsedField[];

  @Expose()
  public formula: ParsedText | undefined;

  constructor(
    span: Span | undefined,
    fields: ParsedField[],
    formula: ParsedText | undefined
  ) {
    this.span = span;
    this.fields = fields;
    this.formula = formula;
  }
}
