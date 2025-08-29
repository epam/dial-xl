package com.epam.deltix.quantgrid.parser;

import java.util.List;

public record ParsedPython(String python, List<Function> functions, List<ParsingError> errors) {
    public record Function(String code, String name, List<Parameter> parameters, Result result) {
    }
    public record Parameter(String name, String type) {
    }
    public record Result(String type) {
    }
}