package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;

import static com.epam.deltix.quantgrid.parser.ParsedText.stripQuotes;

public record ParsedPrimitive(@Expose Span span, Object value) {
    public static ParsedPrimitive from(SheetParser.PrimitiveContext ctx) {
        if (ctx.exception != null) {
            return null;
        }

        return new ParsedPrimitive(
                Span.from(ctx),
                ctx.number() != null
                        ? Double.parseDouble(ctx.number().getText())
                        : stripQuotes(ctx.string().getText()));
    }
}
