package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.Value;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Value
public class ParsedApply {
    Formula filter;
    List<Formula> sort;

    @Nullable
    public static ParsedApply from(
            List<SheetParser.Apply_definitionContext> contexts, String table, ErrorListener errorListener) {
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }

        for (int i = 1; i <contexts.size(); i++) {
            SheetParser.Apply_definitionContext context = contexts.get(i);
            errorListener.syntaxError(context.start, "Only one apply section is expected", table, null);
        }

        SheetParser.Apply_definitionContext context = contexts.get(0);
        if (context.apply_filter() == null && context.apply_sort() == null) {
            return null;
        }

        Formula filter = null;
        List<Formula> sort = null;

        if (context.apply_filter() != null) {
            filter = ParsedFormula.buildFormula(context.apply_filter().expression());
        }

        if (context.apply_sort() != null) {
            sort = context.apply_sort().expression().stream().map(ParsedFormula::buildFormula).toList();
        }

        return new ParsedApply(filter, sort);
    }
}