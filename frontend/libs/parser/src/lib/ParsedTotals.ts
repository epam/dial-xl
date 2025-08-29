import { Expose } from 'class-transformer';

import { ParsedFields } from './ParsedFields';
import { Span } from './Span';

export class ParsedTotals {
  @Expose()
  public span: Span | undefined;

  @Expose()
  public fields: ParsedFields[] | undefined;

  constructor(span: Span | undefined, fields: ParsedFields[] | undefined) {
    this.span = span;
    this.fields = fields;
  }
}
