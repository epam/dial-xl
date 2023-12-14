package com.epam.deltix.quantgrid.engine.node;

import lombok.EqualsAndHashCode;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(of = "id")
public class Identity {
    String id;
    boolean original;
    int[] columns;

    public Identity(String id, boolean original, int... columns) {
        this.id = id;
        this.original = original;
        this.columns = columns;
    }
}