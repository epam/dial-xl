package com.epam.deltix.quantgrid.parser;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Builder
@Value
public class ParsedSheet {
    List<ParsedTable> tables;
    List<ParsingError> errors;
}
