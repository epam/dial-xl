package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(callSuper = false)
public class UnaryOperator extends Function {

    Formula argument;
    UnaryOperation operation;

    public UnaryOperator(Formula argument, UnaryOperation operation) {
        super("UnaryOperator", argument);
        this.argument = argument;
        this.operation = operation;
    }

    @Override
    public String operationSymbol() {
        return operation.getSymbol();
    }
}
