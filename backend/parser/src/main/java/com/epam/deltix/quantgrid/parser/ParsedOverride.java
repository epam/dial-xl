package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Missing;
import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Value
@Accessors(fluent = true)
public class ParsedOverride {
    private static final String ROW_KEY = "_row_20318401841084276546";

    @Expose
    Span span;
    @Expose
    List<ParsedText> headers;
    @Expose
    List<List<Formula>> values;
    FieldKey rowKey;
    Map<FieldKey, List<Formula>> map;
    int size;

    public ParsedOverride(
            Span span,
            List<ParsedText> headers,
            List<List<Formula>> values,
            String tableName) {
        this.span = span;
        this.headers = headers;
        this.values = values;
        this.rowKey = new FieldKey(tableName, ROW_KEY);
        this.map = buildMap(headers, values, tableName);
        this.size = map.values().iterator().next().size();
    }

    private static Map<FieldKey, List<Formula>> buildMap(
            List<ParsedText> headers,
            List<List<Formula>> values,
            String tableName) {
        Map<FieldKey, List<Formula>> map = new HashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            ParsedText header = headers.get(i);
            List<Formula> formulas = new ArrayList<>(values.size());
            for (List<Formula> line : values) {
                Formula formula = line.get(i);
                formulas.add(formula instanceof Missing ? null : formula);
            }
            map.put(new FieldKey(tableName, header.text()), formulas);
        }
        return map;
    }

    @Nullable
    public static ParsedOverride from(
            SheetParser.Override_definitionContext context, String tableName, ErrorListener errorListener) {
        if (context == null || context.exception != null) {
            return null;
        }

        int numberOfRows = 0;
        for (int i = context.override_row().size() - 1; i >= 0; --i) {
            if (context.override_row().get(i).getChildCount() != 0) {
                numberOfRows = i + 1;
                break;
            }
        }

        List<ParsedText> headers = new ArrayList<>();
        Set<String> fieldNames = new HashSet<>();
        for (SheetParser.Override_fieldContext header : context.override_fields().override_field()) {
            ParsedText fieldName;
            if (header.ROW_KEYWORD() == null) {
                fieldName = ParsedText.fromFieldName(header.field_name());
                if (fieldName == null) {
                    errorListener.syntaxError(header.getStart(), "Field name is empty", tableName, null);
                    return null;
                }
            } else {
                fieldName = new ParsedText(Span.from(header.ROW_KEYWORD().getSymbol()), ROW_KEY);
            }
            headers.add(fieldName);

            if (!fieldNames.add(fieldName.text())) {
                errorListener.syntaxError(context.getStart(), "Field must be specified exactly one time",
                        tableName, fieldName.text());
                return null;
            }
        }

        List<List<Formula>> lines = new ArrayList<>(numberOfRows);
        for (int i = 0; i < numberOfRows; i++) {
            SheetParser.Override_rowContext row = context.override_row().get(i);

            if (row.override_value().size() != headers.size()) {
                errorListener.syntaxError(context.getStart(), "Expected " + headers.size()
                        + " values per row, but was: " + row.override_value().size(), tableName, null);
                return null;
            }

            List<Formula> parsedFormulas = new ArrayList<>(headers.size());
            for (int j = 0; j < headers.size(); j++) {
                SheetParser.Override_valueContext value = row.override_value(j);
                Formula parsedFormula = value.expression() == null
                        ? new Missing(Span.from(value))
                        : ParsedFormula.buildFormula(value.expression());
                parsedFormulas.add(parsedFormula);
            }
            lines.add(parsedFormulas);
        }

        return new ParsedOverride(Span.from(context), headers, lines, tableName);
    }
}
