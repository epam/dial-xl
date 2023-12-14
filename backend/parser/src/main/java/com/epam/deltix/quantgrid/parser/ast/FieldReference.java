package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(callSuper = false)
@ToString
public class FieldReference extends Formula {
    Formula table;
    String field;

    public FieldReference(Formula table, String field) {
        super(table);
        this.table = table;
        this.field = field;
    }
}
