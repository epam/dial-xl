package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class UnaryOperator extends Function {

    private final Formula argument;
    private final UnaryOperation operation;

    public UnaryOperator(Formula argument, UnaryOperation operation) {
        this(null, argument, operation);
    }

    public UnaryOperator(Span span, Formula argument, UnaryOperation operation) {
        super(span, "UnaryOperator", argument);
        this.argument = argument;
        this.operation = operation;
    }

    @Override
    public String operationSymbol() {
        return operation.getSymbol();
    }

    @Override
    public String toString() {
        return "UnaryOperator(span=" + span() + ", argument=" + argument + ", operation=" + operation + ")";
    }
}
