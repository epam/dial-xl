package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Builder
@Value
public class ParsedField {
    boolean isKey;
    boolean isDim;
    FieldKey key;
    Formula formula;
    List<ParsedDecorator> decorators;
}
