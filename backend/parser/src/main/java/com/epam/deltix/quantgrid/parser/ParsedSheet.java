package com.epam.deltix.quantgrid.parser;

import com.google.gson.annotations.Expose;
import lombok.Builder;
import lombok.Value;
import lombok.experimental.Accessors;

import java.util.List;

@Builder
@Value
@Accessors(fluent = true)
public class ParsedSheet {
    String name;
    @Expose
    List<ParsedTable> tables;
    List<ParsedPython> pythons;
    @Expose
    @Builder.Default
    List<ParsingError> errors = List.of();

    public ParsedSheet(String name, List<ParsedTable> tables, List<ParsingError> errors) {
       this(name, tables, List.of(), errors);
    }

    public ParsedSheet(String name, List<ParsedTable> tables, List<ParsedPython> pythons, List<ParsingError> errors) {
        this.name = name;
        this.tables = tables;
        this.pythons = pythons;
        this.errors = errors;
    }
}
