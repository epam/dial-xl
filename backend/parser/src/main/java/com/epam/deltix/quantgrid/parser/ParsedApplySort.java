package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
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
    List<Formula> formulas;

    @Nullable
    public static ParsedApplySort from(SheetParser.Apply_sortContext context) {
        if (context == null) {
            return null;
        }

        List<Formula> formulas = context.expression().stream()
                .map(ParsedFormula::buildFormula)
                .toList();
        return new ParsedApplySort(Span.from(context), formulas);
    }
}