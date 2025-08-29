package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Getter
@Accessors(fluent = true)
@EqualsAndHashCode
public abstract class Formula {
    private final Span span;
    private final List<Formula> arguments;

    protected Formula(Span span) {
        this(span, List.of());
    }

    Formula(Formula... arguments) {
        this(null, arguments);
    }

    Formula(Span span, Formula... arguments) {
        this(span, List.of(arguments));
    }

    Formula(List<Formula> arguments) {
        this(null, arguments);
    }

    Formula(Span span, List<Formula> arguments) {
        this.span = span;
        this.arguments = arguments;
    }
}
