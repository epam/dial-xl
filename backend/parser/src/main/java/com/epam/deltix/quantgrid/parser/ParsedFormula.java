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
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.ParserUtils;
import com.epam.deltix.quantgrid.util.type.EscapeType;
import com.google.gson.annotations.Expose;
import org.antlr.v4.runtime.ParserRuleContext;

import java.util.ArrayList;
import java.util.List;

import static com.epam.deltix.quantgrid.parser.ParsedText.stripQuotes;

public record ParsedFormula(@Expose Span span, Formula formula, List<ParsingError> errors) {
    public static Formula buildFormula(SheetParser.ExpressionContext ctx) {
        if (ctx == null) {
            throw new IllegalArgumentException("Missing formula context");
        }

        if (ctx.exception != null) {
            throw ctx.exception;
        }

        if (ctx.function_name() != null) {
            Formula[] arguments = ctx.expression().stream()
                    .map(ParsedFormula::buildFormula)
                    .toArray(Formula[]::new);
            return new Function(ctx.function_name().getText(), arguments);
        } else if (ctx.list_expression() != null) {
            Formula[] arguments = ctx.list_expression().expression().stream()
                    .map(ParsedFormula::buildFormula)
                    .toArray(Formula[]::new);
            return new Function("LIST", arguments);
        } else if (ctx.number() != null) {
            return new ConstNumber(Double.parseDouble(ctx.number().getText()));
        } else if (ctx.string() != null) {
            return new ConstText(ParserUtils.decodeEscapes(stripQuotes(ctx.string().getText()), EscapeType.STRING));
        } else if (ctx.field_name() != null) {
            ParsedText fieldName = ParsedText.fromFieldName(ctx.field_name());
            if (ctx.expression().isEmpty()) {
                return new CurrentField(fieldName == null ? "" : fieldName.text());
            }
            return new FieldReference(buildFormula(ctx.expression(0)), fieldName == null ? "" : fieldName.text());
        } else if (ctx.table_name() != null) {
            SheetParser.Table_nameContext tableNameContext = ctx.table_name();
            ParsedText tableName = ParsedText.fromTableName(tableNameContext);
            return new TableReference(tableName == null ? "" : tableName.text());
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
        } else if (ctx.row_ref() != null) {
            String name = ParserUtils.decodeEscapes(stripQuotes(ctx.row_ref().MULTI_WORD_TABLE_IDENTIFIER().getText()),
                    EscapeType.MULTIWORD_TABLE);
            ArrayList<Formula> arguments = new ArrayList<>();
            arguments.add(new TableReference(name));
            ctx.row_ref().expression().stream().map(ParsedFormula::buildFormula).forEach(arguments::add);
            return new Function("RowReference", arguments);
        } else if (ctx.na_expression() != null) {
            return new ConstNumber(Doubles.ERROR_NA);
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
        } else if (ctx.bin_concat() != null) {
            return ctx.bin_concat();
        }
        return null;
    }

    public static ParsedFormula from(SheetParser.ExpressionContext ctx) {
        return new ParsedFormula(Span.from(ctx), buildFormula(ctx), List.of());
    }
}
