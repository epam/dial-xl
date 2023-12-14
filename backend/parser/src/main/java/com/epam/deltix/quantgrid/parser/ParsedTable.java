package com.epam.deltix.quantgrid.parser;

import lombok.Builder;
import lombok.Value;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Builder
@Value
public class ParsedTable {
    String tableName;
    List<ParsedField> fields;
    List<ParsedDecorator> decorators;
    @Nullable
    ParsedOverride overrides;

    public ParsedTable(String tableName, List<ParsedField> fields, List<ParsedDecorator> decorators,
                       @Nullable ParsedOverride parsedOverride) {
        this.tableName = tableName;
        this.fields = fields;
        this.decorators = decorators;
        this.overrides = parsedOverride;
    }

    public ParsedTable(String tableName, List<ParsedField> fields, List<ParsedDecorator> decorators) {
        this(tableName, fields, decorators, null);
    }
}
