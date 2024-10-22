package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.Token;

public record Span(@Expose int from, @Expose int to) {
    public static Span from(ParserRuleContext ctx) {
        return new Span(ctx.getStart().getStartIndex(), ctx.getStop().getStopIndex() + 1);
    }

    public static Span from(Token token) {
        return new Span(token.getStartIndex(), token.getStopIndex() + 1);
    }
}
