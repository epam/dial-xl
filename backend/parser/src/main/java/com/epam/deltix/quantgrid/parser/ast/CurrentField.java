package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class CurrentField extends Formula {
    private final String field;

    public CurrentField(String field) {
        this(null, field);
    }

    public CurrentField(Span span, String field) {
        super(span);
        this.field = field;
    }

    @Override
    public String toString() {
        return "CurrentField(span=" + span() + ", field=" + field + ")";
    }
}
