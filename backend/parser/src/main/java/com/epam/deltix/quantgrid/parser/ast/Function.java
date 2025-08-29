package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Getter
@Accessors(fluent = true)
public class Function extends Formula {
    private final String name;

    public Function(String name, Formula... arguments) {
        super(arguments);
        this.name = name;
    }

    public Function(Span span, String name, Formula... arguments) {
        super(span, arguments);
        this.name = name;
    }

    public Function(String name, List<Formula> arguments) {
        super(arguments);
        this.name = name;
    }

    public Function(Span span, String name, List<Formula> arguments) {
        super(span, arguments);
        this.name = name;
    }

    @Override
    public String toString() {
        return "Function(span=" + span() + ", name=" + name + ", arguments=" + arguments() + ")";
    }

    public String operationSymbol() {
        return name;
    }
}
