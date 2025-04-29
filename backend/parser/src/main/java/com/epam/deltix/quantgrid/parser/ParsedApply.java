package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Value
@Accessors(fluent = true)
public class ParsedApply {
    @Expose
    Span span;
    @Expose
    ParsedApplyFilter filter;
    @Expose
    ParsedApplySort sort;

    @Nullable
    public static ParsedApply from(
            List<SheetParser.Apply_definitionContext> contexts, String table, ErrorListener errorListener) {
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }

        for (int i = 1; i < contexts.size(); i++) {
            SheetParser.Apply_definitionContext context = contexts.get(i);
            errorListener.syntaxError(context.start, "Only one apply section is expected", table, null);
        }

        SheetParser.Apply_definitionContext context = contexts.get(0);
        if (context.apply_filter() == null && context.apply_sort() == null) {
            return null;
        }

        return new ParsedApply(
                Span.from(context),
                ParsedApplyFilter.from(context.apply_filter()),
                ParsedApplySort.from(context.apply_sort()));
    }
}