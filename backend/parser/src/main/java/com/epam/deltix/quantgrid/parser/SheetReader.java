package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.ParserRuleContext;
import org.jetbrains.annotations.TestOnly;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class SheetReader extends SheetBaseListener {
    private final String name;
    @Getter
    private Formula formula;
    @Getter
    private ParsedSheet sheet;
    @Getter
    private final SheetParser parser;
    @Getter
    private final ErrorListener errorListener;
    @Getter
    private SheetParser.Field_definitionContext lastFieldContext;

    private SheetReader(String name, SheetLexer lexer, SheetParser parser) {
        this.name = name;
        this.parser = parser;
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        this.errorListener = new ErrorListener(this);
        lexer.addErrorListener(this.errorListener);
        parser.addErrorListener(this.errorListener);
        parser.addParseListener(this);
    }

    @Override
    public void exitFormula(SheetParser.FormulaContext ctx) {
        try {
            formula = ParsedFormula.buildFormula(ctx.expression());
        } catch (Exception ex) {
            log.error("Failed to parse formula", ex);
        }
    }

    @Override
    public void enterEveryRule(ParserRuleContext ctx) {
        if (ctx.getRuleIndex() != SheetParser.RULE_lb) {
            lastFieldContext = null;
        }
    }

    @Override
    public void exitField_definition(SheetParser.Field_definitionContext ctx) {
        lastFieldContext = ctx;
    }

    @Override
    public void exitSheet(SheetParser.SheetContext ctx) {
        sheet = buildSheet(ctx);
    }

    private ParsedSheet buildSheet(SheetParser.SheetContext ctx) {
        Map<String, ParsedTable> tables = new LinkedHashMap<>();
        for (SheetParser.Table_definitionContext tableCtx : ctx.table_definition()) {
            ParsedTable parsedTable = ParsedTable.from(tableCtx, errorListener);

            if (parsedTable != null && tables.putIfAbsent(parsedTable.tableName(), parsedTable) != null) {
                errorListener.syntaxError(tableCtx.start,
                        "Duplicate table. Table: " + parsedTable.tableName(), null, null);
            }
        }

        List<ParsingError> errors = new ArrayList<>(errorListener.getErrors());
        List<ParsedPython> pythons = new ArrayList<>();

        for (SheetParser.Python_definitionContext context : ctx.python_definition()) {
            String code = stripPythonCode(context.PYTHON_BLOCK().getText());
            ParsedPython python = PythonReader.parse(context, code);

            if (python.errors().isEmpty()) {
                pythons.add(python);
            } else {
                errors.addAll(python.errors());
            }
        }

        return new ParsedSheet(name, new ArrayList<>(tables.values()), pythons, errors);
    }

    private static String stripPythonCode(String text) {
        if (!text.startsWith("```python") || !text.endsWith("```")) {
            throw new IllegalArgumentException("Can't parse python block: " + text);
        }

        int start = "```python".length();
        int end = text.length() - "```".length();

        for (; start < end; start++) {
            char c = text.charAt(start);
            if (c != ' ' && c != '\r' && c != '\n') {
                break;
            }
        }

        return text.substring(start, end);
    }

    private static SheetReader prepareParser(String name, String text) {
        SheetLexer lexer = new SheetLexer(CharStreams.fromString(text));
        SheetParser parser = new SheetParser(new CommonTokenStream(lexer));
        SheetReader listener = new SheetReader(name, lexer, parser);
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        lexer.addErrorListener(listener.errorListener);
        parser.addErrorListener(listener.errorListener);
        return listener;
    }

    public static ParsedFormula parseFormula(String text) {
        SheetReader reader = prepareParser(null, text);
        reader.getParser().formula();

        return new ParsedFormula(
                new Span(0, text.length()),
                reader.getFormula(),
                reader.getErrorListener().getErrors());
    }

    @TestOnly
    public static ParsedSheet parseSheet(String text) {
        return parseSheet("test", text);
    }

    public static ParsedSheet parseSheet(String name, String text) {
        if (!text.isEmpty() && !text.endsWith("\n")) {
            text = text + "\n";
        }

        SheetReader reader = prepareParser(name, text);
        reader.getParser().sheet();

        return reader.getSheet();
    }
}
