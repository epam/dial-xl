import * as antlr from 'antlr4';
import { CommonToken, PredictionMode, TerminalNode, Token } from 'antlr4';

import {
  BinOpExpression,
  ConstBoolExpression,
  ConstNumberExpression,
  ConstStringExpression,
  CurrentFieldExpression,
  Expression,
  FieldReferenceExpression,
  FunctionExpression,
  parseUnaryOperation,
  QueryRowExpression,
  RowReferenceExpression,
  TableReferenceExpression,
  UniOpExpression,
} from './ast';
import { EmptyExpression } from './ast/EmptyExpression';
import { ErrorListener } from './ErrorListener';
import { FieldKey } from './FieldKey';
import {
  Decorator_definitionContext,
  ExpressionContext,
  FormulaContext,
  Override_definitionContext,
  Override_fieldContext,
  Override_rowContext,
  SheetContext,
  SheetLexer,
  SheetListener,
  SheetParser,
  Table_definitionContext,
} from './index';
import { ParsedApply } from './ParsedApply';
import { ParsedDecorator } from './ParsedDecorator';
import { ParsedField } from './ParsedField';
import { ParsedFilter } from './ParsedFilter';
import { ParsedFormula } from './ParsedFormula';
import { ParsedOverride } from './ParsedOverride';
import { ParsedSheet } from './ParsedSheet';
import { ParsedSort } from './ParsedSort';
import { ParsedTable } from './ParsedTable';
import { ParsedText } from './ParsedText';
import { ParsedTotal } from './ParsedTotal';
import { ParsedTotals } from './ParsedTotals';
import {
  DSLNote,
  ExpressionMetadata,
  FullDSLPlacement,
  naExpression,
  newLine,
  TableTotals,
  TotalItem,
} from './parser';
import { PythonBlock } from './PythonBlock';
import {
  getFieldNameDslPlacement,
  getFullDSLPlacement,
  getMultiContextFullDSLPlacement,
  getShortDSLPlacement,
  getTotalType,
} from './services';
import { Span } from './Span';

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

    // Other modes throws an error
    parser._interp.predictionMode = PredictionMode.SLL;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.parser.addParseListener(this as SheetListener);
  }

  visitTerminal(): void {
    // empty block
  }
  visitErrorNode(): void {
    // empty block
  }
  enterEveryRule(): void {
    // empty block
  }
  exitEveryRule(): void {
    // empty block
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
      const decoratorDslPlacement = getShortDSLPlacement(ctx, 1);

      const paramsSpan = ctx.primitive_list().map((p) => {
        const numberP = p.number_();
        if (numberP != null) {
          return ParsedText.from(numberP);
        }

        return ParsedText.from(p.string_());
      });

      decorators.push(
        new ParsedDecorator(
          Span.fromParserRuleContext(ctx),
          ParsedText.from(ctx.decorator_name()),
          paramsSpan,
          ctx.decorator_name().getText(),
          decoratorDslPlacement,
          ctx.primitive_list().map((p) => {
            const numberP = p.number_();
            if (numberP != null) {
              return +numberP.getText();
            }

            return SheetReader.stripQuotes(p.string_()?.getText() ?? "''");
          })
        )
      );
    }

    return decorators;
  }

  private buildSheet(ctx: SheetContext) {
    const tables: ParsedTable[] = [];
    const pythonBlocks: PythonBlock[] = [];

    for (const pythonBlock of ctx.python_definition_list()) {
      const dslPlacement = getFullDSLPlacement(pythonBlock, true);

      if (!dslPlacement) continue;

      pythonBlocks.push(new PythonBlock(dslPlacement));
    }

    for (const tableCtx of ctx.table_definition_list()) {
      const fields: ParsedField[] = [];
      const tableNameCtx = tableCtx.table_name();

      if (!tableNameCtx) continue;

      const tableNote: DSLNote = {
        text: '',
        start: 0,
        end: 0,
      };

      const docComment = tableCtx.doc_comment_list();

      if (docComment.length > 0) {
        const firstDocComment = docComment[0];
        const lastDocComment = docComment.at(-1);

        tableNote.start = firstDocComment.start.start;
        tableNote.end = lastDocComment?.stop?.stop || tableNote.start;

        docComment.forEach((i) => {
          tableNote.text += i.getText();
        });
      }

      const tableName = tableNameCtx.getText();
      const tableRange = getFullDSLPlacement(tableCtx);

      const tableNameRange = {
        start: tableNameCtx.start.start,
        end: tableNameCtx.start.start + tableName.length,
      };

      for (const fieldCtx of tableCtx.field_definition_list()) {
        const fieldNameCtx = fieldCtx.field_name();

        if (!fieldNameCtx) continue;

        const fieldName: string = fieldNameCtx.getText();
        let fieldExpression: ExpressionContext | undefined;
        let expressionMetadata: ExpressionMetadata | undefined;

        try {
          fieldExpression = fieldCtx.expression();

          if (fieldExpression) {
            const startIndex = fieldExpression.start.start;
            const end =
              fieldExpression.stop?.stop ||
              startIndex + fieldExpression.getText().length;

            const expressionText = SheetReader.sourceText.substring(
              startIndex,
              end + 1
            );

            expressionMetadata = {
              text: expressionText || fieldExpression.getText(),
              start: Math.min(startIndex, end),
              end: Math.max(startIndex, end),
            };
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }

        const dslFieldNamePlacement = getFieldNameDslPlacement(
          fieldNameCtx,
          fieldName
        );
        const dslFieldPlacement = getShortDSLPlacement(fieldCtx);
        const fieldNote: DSLNote = {
          text: '',
          start: 0,
          end: 0,
        };

        const docComment = fieldCtx.doc_comment_list();

        if (docComment.length > 0) {
          const firstDocComment = docComment[0];
          const lastDocComment = docComment.at(-1);

          fieldNote.start = firstDocComment.start.start;
          fieldNote.end = lastDocComment?.stop?.stop || fieldNote.start;

          docComment.forEach((i) => {
            fieldNote.text += i.getText();
          });
        }

        try {
          const field = new ParsedField(
            new FieldKey(
              tableName,
              fieldName,
              SheetReader.stripQuotes(fieldName)
            ),
            false,
            fieldExpression && this.buildExpression(fieldExpression),
            expressionMetadata,
            Span.fromParserRuleContext(fieldCtx),
            ParsedText.fromFieldName(fieldNameCtx),
            ParsedText.fromTerminalNode(fieldCtx.KEY_KEYWORD()),
            ParsedText.fromTerminalNode(fieldCtx.DIMENSION_KEYWORD()),
            ParsedText.fromExpression(fieldCtx.expression()),
            ParsedText.fromDocs(fieldCtx.doc_comment_list()),
            dslFieldPlacement,
            dslFieldNamePlacement,
            SheetReader.parseDecorators(fieldCtx.decorator_definition_list()),
            fieldNote.text ? fieldNote : undefined
          );

          fields.push(field);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      const decorators = SheetReader.parseDecorators(
        tableCtx.decorator_definition_list()
      );
      const isManual = !!decorators.find(
        (decorator) => decorator.decoratorName === 'manual'
      );

      const overrideDefinition = tableCtx.override_definition();
      const keyFields = fields
        .filter((f) => f.isKey)
        .map((f) => f.key.fieldName);
      const overrides = this.parseOverrides(
        keyFields,
        isManual,
        overrideDefinition
      );
      const dslOverridePlacement = getFullDSLPlacement(
        overrideDefinition,
        true
      );
      const parsedApply: ParsedApply | undefined = this.parseApply(tableCtx);
      const parsedTotals: ParsedTotals[] | undefined = this.parseTotals(
        tableCtx,
        tableName
      );
      const tableTotal: ParsedTotal | undefined = this.parseTableTotals(
        tableCtx,
        tableName
      );

      tables.push(
        new ParsedTable(
          Span.fromParserRuleContext(tableCtx),
          ParsedText.fromTableName(tableNameCtx),
          tableName,
          fields,
          tableCtx.getText(),
          tableRange,
          tableNameRange,
          decorators,
          ParsedText.fromDocs(tableCtx.doc_comment_list()),
          overrides,
          dslOverridePlacement,
          parsedApply,
          parsedTotals,
          tableTotal,
          tableNote.text ? tableNote : undefined
        )
      );
    }

    return new ParsedSheet(
      tables,
      this.errorListener.getErrors(),
      pythonBlocks,
      SheetReader.sourceText
    );
  }

  private parseTotals(
    tableCtx: Table_definitionContext,
    tableName: string
  ): ParsedTotals[] | undefined {
    const totals: ParsedTotals[] = [];
    const totalCtx = tableCtx.total_definition_list();

    if (!totalCtx) return;

    for (let i = 0; i < totalCtx.length; i++) {
      const totalItemCtx = totalCtx[i];

      const fields: ParsedField[] = [];

      for (const fieldCtx of totalItemCtx.field_definition_list()) {
        const fieldNameCtx = fieldCtx.field_name();
        const fullFieldName = fieldNameCtx.getText();
        const fieldName: string = SheetReader.stripQuotes(fullFieldName);
        const parsedField = new ParsedField(
          new FieldKey(
            tableName,
            fieldName,
            SheetReader.stripQuotes(fieldName)
          ),
          false,
          ParsedText.fromExpression(fieldCtx.expression()),
          undefined,
          Span.fromParserRuleContext(fieldCtx),
          ParsedText.fromFieldName(fieldCtx.field_name()),
          undefined,
          undefined,
          ParsedText.fromExpression(fieldCtx.expression()),
          []
        );
        fields.push(parsedField);
      }

      totals.push(
        new ParsedTotals(Span.fromParserRuleContext(totalItemCtx), fields)
      );
    }

    return totals;
  }

  private parseTableTotals(
    tableCtx: Table_definitionContext,
    tableName: string
  ): ParsedTotal | undefined {
    const totalCtx = tableCtx.total_definition_list();

    if (!totalCtx) return;

    const dslPlacement: FullDSLPlacement | undefined =
      getMultiContextFullDSLPlacement(totalCtx);
    const size = totalCtx.length;
    const totals: TableTotals = {};

    for (let i = 0; i < totalCtx.length; i++) {
      for (const fieldCtx of totalCtx[i].field_definition_list()) {
        const fieldNameCtx = fieldCtx.field_name();
        const fullFieldName = fieldNameCtx.getText();
        const fieldName: string = SheetReader.stripQuotes(fullFieldName);
        let fieldExpression: ExpressionContext | undefined;

        try {
          fieldExpression = fieldCtx.expression();

          const totalItem: TotalItem = {
            expression: fieldExpression.getText(),
            type: getTotalType(tableName, fieldName, fieldExpression.getText()),
            expressionDslPlacement: getShortDSLPlacement(fieldExpression),
            totalDslPlacement: getShortDSLPlacement(totalCtx[i]),
            fieldNameDslPlacement: getFieldNameDslPlacement(
              fieldCtx,
              fullFieldName
            ),
          };

          const index = i + 1;
          if (totals[fieldName]) {
            totals[fieldName][index] = totalItem;
          } else {
            totals[fieldName] = { [index]: totalItem };
          }
        } catch (e) {
          return;
        }
      }
    }

    return new ParsedTotal(dslPlacement, totals, size);
  }

  private parseApply(
    tableCtx: Table_definitionContext
  ): ParsedApply | undefined {
    const applyCtxList = tableCtx.apply_definition_list();

    if (applyCtxList.length === 0) return;

    const applyCtx = applyCtxList[0];
    const applySortCtx = applyCtx.apply_sort();
    const applyFilterCtx = applyCtx.apply_filter();

    let parsedSort: ParsedSort | undefined = undefined;
    let parsedFilter: ParsedFilter | undefined = undefined;
    const applyDslPlacement: FullDSLPlacement | undefined =
      getFullDSLPlacement(applyCtx);

    if (applySortCtx) {
      const sortDslPlacement = getShortDSLPlacement(applySortCtx);

      parsedSort = new ParsedSort(
        Span.fromParserRuleContext(applySortCtx),
        applySortCtx.expression_list().map((f) => {
          return ParsedText.fromExpression(f) as ParsedText;
        }),
        sortDslPlacement,
        applySortCtx.expression_list().map((f) => {
          return this.buildExpression(f);
        }),
        applySortCtx.getText()
      );
    }

    if (applyFilterCtx) {
      const filterDslPlacement = getShortDSLPlacement(applyFilterCtx);
      const filterExpressionDSLPlacement = getShortDSLPlacement(
        applyFilterCtx.expression()
      );

      parsedFilter = new ParsedFilter(
        Span.fromParserRuleContext(applyFilterCtx),
        ParsedText.fromExpression(applyFilterCtx.expression()),
        filterDslPlacement,
        filterExpressionDSLPlacement,
        applyFilterCtx.expression()
          ? this.buildExpression(applyFilterCtx.expression())
          : undefined,
        applyFilterCtx.getText()
      );
    }

    return new ParsedApply(
      Span.fromParserRuleContext(applyCtx),
      parsedSort,
      parsedFilter,
      applyDslPlacement
    );
  }

  private parseOverrides(
    keyFields: string[],
    isManual: boolean,
    ctx?: Override_definitionContext
  ): ParsedOverride | undefined {
    if (!ctx) return;

    const overrideFields = ctx
      .override_fields()
      .children?.filter((item) => item instanceof Override_fieldContext)
      .map((item) => item.getText());
    const overrideValues = ctx
      .override_row_list()
      .filter((item) => item instanceof Override_rowContext)
      .map((row) =>
        row.children
          ?.filter((item) => !(item instanceof TerminalNode))
          .map((item) => item.getText())
      )
      .filter(Boolean) as string[][];

    if (!overrideFields) {
      return undefined;
    }

    return new ParsedOverride(ctx, {
      overrideFields,
      overrideValues,
      keyFields,
      isManual,
    });
  }

  private buildExpression(ctx: ExpressionContext): Expression {
    const functionName = ctx.function_name();

    if (functionName) {
      const args: Expression[] = ctx
        .expression_list()
        .map((p) => this.buildExpression(p));

      const { start, stop } = functionName;
      const text = functionName.getText();
      const end = stop?.stop || start.start + text.length;

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? end;

      return new FunctionExpression(
        text,
        start.start,
        end,
        globalOffsetStart,
        globalOffsetEnd,
        args
      );
    }

    const listExpression = ctx.list_expression();

    if (listExpression) {
      const args: Expression[] = listExpression
        .expression_list()
        .map((p) => this.buildExpression(p));

      const { start, stop } = listExpression;
      const text = listExpression.getText();
      const end = stop?.stop || start.start + text.length;

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? end;

      return new FunctionExpression(
        text,
        start.start,
        end,
        globalOffsetStart,
        globalOffsetEnd,
        args
      );
    }

    const numberValue = ctx.number_();

    if (numberValue) {
      const text = numberValue.getText();

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd =
        ctx.stop?.stop ?? numberValue.start.start + text.length;

      return new ConstNumberExpression(
        text,
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    const stringValue = ctx.string_();

    if (stringValue) {
      const text = SheetReader.stripQuotes(stringValue.getText());

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd =
        ctx.stop?.stop ?? stringValue.start.start + text.length;

      return new ConstStringExpression(
        text,
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    const boolValue = ctx.bool();

    if (boolValue) {
      const text = boolValue.getText();

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd =
        ctx.stop?.stop ?? boolValue.start.start + text.length;

      return new ConstBoolExpression(text, globalOffsetStart, globalOffsetEnd);
    }

    const fieldName = ctx.field_name();

    if (fieldName) {
      const text = fieldName.getText();
      const dslPlacement = getShortDSLPlacement(fieldName);

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? dslPlacement?.end ?? 0;

      if (ctx.expression_list().length > 0) {
        return new FieldReferenceExpression(
          // ctx.expression_list()[0],
          this.buildExpression(ctx.expression_list()[0]),
          text,
          dslPlacement?.start || 0,
          dslPlacement?.end || 0,
          globalOffsetStart,
          globalOffsetEnd
        );
      } else {
        return new CurrentFieldExpression(
          text,
          dslPlacement?.start || 0,
          dslPlacement?.end || 0,
          globalOffsetStart,
          globalOffsetEnd
        );
      }
    }

    const tableName = ctx.table_name();

    if (tableName) {
      const text = tableName.getText();
      const dslPlacement = getShortDSLPlacement(tableName);

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? dslPlacement?.end ?? 0;

      return new TableReferenceExpression(
        text,
        dslPlacement?.start || 0,
        dslPlacement?.end || 0,
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    const rowReference = ctx.row_ref();

    if (rowReference) {
      const { start, stop } = rowReference;
      const text = rowReference.getText();
      const end = stop?.stop || start.start + text.length;

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? end;

      return new RowReferenceExpression(
        rowReference.MULTI_WORD_TABLE_IDENTIFIER().getText(),
        start.start,
        end,
        globalOffsetStart,
        globalOffsetEnd,
        this.buildExpression(rowReference.expression_list()[0])
      );
    }

    const binOp = SheetReader.binOp(ctx);
    if (binOp) {
      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? 0;

      return new BinOpExpression(
        this.buildExpression(ctx.expression_list()[0]),
        this.buildExpression(ctx.expression_list()[1]),
        binOp.getText(),
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    const uniOp = ctx.uni_op();

    if (uniOp) {
      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? 0;

      return new UniOpExpression(
        this.buildExpression(ctx.expression_list()[0]),
        parseUnaryOperation(uniOp.getText()),
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    if (ctx.expression_list().length === 1) {
      return this.buildExpression(ctx.expression_list()[0]);
    }

    const queryRow = ctx.query_row();

    if (queryRow) {
      const expression = ctx;

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd =
        ctx.stop?.stop ?? queryRow.stop?.stop ?? queryRow.start.start + 1;

      return new QueryRowExpression(
        expression,
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    const naExpressionCtx = ctx.na();

    if (naExpressionCtx) {
      const { start } = naExpressionCtx.start;
      const name = naExpression;

      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? start + name.length;

      return new FunctionExpression(
        name,
        start,
        start + name.length,
        globalOffsetStart,
        globalOffsetEnd
      );
    }

    if (!ctx.getText() || ctx.getText().trim() === '') {
      const globalOffsetStart = ctx.start.start;
      const globalOffsetEnd = ctx.stop?.stop ?? ctx.start.stop;

      return new EmptyExpression(globalOffsetStart, globalOffsetEnd);
    }

    throw new Error('[buildExpression] Cannot build expression');
  }

  /**
   * Get all comments that are in the hidden channel, so requires some custom logic to get them
   * Unused for now, but could be useful in the future
   * @private
   */
  private getComments(): DSLNote[] {
    const lexer = new SheetLexer(
      antlr.CharStreams.fromString(SheetReader.sourceText)
    );

    const comments: DSLNote[] = [];

    let done = false;

    while (!done) {
      const token = lexer.nextToken() as CommonToken;

      if (token == null || token.type === Token.EOF) {
        done = true;
      } else {
        const { start, stop, channel, text } = token;

        // channel 1 is the hidden channel
        if (channel === 1 && text) {
          comments.push({
            text,
            start,
            end: stop,
          });
        }
      }
    }

    return comments;
  }

  private static binOp(ctx: ExpressionContext) {
    return (
      ctx.bin_or() ??
      ctx.bin_and() ??
      ctx.bin_compare() ??
      ctx.bin_concat() ??
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

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parser.addParseListener(listener as SheetListener);

    lexer.removeErrorListeners();
    parser.removeErrorListeners();

    lexer.addErrorListener(listener.errorListener);
    parser.addErrorListener(listener.errorListener);

    parser._interp.predictionMode = PredictionMode.SLL;

    SheetReader.sourceText = text;

    return listener;
  }

  public static parseFormula(text: string): ParsedFormula {
    const reader = SheetReader.prepareParser(text);

    reader.parser.formula();

    return new ParsedFormula(
      reader.expression,
      reader.errorListener.getErrors()
    );
  }

  public static parseSheet(text?: string): ParsedSheet {
    if (!text || !text?.trim().length) {
      return new ParsedSheet([], [], [], '');
    }

    const reader = SheetReader.prepareParser(text + newLine || '');

    reader.parser.sheet();

    return reader.sheet;
  }

  public static stripQuotes(str: string) {
    return str.substring(1, str.length - 1);
  }
}
