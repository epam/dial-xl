package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstBool;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.FieldsReference;
import com.epam.deltix.quantgrid.parser.ast.Missing;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.ParserUtils;
import com.epam.deltix.quantgrid.util.type.EscapeType;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.tree.TerminalNode;

import java.util.ArrayList;
import java.util.List;

import static com.epam.deltix.quantgrid.parser.ParsedText.stripQuotes;

public record ParsedFormula(Formula formula, List<ParsingError> errors) {
    public static Formula buildFormula(SheetParser.ExpressionContext ctx) {
        if (ctx == null) {
            throw new IllegalArgumentException("Missing formula context");
        }

        if (ctx.exception != null) {
            throw ctx.exception;
        }

        Span span = Span.from(ctx);
        if (ctx.function_name() != null) {
            List<Formula> args = new ArrayList<>();

            ctx.expression()
                    .stream()
                    .map(ParsedFormula::buildFormula)
                    .forEach(args::add);

            ctx.function_argument()
                    .stream()
                    .map(arg -> arg.expression() == null ? new Missing(Span.from(arg)) : buildFormula(arg.expression()))
                    .forEach(args::add);

            return new Function(span, ctx.function_name().getText(), args);
        } else if (ctx.list_expression() != null) {
            Formula[] arguments = ctx.list_expression().expression().stream()
                    .map(ParsedFormula::buildFormula)
                    .toArray(Formula[]::new);
            return new Function(span, "LIST", arguments);
        } else if (ctx.number() != null) {
            return new ConstNumber(span, Double.parseDouble(ctx.number().getText()));
        } else if (ctx.string() != null) {
            return new ConstText(span, ParserUtils.decodeEscapes(stripQuotes(ctx.string().getText()), EscapeType.STRING));
        } else if (ctx.field_name() != null) {
            ParsedText fieldName = ParsedText.fromFieldName(ctx.field_name());
            if (ctx.expression().isEmpty()) {
                return new CurrentField(span, fieldName == null ? "" : fieldName.text());
            }
            return new FieldReference(span, buildFormula(ctx.expression(0)), fieldName == null ? "" : fieldName.text());
        } else if (ctx.fields_reference() != null) {
            List<String> fields = FieldsReference.parseFields(ctx.fields_reference());
            return new FieldsReference(span, buildFormula(ctx.expression(0)), fields);
        } else if (ctx.table_name() != null) {
            SheetParser.Table_nameContext tableNameContext = ctx.table_name();
            ParsedText tableName = ParsedText.fromTableName(tableNameContext);
            return new TableReference(span, tableName == null ? "" : tableName.text());
        }
        ParserRuleContext binOp = binOp(ctx);
        if (binOp != null) {
            return new BinaryOperator(span, buildFormula(ctx.expression(0)), buildFormula(ctx.expression(1)),
                    BinaryOperation.parse(binOp.getText()));
        } else if (ctx.uni_op() != null) {
            return new UnaryOperator(span, buildFormula(ctx.expression(0)),
                    UnaryOperation.parse(ctx.uni_op().getText()));
        } else if (ctx.expression().size() == 1) {
            return buildFormula(ctx.expression(0));
        } else if (ctx.query_row() != null) {
            return new QueryRow(span);
        } else if (ctx.row_ref() != null) {
            TerminalNode nameNode = ctx.row_ref().MULTI_WORD_TABLE_IDENTIFIER();
            String name = ParserUtils.decodeEscapes(stripQuotes(nameNode.getText()), EscapeType.MULTIWORD_TABLE);
            ArrayList<Formula> arguments = new ArrayList<>();
            arguments.add(new TableReference(Span.from(nameNode.getSymbol()), name));
            ctx.row_ref().expression().stream().map(ParsedFormula::buildFormula).forEach(arguments::add);
            return new Function(span, "RowReference", arguments);
        } else if (ctx.bool() != null) {
            return new ConstBool(span, Boolean.parseBoolean(ctx.getText()));
        } else if (ctx.na() != null) {
            return new ConstNumber(span, Doubles.ERROR_NA);
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
        } else if (ctx.bin_concat() != null) {
            return ctx.bin_concat();
        } else if (ctx.bin_add_sub() != null) {
            return ctx.bin_add_sub();
        } else if (ctx.bin_mul_div_mod() != null) {
            return ctx.bin_mul_div_mod();
        } else if (ctx.bin_pow() != null) {
            return ctx.bin_pow();
        }
        return null;
    }
}
