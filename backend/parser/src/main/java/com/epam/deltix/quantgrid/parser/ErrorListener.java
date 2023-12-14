package com.epam.deltix.quantgrid.parser;

import lombok.Getter;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;
import org.antlr.v4.runtime.Token;

import java.util.ArrayList;
import java.util.List;

public class ErrorListener extends BaseErrorListener {

    @Getter
    private final List<ParsingError> errors = new ArrayList<>();

    @Override
    public void syntaxError(Recognizer<?, ?> recognizer,
                            Object offendingSymbol,
                            int line,
                            int charPositionInLine,
                            String msg,
                            RecognitionException e) {
        String tableName = null;
        String fieldName = null;
        if (recognizer instanceof SheetParser sheetParser) {
            ParserRuleContext currentContext = sheetParser.getContext();
            tableName = findTableName(currentContext);
            fieldName = findFieldName(currentContext);
        }

        syntaxError(line, charPositionInLine, msg, tableName, fieldName);
    }

    public void syntaxError(Token token, String message, String tableName, String fieldName) {
        syntaxError(token.getLine(), token.getCharPositionInLine(), message, tableName, fieldName);
    }

    private void syntaxError(int line, int charPosition, String message, String tableName, String fieldName) {
        errors.add(new ParsingError(line, charPosition, message, tableName, fieldName));
    }

    private String findTableName(ParserRuleContext context) {
        if (context == null) {
            return null;
        }

        if (context instanceof SheetParser.Table_definitionContext tableDefinitionContext) {
            String tableName = SheetReader.getTableName(tableDefinitionContext.table_name());
            return tableName.isEmpty() ? null : tableName;
        }

        return findTableName(context.getParent());
    }

    private String findFieldName(ParserRuleContext context) {
        if (context == null) {
            return null;
        }

        if (context instanceof SheetParser.Field_definitionContext fieldDefinitionContext) {
            String fieldName = SheetReader.getFieldName(fieldDefinitionContext.field_name());
            return fieldName.isEmpty() ? null : fieldName;
        }

        return findFieldName(context.getParent());
    }
}
