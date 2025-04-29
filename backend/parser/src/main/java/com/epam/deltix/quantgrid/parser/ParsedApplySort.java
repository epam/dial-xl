package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Value
@Accessors(fluent = true)
public class ParsedApplySort {
    @Expose
    Span span;
    @Expose
    List<ParsedFormula> formulas;

    @Nullable
    public static ParsedApplySort from(SheetParser.Apply_sortContext context) {
        if (context == null) {
            return null;
        }

        List<ParsedFormula> formulas = context.expression().stream()
                .map(ParsedFormula::from)
                .toList();
        return new ParsedApplySort(Span.from(context), formulas);
    }
}