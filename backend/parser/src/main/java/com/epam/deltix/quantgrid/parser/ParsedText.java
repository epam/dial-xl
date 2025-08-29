package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.util.ParserUtils;
import com.epam.deltix.quantgrid.util.type.EscapeType;
import com.google.gson.annotations.Expose;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.tree.TerminalNode;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.List;

public record ParsedText(@Expose Span span, String text) {
    private static ParsedText from(ParserRuleContext ctx, String value) {
        return new ParsedText(Span.from(ctx), value);
    }

    public static ParsedText from(ParserRuleContext ctx) {
        if (ctx.exception != null) {
            return null;
        }

        return ParsedText.from(ctx, ctx.getText());
    }

    public static ParsedText from(TerminalNode terminalNode) {
        if (terminalNode == null) {
            return null;
        }

        return new ParsedText(Span.from(terminalNode.getSymbol()), terminalNode.getText());
    }

    public static ParsedText fromTableName(SheetParser.Table_nameContext ctx) {
        if (ctx == null) {
            return null;
        }

        String tableName;
        if (ctx.MULTI_WORD_TABLE_IDENTIFIER() != null) {
            tableName = stripQuotes(ctx.getText());
        } else {
            tableName = ctx.getText();
        }
        tableName = ParserUtils.decodeEscapes(tableName.trim(), EscapeType.MULTIWORD_TABLE);

        if (tableName.isEmpty()) {
            return null;
        }

        return ParsedText.from(ctx, tableName);
    }

    @Nullable
    public static ParsedText fromFieldName(SheetParser.Field_nameContext fieldNameContext) {
        if (fieldNameContext == null) {
            return null;
        }

        String fieldName = ParserUtils.decodeEscapes(stripQuotes(fieldNameContext.getText()).trim(), EscapeType.FIELD);
        if (fieldName.isEmpty()) {
            return null;
        }

        return new ParsedText(Span.from(fieldNameContext), fieldName);
    }

    public static List<ParsedText> fromDocs(List<SheetParser.Doc_commentContext> contexts) {
        List<ParsedText> result = new ArrayList<>();
        for (ParserRuleContext context : contexts) {
            ParsedText parsedText = ParsedText.from(context);
            if (parsedText != null) {
                result.add(parsedText);
            }
        }

        return result;
    }

    public static String stripQuotes(String str) {
        if (str.isEmpty()) {
            return str;
        }

        return str.substring(1, str.length() - 1);
    }
}
