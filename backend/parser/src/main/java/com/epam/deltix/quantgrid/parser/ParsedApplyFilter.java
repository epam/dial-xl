package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.google.gson.annotations.Expose;
import lombok.Value;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

@Value
@Accessors(fluent = true)
public class ParsedApplyFilter {
    @Expose
    Span span;
    @Expose
    Formula formula;

    @Nullable
    public static ParsedApplyFilter from(SheetParser.Apply_filterContext context) {
        if (context == null) {
            return null;
        }

        Formula formula = ParsedFormula.buildFormula(context.expression());
        return new ParsedApplyFilter(Span.from(context), formula);
    }
}