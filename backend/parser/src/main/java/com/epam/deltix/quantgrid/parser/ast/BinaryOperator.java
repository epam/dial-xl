package com.epam.deltix.quantgrid.parser.ast;

import lombok.EqualsAndHashCode;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.Accessors;

@Value
@Accessors(fluent = true)
@EqualsAndHashCode(callSuper = false)
@ToString
public class BinaryOperator extends Function {

    Formula left;
    Formula right;
    BinaryOperation operation;

    public BinaryOperator(Formula left, Formula right, BinaryOperation operation) {
        super("BinaryOperator", left, right);
        this.left = left;
        this.right = right;
        this.operation = operation;
    }
}
