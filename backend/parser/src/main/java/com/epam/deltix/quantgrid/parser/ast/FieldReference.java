package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class FieldReference extends Formula {
    private final Formula table;
    private final String field;

    public FieldReference(Formula table, String field) {
        this(null, table, field);
    }

    public FieldReference(Span span, Formula table, String field) {
        super(span, table);
        this.table = table;
        this.field = field;
    }

    @Override
    public String toString() {
        return "FieldReference(span=" + span() + ", table=" + table + ", field=" + field + ")";
    }
}
