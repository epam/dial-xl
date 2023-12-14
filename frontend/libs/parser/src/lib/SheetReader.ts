import * as antlr from 'antlr4ts';

import {
  BinOpExpression,
  ConstNumberExpression,
  ConstStringExpression,
  CurrentFieldExpression,
  Expression,
  FieldReferenceExpression,
  FunctionExpression,
  parseUnaryOperation,
  QueryRowExpression,
  TableReferenceExpression,
  UniOpExpression,
} from './ast';
import { EmptyExpression } from './ast/EmptyExpression';
import { ErrorListener } from './ErrorListener';
import { FieldKey } from './FieldKey';
import { SheetLexer } from './grammar/SheetLexer';
import { SheetListener } from './grammar/SheetListener';
import {
  Decorator_definitionContext,
  ExpressionContext,
  FormulaContext,
  Override_definitionContext,
  SheetContext,
  SheetParser,
} from './grammar/SheetParser';
import { ParsedDecorator } from './ParsedDecorator';
import { ExpressionMetadata, ParsedField } from './ParsedField';
import { ParsedFormula } from './ParsedFormula';
import { ParsedOverride } from './ParsedOverride';
import { ParsedSheet } from './ParsedSheet';
import { ParsedTable } from './ParsedTable';

export class SheetReader implements SheetListener {
  public lexer: SheetLexer;
  public parser: SheetParser;
  private errorListener: ErrorListener = new ErrorListener();

  public expression!: Expression;
  public sheet!: ParsedSheet;

  private static sourceText = '';

  private constructor(lexer: SheetLexer, parser: SheetParser) {
    this.lexer = lexer;
    this.parser = parser;

    this.lexer.removeErrorListeners();
    this.parser.removeErrorListeners();

    this.lexer.addErrorListener(this.errorListener);
    this.parser.addErrorListener(this.errorListener);

    this.parser.addParseListener(this as SheetListener);
  }

