package com.epam.deltix.quantgrid.parser;

import java.util.List;

import com.epam.deltix.quantgrid.parser.ast.Formula;

public record ParsedFormula(Formula formula, List<ParsingError> errors) {
}
