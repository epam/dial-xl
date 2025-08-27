package com.epam.deltix.quantgrid.parser;

import java.util.List;

import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
public class ParsedTotal {
    @Expose
    Span span;
    @Expose
    List<ParsedFields> fields;

    public static ParsedTotal from(
            SheetParser.Total_definitionContext context, String tableName, ErrorListener errorListener) {
        List<ParsedFields> fields = ParsedFields.from(context.fields_definition(), tableName, errorListener, false);
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