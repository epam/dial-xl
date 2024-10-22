package com.epam.deltix.quantgrid.parser;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

class PythonParserTest {

    @Test
    void testEmpty() {
        String dsl = """
                !placement(5, 5)
                table A
                  dim [source] = RANGE(5)
                
                ```python
                ```
                
                ```python 
                  
                ```
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        Assertions.assertTrue(sheet.errors().isEmpty());
        Assertions.assertEquals(sheet.pythons().size(), 2);
    }

    @Test
    void testValidFunctions() {
        String code = """
                def f1(arg1: float, arg2) -> float:
                  return arg1 + arg2
                
                def f2(arg1: float, arg2: str):
                  return arg1 + arg2
                
                value = "1234"
                
                """;
        String dsl = """
                table A
                  [x] = 1
                
                ```python
                
                %s```
                
                """.formatted(code);

        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        Assertions.assertTrue(sheet.errors().isEmpty());

        List<ParsedPython> pythons = sheet.pythons();
        Assertions.assertEquals(pythons.size(), 1);

        ParsedPython python = pythons.get(0);
        Assertions.assertEquals(python.functions().size(), 2);
        Assertions.assertEquals(python.errors().size(), 0);

        Assertions.assertEquals(python.functions().get(0), new ParsedPython.Function(code, "f1",
                List.of(
                        new ParsedPython.Parameter("arg1", "float"),
                        new ParsedPython.Parameter("arg2", "str")
                ), new ParsedPython.Result("float"))
        );

        Assertions.assertEquals(python.functions().get(1), new ParsedPython.Function(code, "f2",
                List.of(
                        new ParsedPython.Parameter("arg1", "float"),
                        new ParsedPython.Parameter("arg2", "str")
                ), new ParsedPython.Result("str"))
        );
    }

    @Test
    void testInvalidFunctions() {
        String dsl = """
                table A
                  [x] = 1
                
                ```python
                
                def (arg1, arg2):
                
                ```
                
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        Assertions.assertEquals(0, sheet.pythons().size());
        Assertions.assertEquals(1, sheet.errors().size());
        Assertions.assertEquals("Error parsing python code: extraneous input '(' expecting NAME",
                sheet.errors().get(0).getMessage());
    }
}
