package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.util.Doubles;
import com.google.gson.annotations.Expose;
import lombok.Builder;
import lombok.Value;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.Token;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


@Slf4j
@Builder
@Value
@Accessors(fluent = true)
public class ParsedField {
    @Expose
    Span span;
    @Expose
    ParsedText key;
    @Expose
    ParsedText dim;
    @Expose
    ParsedText name;
    @Expose
    ParsedFormula formula;
    @Expose
    List<ParsedDecorator> decorators;
    @Expose
    List<ParsedText> docs;

    public boolean isKey() {
        return key != null;
    }

    public boolean isDim() {
        return dim != null;
    }

    public String fieldName() {
        return name.text();
    }

    public static ParsedField from(
            SheetParser.Field_definitionContext context, String tableName, ErrorListener errorListener) {
        // validate field name
        ParsedText fieldName = ParsedText.fromFieldName(context.field_name());
        if (fieldName == null) {
            Token token = context.field_name() != null ? context.field_name().start : context.start;
            errorListener.syntaxError(token, "Missing field name", tableName, null);
            return null;
        }

        try {
            Span span = Span.from(context);
            ParsedFormula formula = (context.expression() == null)
                    ? new ParsedFormula(null, new ConstNumber(Doubles.EMPTY), List.of())
                    : ParsedFormula.from(context.expression());

            return new ParsedField(
                    span,
                    ParsedText.from(context.KEY_KEYWORD()),
                    ParsedText.from(context.DIMENSION_KEYWORD()),
                    fieldName,
                    formula,
                    ParsedDecorator.from(context.decorator_definition()),
                    ParsedText.fromDocs(context.doc_comment()));
        } catch (Exception ex) {
            log.error("Failed to parse field", ex);
            return null;
        }
    }

    public static List<ParsedField> from(
            List<SheetParser.Field_definitionContext> contexts, String tableName, ErrorListener errorListener) {
        Map<String, ParsedField> fields = new LinkedHashMap<>();
        for (SheetParser.Field_definitionContext fieldCtx : contexts) {
            ParsedField field = ParsedField.from(fieldCtx, tableName, errorListener);
            if (field != null && fields.putIfAbsent(field.fieldName(), field) != null) {
                errorListener.syntaxError(fieldCtx.start,
                        "Duplicate column. Table: " + tableName + ". Column: " + field.fieldName(), null, null);
            }
        }
        return List.copyOf(fields.values());
    }
}
