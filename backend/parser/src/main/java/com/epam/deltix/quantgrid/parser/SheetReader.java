package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import com.epam.deltix.quantgrid.service.parser.CsvInputParser;
import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.Token;
import org.jetbrains.annotations.Nullable;

import java.io.Reader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class SheetReader extends SheetBaseListener {

    private static final String EMPTY = "";

    private static final String KEY_KEYWORD = "key";

    private static final String IMPLICIT_KEYWORD = "row";
    private static final String OVERRIDE_KEYWORD = "override";

    private static final String OVERRIDE_PARSE_ERROR =
            "Override section seems to be incorrect. Please, check definition";

    @Getter
    private Formula formula;
    @Getter
    private ParsedSheet sheet;
    @Getter
    private final SheetParser parser;
    @Getter
    private final ErrorListener errorListener = new ErrorListener();


    private SheetReader(SheetLexer lexer, SheetParser parser) {
        this.parser = parser;
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        lexer.addErrorListener(errorListener);
        parser.addErrorListener(errorListener);
        parser.addParseListener(this);
    }

    @Override
    public void exitFormula(SheetParser.FormulaContext ctx) {
        try {
            formula = buildFormula(ctx.expression());
        } catch (Exception ex) {
            log.error("Failed to parse formula", ex);
        }
    }

    @Override
    public void exitSheet(SheetParser.SheetContext ctx) {
        sheet = buildSheet(ctx);
    }

    private static List<ParsedDecorator> parseDecorators(List<SheetParser.Decorator_definitionContext> decoratorCtxs) {
        List<ParsedDecorator> decorators = new ArrayList<>();
        for (SheetParser.Decorator_definitionContext ctx : decoratorCtxs) {
            // if context has an exception - skip parsing
            if (ctx.exception != null) {
                continue;
            }

            String decoratorName = ctx.decorator_name().getText();
            boolean hasErrorArguments = ctx.primitive().stream().anyMatch(p -> p.exception != null);

            if (!hasErrorArguments) {
                decorators.add(new ParsedDecorator(decoratorName,
                        ctx.primitive().stream().map(p -> {
                            if (p.number() != null) {
                                return Double.parseDouble(p.number().getText());
                            } else {
                                return stripQuotes(p.string().getText());
                            }
                        }).toArray()));
            }
        }
        return decorators;
    }

    private ParsedSheet buildSheet(SheetParser.SheetContext ctx) {
        List<ParsedTable> tables = new ArrayList<>();
        for (SheetParser.Table_definitionContext tableCtx : ctx.table_definition()) {

            List<ParsedField> fields = new ArrayList<>();
            // validate table name
            String tableName = getTableName(tableCtx.table_name());
            if (tableName.isEmpty()) {
                Token token = tableCtx.table_name() != null ? tableCtx.table_name().start : tableCtx.start;
                errorListener.syntaxError(token, "Missing table name", null, null);
                continue;
            }

            for (SheetParser.Field_definitionContext fieldCtx : tableCtx.field_definition()) {
                // validate field name
                String fieldName = getFieldName(fieldCtx.field_name());
                if (fieldName.isEmpty()) {
                    Token token = fieldCtx.field_name() != null ? fieldCtx.field_name().start : fieldCtx.start;
                    errorListener.syntaxError(token, "Missing field name", tableName, null);
                    continue;
                }

                try {
                    fields.add(new ParsedField(
                            fieldCtx.KEY_KEYWORD() != null,
                            fieldCtx.DIMENSION_KEYWORD() != null,
                            new FieldKey(tableName, fieldName),
                            buildFormula(fieldCtx.expression()),
                            parseDecorators(fieldCtx.decorator_definition())));
                } catch (Exception ex) {
                    log.error("Failed to parse field", ex);
                }
            }

            ParsedOverride parsedOverride = parsedOverrides(tableCtx.override_definition(), tableName);

            tables.add(new ParsedTable(tableName, fields, parseDecorators(tableCtx.decorator_definition()),
                    parsedOverride));
        }

        return new ParsedSheet(tables, errorListener.getErrors());
    }

    static String getTableName(SheetParser.Table_nameContext tableNameContext) {
        if (tableNameContext == null) {
            return EMPTY;
        }

        String tableName;
        if (tableNameContext.MULTI_WORD_TABLE_IDENTIFIER() != null) {
            tableName = stripQuotes(tableNameContext.getText());
        } else {
            tableName = tableNameContext.getText();
        }

        return tableName.trim();
    }

    static String getFieldName(SheetParser.Field_nameContext fieldNameContext) {
        if (fieldNameContext == null) {
            return EMPTY;
        }
        return stripQuotes(fieldNameContext.getText()).trim();
    }

    private static String stripQuotes(String str) {
        return str.substring(1, str.length() - 1);
    }

    private Formula buildFormula(SheetParser.ExpressionContext ctx) {
        if (ctx == null) {
            throw new IllegalArgumentException("Missing formula context");
        }

        if (ctx.exception != null) {
            throw ctx.exception;
        }

        if (ctx.function_name() != null) {
            Formula[] arguments = ctx.expression().stream()
                    .map(this::buildFormula)
                    .toArray(Formula[]::new);
            return new Function(ctx.function_name().getText(), arguments);
        } else if (ctx.number() != null) {
            return new ConstNumber(Double.parseDouble(ctx.number().getText()));
        } else if (ctx.string() != null) {
            return new ConstText(stripQuotes(ctx.string().getText()));
        } else if (ctx.field_name() != null) {
            if (ctx.expression().isEmpty()) {
                return new CurrentField(getFieldName(ctx.field_name()));
            }
            return new FieldReference(buildFormula(ctx.expression(0)), getFieldName(ctx.field_name()));
        } else if (ctx.table_name() != null) {
            return new TableReference(getTableName(ctx.table_name()));
        }
        ParserRuleContext binOp = binOp(ctx);
        if (binOp != null) {
            return new BinaryOperator(buildFormula(ctx.expression(0)), buildFormula(ctx.expression(1)),
                    BinaryOperation.parse(binOp.getText()));
        } else if (ctx.uni_op() != null) {
            return new UnaryOperator(buildFormula(ctx.expression(0)),
                    UnaryOperation.parse(ctx.uni_op().getText()));
        } else if (ctx.expression().size() == 1) {
            return buildFormula(ctx.expression(0));
        } else if (ctx.query_row() != null) {
            return new QueryRow();
        } else if (ctx.na_expression() != null) {
            return new ConstNumber(Double.NaN);
        } else {
            throw new UnsupportedOperationException("Unsupported formula context");
        }
    }

    private static ParserRuleContext binOp(SheetParser.ExpressionContext ctx) {
        if (ctx.bin_or() != null) {
            return ctx.bin_or();
        } else if (ctx.bin_and() != null) {
            return ctx.bin_and();
        } else if (ctx.bin_compare() != null) {
            return ctx.bin_compare();
        } else if (ctx.bin_add_sub() != null) {
            return ctx.bin_add_sub();
        } else if (ctx.bin_mul_div_mod() != null) {
            return ctx.bin_mul_div_mod();
        } else if (ctx.bin_pow() != null) {
            return ctx.bin_pow();
        }
        return null;
    }

    @Nullable
    private ParsedOverride parsedOverrides(SheetParser.Override_definitionContext ctx, String tableName) {
        if (ctx == null || ctx.exception != null) {
            return null;
        }

        String overrideContent = ctx.OVERRIDE_CONTENT().getText();
        if (!overrideContent.startsWith(OVERRIDE_KEYWORD)) {
            errorListener.syntaxError(ctx.getStart(), OVERRIDE_PARSE_ERROR, tableName, null);
            return null;
        }
        String textCsv = overrideContent.substring(8);

        try {
            Reader schemaReader = new StringReader(textCsv);
            LinkedHashMap<String, ColumnType> schema = CsvInputParser.inferSchema(schemaReader, false);

            Reader contentReader = new StringReader(textCsv);
            ObjectArrayList<OverrideValue>[] columns = CsvInputParser.parseOverrideInput(contentReader, schema);
            int overrideSize = columns[0].size();

            return buildOverrides(schema, columns, tableName, overrideSize);
        } catch (Exception ex) {
            log.error("Failed to parse override section", ex);
            errorListener.syntaxError(ctx.getStart(), OVERRIDE_PARSE_ERROR, tableName, null);

            return null;
        }
    }

    private static ParsedOverride buildOverrides(LinkedHashMap<String, ColumnType> schema,
                                                 ObjectArrayList<OverrideValue>[] columns,
                                                 String tableName, int size) {
        ParsedOverride.TypedValue rowNumberKey = null;
        Map<FieldKey, ParsedOverride.TypedValue> keys = new HashMap<>();
        Map<FieldKey, ParsedOverride.TypedValue> fields = new HashMap<>();

        int index = 0;
        for (Map.Entry<String, ColumnType> entry : schema.entrySet()) {
            String columnName = entry.getKey();
            ColumnType columnType = entry.getValue();
            ObjectArrayList<OverrideValue> columnValues = columns[index++];


            // key column
            if (columnName.equals(IMPLICIT_KEYWORD)) {
                rowNumberKey = new ParsedOverride.TypedValue(columnType, columnValues);
            } else if (columnName.startsWith(KEY_KEYWORD)) {
                String keyFieldName = stripQuotes(columnName.replaceFirst(KEY_KEYWORD, "").trim());
                keys.put(new FieldKey(tableName, keyFieldName),
                        new ParsedOverride.TypedValue(columnType, columnValues));
            } else {
                // regular column
                String regularFieldName = stripQuotes(columnName);
                fields.put(new FieldKey(tableName, regularFieldName),
                        new ParsedOverride.TypedValue(columnType, columnValues));
            }
        }

        return new ParsedOverride(rowNumberKey, keys, fields, size);
    }

    public static SheetReader prepareParser(String text) {
        SheetLexer lexer = new SheetLexer(CharStreams.fromString(text));
        SheetParser parser = new SheetParser(new CommonTokenStream(lexer));
        SheetReader listener = new SheetReader(lexer, parser);
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        lexer.addErrorListener(listener.errorListener);
        parser.addErrorListener(listener.errorListener);
        return listener;
    }

    public static ParsedFormula parseFormula(String text) {
        SheetReader reader = prepareParser(text);
        reader.getParser().formula();

        return new ParsedFormula(reader.getFormula(), reader.getErrorListener().getErrors());
    }

    public static ParsedSheet parseSheet(String text) {
        SheetReader reader = prepareParser(text);
        reader.getParser().sheet();

        return reader.getSheet();
    }
}