  public exitFormula(ctx: FormulaContext) {
    try {
      this.expression = this.buildExpression(ctx.expression());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  public exitSheet(ctx: SheetContext) {
    this.sheet = this.buildSheet(ctx);
  }

  public static parseDecorators(decoratorsCtxs: Decorator_definitionContext[]) {
    const decorators: ParsedDecorator[] = [];

    for (const ctx of decoratorsCtxs) {
      const decoratorDslPlacement = {
        start: ctx.start.startIndex,
        end: ctx.start.startIndex + ctx.text.length,
      };

      decorators.push(
        new ParsedDecorator(
          ctx.decorator_name().text,
          decoratorDslPlacement,
          ctx.primitive().map((p) => {
            const numberP = p.number();
            if (numberP != null) {
              return +numberP.text;
            }

            return SheetReader.stripQuotes(p.string()?.text ?? "''");
          })
        )
      );
    }

    return decorators;
  }

  private buildSheet(ctx: SheetContext) {
    const tables: ParsedTable[] = [];

    for (const tableCtx of ctx.table_definition()) {
      const fields: ParsedField[] = [];
      const tableName: string = SheetReader.getSanitizedTableName(
        tableCtx.table_name().text
      );

      for (const fieldCtx of tableCtx.field_definition()) {
        const fieldName: string = fieldCtx.field_name().text;
        let fieldExpression: ExpressionContext | undefined;
        let expressionMetadata: ExpressionMetadata | undefined;

        try {
          fieldExpression = fieldCtx.expression();

          const startIndex = fieldExpression.start.startIndex;
          const end =
            fieldExpression.stop?.stopIndex ||
            startIndex + fieldExpression.text.length;

          const expressionText = SheetReader.sourceText.substring(
            startIndex,
            end + 1
          );

          expressionMetadata = {
            text: expressionText || fieldExpression.text,
            start: Math.min(startIndex, end),
            end: Math.max(startIndex, end),
          };
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }

        const fieldNameRange = {
          start: fieldCtx.field_name().start.startIndex,
          end: fieldCtx.field_name().start.startIndex + fieldName.length,
        };

        const dslPlacement = {
          start: fieldCtx.start.startIndex,
          end:
            fieldCtx.stop?.stopIndex ||
            fieldCtx.start.startIndex + fieldCtx.text.length,
        };

        const dimensionKeyword = fieldCtx.DIMENSION_KEYWORD();

        const dslDimensionPlacement = dimensionKeyword && {
          start: dimensionKeyword.symbol.startIndex,
          end: dimensionKeyword.symbol.stopIndex,
        };

        const keyKeyword = fieldCtx.KEY_KEYWORD();

        const dslKeyPlacement = keyKeyword && {
          start: keyKeyword.symbol.startIndex,
          end: keyKeyword.symbol.stopIndex,
        };

        try {
          const field = new ParsedField(
            fieldCtx.KEY_KEYWORD() != null,
            fieldCtx.DIMENSION_KEYWORD() != null,
            false,
            new FieldKey(
              tableName,
              fieldName,
              SheetReader.stripQuotes(fieldName)
            ),
            fieldExpression && this.buildExpression(fieldExpression),
            expressionMetadata,
            dslPlacement,
            fieldNameRange,
            dslDimensionPlacement,
            dslKeyPlacement,
            SheetReader.parseDecorators(fieldCtx.decorator_definition())
          );

          fields.push(field);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      const tableRange = tableCtx.stop && {
        startOffset: tableCtx.start.startIndex,
        stopOffset: tableCtx.stop.stopIndex,
        startLine: tableCtx.start.line,
        stopLine: tableCtx.stop.line,
        startColumn: tableCtx.start.charPositionInLine,
      };

      const tableNameRange = {
        start: tableCtx.table_name().start.startIndex,
        end:
          tableCtx.table_name().start.startIndex +
          tableCtx.table_name().text.length,
      };

      const overrideDefinition = tableCtx.override_definition();
      const overrides = this.parseOverrides(overrideDefinition);
      const dslOverridePlacement = overrideDefinition && {
        start: overrideDefinition.start.startIndex,
        end:
          overrideDefinition.stop?.stopIndex ||
          overrideDefinition.start.startIndex + overrideDefinition.text.length,
      };

      tables.push(
        new ParsedTable(
          tableName,
          fields,
          tableRange,
          tableNameRange,
          SheetReader.parseDecorators(tableCtx.decorator_definition()),
          overrides,
          dslOverridePlacement,
          SheetReader.isTableNameQuoted(tableCtx.table_name().text)
        )
      );
    }

    return new ParsedSheet(tables, this.errorListener.getErrors());
  }

  private parseOverrides(
    ctx?: Override_definitionContext
  ): ParsedOverride | undefined {
    if (!ctx) return;

    const overrideContent = ctx.OVERRIDE_CONTENT().text;

    if (!overrideContent.startsWith('override')) return;

    const textCsv = overrideContent.substring(8);

    if (!textCsv) return;

    return new ParsedOverride(textCsv);
  }

  private buildExpression(ctx: ExpressionContext): Expression {
    const functionName = ctx.function_name();

    if (functionName) {
      const args: Expression[] = ctx
        .expression()
        .map((p) => this.buildExpression(p));

      return new FunctionExpression(functionName.text, args);
    }

    const numberValue = ctx.number();

    if (numberValue) {
      return new ConstNumberExpression(+numberValue.text);
    }

    const stringValue = ctx.string();

    if (stringValue) {
      return new ConstStringExpression(
        SheetReader.stripQuotes(stringValue.text)
      );
    }

    const fieldName = ctx.field_name();

    if (fieldName) {
      if (ctx.expression().length > 0) {
        return new FieldReferenceExpression(
          ctx.expression()[0],
          fieldName.text
        );
      } else {
        return new CurrentFieldExpression(fieldName.text);
      }
    }

    const tableName = ctx.table_name();

    if (tableName) {
      return new TableReferenceExpression(tableName.text);
    }

    const binOp = SheetReader.binOp(ctx);
    if (binOp) {
      return new BinOpExpression(
        this.buildExpression(ctx.expression()[0]),
        this.buildExpression(ctx.expression()[1]),
        binOp.text
      );
    }

    const uniOp = ctx.uni_op();

    if (uniOp) {
      return new UniOpExpression(
        this.buildExpression(ctx.expression()[0]),
        parseUnaryOperation(uniOp.text)
      );
    }

    if (ctx.expression().length === 1) {
      return this.buildExpression(ctx.expression()[0]);
    }

    const queryRow = ctx.query_row();

    if (queryRow) {
      return new QueryRowExpression();
    }

    if (ctx.na_expression()) {
      return new FunctionExpression('NA');
    }

    if (!ctx.text || ctx.text.trim() === '') {
      return new EmptyExpression();
    }

    throw new Error('[buildExpression] Cannot build expression]');
  }

  private static binOp(ctx: ExpressionContext) {
    return (
      ctx.bin_or() ??
      ctx.bin_and() ??
      ctx.bin_compare() ??
      ctx.bin_add_sub() ??
      ctx.bin_mul_div_mod() ??
      ctx.bin_pow() ??
      null
    );
  }

  public static prepareParser(text: string) {
    const lexer = new SheetLexer(antlr.CharStreams.fromString(text));
    const parser = new SheetParser(new antlr.CommonTokenStream(lexer));
    const listener = new SheetReader(lexer, parser);

    parser.addParseListener(listener as SheetListener);

    lexer.removeErrorListeners();
    parser.removeErrorListeners();

    lexer.addErrorListener(listener.errorListener);
    parser.addErrorListener(listener.errorListener);

    SheetReader.sourceText = text;

    return listener;
  }

  public static parseFormula(text: string) {
    const reader = SheetReader.prepareParser(text);

    reader.parser.formula();

    return new ParsedFormula(
      reader.expression,
      reader.errorListener.getErrors()
    );
  }

  public static parseSheet(text?: string) {
    if (!text || !text?.trim().length) {
      return new ParsedSheet([], []);
    }

    const reader = SheetReader.prepareParser(text || '');

    reader.parser.sheet();

    return reader.sheet;
  }

  public static stripQuotes(str: string) {
    return str.substring(1, str.length - 1);
  }

  public static isTableNameQuoted(tableName: string) {
    return /^'([^']*)'$/.test(tableName);
  }

  public static getSanitizedTableName(tableName: string) {
    return /^'([^']*)'$/.test(tableName)
      ? `${SheetReader.stripQuotes(tableName)}`
      : tableName;
  }
}
