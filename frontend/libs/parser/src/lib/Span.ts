import { CommonToken, ParserRuleContext } from 'antlr4';
import { Expose } from 'class-transformer';

export class Span {
  @Expose()
  public from: number;

  @Expose()
  public to: number;

  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }

  public static fromParserRuleContext(ctx: ParserRuleContext): Span {
    const startIndex = ctx.start?.start ?? 0;
    const stopIndex = (ctx.stop?.stop ?? 0) + 1;

    return new Span(startIndex, stopIndex);
  }

  public static fromToken(token: CommonToken): Span {
    const startIndex = token.start;
    const stopIndex = token.stop + 1;

    return new Span(startIndex, stopIndex);
  }
}
