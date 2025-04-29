import { Expose } from 'class-transformer';

import { ParsedField } from './ParsedField';
import { Span } from './Span';

export class ParsedTotals {
  @Expose()
  public span: Span | undefined;

  @Expose()
  public fields: ParsedField[] | undefined;

  constructor(span: Span | undefined, fields: ParsedField[] | undefined) {
    this.span = span;
    this.fields = fields;
  }
}
