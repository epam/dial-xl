import { Expose } from 'class-transformer';

import { Span } from '../Span';

export class Missing {
  @Expose()
  public span: Span;

  constructor(span: Span) {
    this.span = span;
  }
}
