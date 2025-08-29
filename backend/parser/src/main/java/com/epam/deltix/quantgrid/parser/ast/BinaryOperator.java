package com.epam.deltix.quantgrid.parser.ast;

import com.epam.deltix.quantgrid.parser.Span;
import lombok.Getter;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
public class BinaryOperator extends Function {
    private final Formula left;
    private final Formula right;
    private final BinaryOperation operation;

    public BinaryOperator(Formula left, Formula right, BinaryOperation operation) {
        this(null, left, right, operation);
    }

    public BinaryOperator(Span span, Formula left, Formula right, BinaryOperation operation) {
        super(span, "BinaryOperator", left, right);
        this.left = left;
        this.right = right;
        this.operation = operation;
    }

    @Override
    public String operationSymbol() {
        return operation.getSymbol();
    }

    @Override
    public String toString() {
        return "BinaryOperator(span=" + span() + ", left=" + left + ", right=" + right + ", operation=" + operation
                + ")";
    }
}
