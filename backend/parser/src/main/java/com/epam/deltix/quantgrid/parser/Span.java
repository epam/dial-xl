package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.misc.Interval;

public record Span(String sheet, String text, @Expose int from, @Expose int to) {
    public static Span from(ParserRuleContext ctx) {
        return from(ctx.getStart(), ctx.getStop());
    }

    public static Span from(Token token) {
        return from(token, token);
    }

    private static Span from(Token start, Token stop) {
        int from = start.getStartIndex();
        int to = stop.getStopIndex() + 1;
        // for rules matching empty input, the stop token is behind the start token
        // so we skip all preceding whitespaces and point to the next token start
        to = Math.max(from, to);
        String text = start.getInputStream().getText(new Interval(from, to - 1));
        return new Span(start.getTokenSource().getSourceName(), text, from, to);
    }
}
