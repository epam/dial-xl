package com.epam.deltix.quantgrid.parser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;
import org.antlr.v4.runtime.Token;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
class PythonReader extends BaseErrorListener {

    public static ParsedPython parse(SheetParser.Python_definitionContext context, String code) {
        Python3Lexer lexer = new Python3Lexer(CharStreams.fromString(code));
        Python3Parser parser = new Python3Parser(new CommonTokenStream(lexer));
        PythonReader reader = new PythonReader();
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        lexer.addErrorListener(reader);
        parser.addErrorListener(reader);

        try {
            return parse(code, parser);
        } catch (Throwable e) {
            log.warn("Error parsing python code: ", e);
            Token start = context.getStart();
            ParsingError error = new ParsingError(start.getLine(), start.getCharPositionInLine(), e.getMessage());
            return new ParsedPython(code, List.of(), List.of(error));
        }
    }

    private static ParsedPython parse(String code, Python3Parser parser) {
        List<ParsedPython.Function> functions = new ArrayList<>();

        for (Python3Parser.StmtContext statement : parser.file_input().stmt()) {
            if (statement.compound_stmt() != null && statement.compound_stmt().funcdef() != null) {
                Python3Parser.FuncdefContext definition = statement.compound_stmt().funcdef();
                List<ParsedPython.Parameter> parameters = new ArrayList<>();

                if (definition.parameters() != null && definition.parameters().typedargslist() != null) {
                    for (Python3Parser.TfpdefContext arg : definition.parameters().typedargslist().tfpdef()) {
                        String name = arg.NAME().getText();
                        String type = (arg.test() == null) ? "str" : arg.test().getText();
                        ParsedPython.Parameter parameter = new ParsedPython.Parameter(name, type);
                        parameters.add(parameter);
                    }
                }

                String name = definition.NAME().getText();
                String type = (definition.test() == null) ? "str" : definition.test().getText();

                ParsedPython.Result result = new ParsedPython.Result(type);
                ParsedPython.Function function = new ParsedPython.Function(code, name, parameters, result);

                functions.add(function);
            }
        }

        return new ParsedPython(code, functions, List.of());
    }

    @Override
    public void syntaxError(Recognizer<?, ?> recognizer,
                            Object offendingSymbol,
                            int line,
                            int charPositionInLine,
                            String msg,
                            RecognitionException error) {
        throw new IllegalArgumentException("Error parsing python code: " + msg);
    }
}