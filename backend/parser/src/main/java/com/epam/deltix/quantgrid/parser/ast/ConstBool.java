package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class ConstBool extends Formula {
    private final boolean value;

    public ConstBool(Span span, boolean value) {
        super(span);
        this.value = value;
    }

    @Override
    public String toString() {
        return "ConstBool(span=" + span() + ", value=" + value + ")";
    }
}