import { ParserRuleContext, TerminalNode } from 'antlr4';
import { Expose } from 'class-transformer';

import {
  Doc_commentContext,
  ExpressionContext,
  Field_nameContext,
} from './grammar/SheetParser';
import { Table_nameContext } from './index';
import { Span } from './Span';

export class ParsedText {
  @Expose()
  public span: Span;

  public text: string;

  constructor(span: Span, text: string) {
    this.span = span;
    this.text = text;
  }
  public static from(ctx: ParserRuleContext | null): ParsedText | undefined {
    if (!ctx) {
      return;
    }

    return new ParsedText(Span.fromParserRuleContext(ctx), ctx.getText());
  }

  public static fromTerminalNode(
    terminalNode: TerminalNode | null
  ): ParsedText | undefined {
    if (!terminalNode) {
      return;
    }

    return new ParsedText(
      Span.fromToken(terminalNode.symbol),
      terminalNode.getText()
    );
  }

  public static fromTableName(ctx: Table_nameContext): ParsedText {
    return new ParsedText(Span.fromParserRuleContext(ctx), ctx.getText());
  }

  public static fromFieldName(ctx: Field_nameContext): ParsedText {
    return new ParsedText(Span.fromParserRuleContext(ctx), ctx.getText());
  }

  public static fromExpression(
    expression: ExpressionContext | null
  ): ParsedText | undefined {
    if (!expression) {
      return;
    }

    return new ParsedText(
      Span.fromParserRuleContext(expression),
      expression.getText()
    );
  }

  public static fromDocs(ctx: Doc_commentContext[]): ParsedText[] {
    return ctx.map(
      (doc) => new ParsedText(Span.fromParserRuleContext(doc), doc.getText())
    );
  }
}
