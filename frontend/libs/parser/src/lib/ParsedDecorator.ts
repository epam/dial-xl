import { Expose } from 'class-transformer';

import { ParsedText } from './ParsedText';
import { Span } from './Span';

export class ParsedDecorator {
  @Expose()
  public span: Span;

  @Expose()
  public name: ParsedText | undefined;

  @Expose({ name: 'params' })
  public paramsSpan: (ParsedText | undefined)[];

  public params: any[];

  constructor(
    span: Span,
    name: ParsedText | undefined,
    paramsSpan: (ParsedText | undefined)[],
    public decoratorName: string,
    ...params: any[]
  ) {
    this.span = span;
    this.name = name;
    this.paramsSpan = paramsSpan;
    this.params = [...params];
  }
}
