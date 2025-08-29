package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class ConstNumber extends Formula {
    private final double number;

    public ConstNumber(double number) {
        this(null, number);
    }

    public ConstNumber(Span span, double number) {
        super(span);
        this.number = number;
    }

    @Override
    public String toString() {
        return "ConstNumber(span=" + span() + ", number=" + number + ")";
    }
}

