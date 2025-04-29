package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;

import java.util.List;

@Value
@Accessors(fluent = true)
public class ParsedTotal {
    @Expose
    Span span;
    @Expose
    List<ParsedField> fields;

    public static ParsedTotal from(
            SheetParser.Total_definitionContext context, String tableName, ErrorListener errorListener) {
        List<ParsedField> fields = ParsedField.from(context.field_definition(), tableName, errorListener);
        return new ParsedTotal(Span.from(context), fields);
    }

    public static List<ParsedTotal> from(
            List<SheetParser.Total_definitionContext> contexts, String tableName, ErrorListener errorListener) {
        if (contexts == null || contexts.isEmpty()) {
            return List.of();
        }

        return contexts.stream()
                .map(context -> from(context, tableName, errorListener))
                .toList();
    }
}