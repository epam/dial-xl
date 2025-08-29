package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class TableReference extends Formula {
    private final String table;

    public TableReference(String table) {
        this(null, table);
    }

    public TableReference(Span span, String table) {
        super(span);
        this.table = table;
    }

    @Override
    public String toString() {
        return "TableReference(span=" + span() + "table=" + table + ")";
    }
}
