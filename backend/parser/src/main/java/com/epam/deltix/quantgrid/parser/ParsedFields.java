package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.util.Doubles;
import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.tree.TerminalNode;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Value
@Accessors(fluent = true)
public class ParsedFields {
    @Expose
    Span span;
    @Expose
    List<ParsedField> fields;
    @Expose
    Formula formula;

    public boolean isDim() {
        return !fields.isEmpty() && fields.get(0).isDim();
    }

    public static List<ParsedFields> from(List<SheetParser.Fields_definitionContext> contexts,
                                          String table, ErrorListener listener, boolean allowMultiDefinition) {
        List<ParsedFields> fields = new ArrayList<>();
        Set<String> existing = new HashSet<>();

        for (SheetParser.Fields_definitionContext ctx : contexts) {
            if (!allowMultiDefinition && ctx.field_declaration().size() > 1) {
                listener.syntaxError(ctx.start, "Multiple fields definition is not allowed. Table: " + table,
                        null, null);
                continue;
            }

            ParsedFields declaration = ParsedFields.from(ctx, table, listener);
            if (declaration == null) {
                continue;
            }

            List<String> duplicates = declaration.fields().stream().map(ParsedField::fieldName)
                    .filter(existing::contains).toList();

            if (duplicates.isEmpty()) {
                declaration.fields().stream().map(ParsedField::fieldName).forEach(existing::add);
                fields.add(declaration);
            } else {
                listener.syntaxError(ctx.start, "Duplicate column. Table: "
                        + table + ". Column: " + duplicates.get(0), null, null);
            }
        }

        return fields;
    }

    public static ParsedFields from(SheetParser.Fields_definitionContext context,
                                     String table, ErrorListener listener) {
        try {
            List<ParsedField> fields = new ArrayList<>();
            for (int i = 0; i < context.field_declaration().size(); i++) {
                SheetParser.Field_declarationContext declaration = context.field_declaration(i);
                ParsedText name = ParsedText.fromFieldName(declaration.field_name());
                TerminalNode dimension = declaration.DIMENSION_KEYWORD();

                if (name == null) {
                    Token token = declaration.field_name() != null ? declaration.field_name().start : context.start;
                    listener.syntaxError(token, "Missing column name", table, null);
                    continue;
                }

                if (i > 0 && dimension != null) {
                    listener.syntaxError(dimension.getSymbol(), "Unexpected dim keyword", table, null);
                    continue;
                }

                ParsedField field = new ParsedField(Span.from(declaration.start),
                        ParsedText.from(declaration.KEY_KEYWORD()),
                        ParsedText.from(dimension),
                        name,
                        ParsedDecorator.from(declaration.decorator_definition()),
                        ParsedText.fromDocs(declaration.doc_comment())
                );

                fields.add(field);
            }

            if (fields.size() != context.field_declaration().size()) {
                return null;
            }

            Span span = Span.from(context);
            Formula formula = (context.expression() == null)
                    ? new ConstNumber(Doubles.EMPTY)
                    : ParsedFormula.buildFormula(context.expression());

            return new ParsedFields(span, fields, formula);
        } catch (RecognitionException ex) {
            // goes into error listener
        } catch (Throwable ex) {
            log.error("Failed to parse columns definition", ex);
        }

        return null;
    }
}