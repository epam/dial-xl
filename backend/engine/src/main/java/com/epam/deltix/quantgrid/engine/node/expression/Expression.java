package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public abstract class Expression extends Node {

    protected Expression(Node... inputs) {
        super(inputs);
    }

    protected Expression(List<Node> inputs) {
        super(inputs);
    }

    public Expression expression(int index) {
        return (Expression) inputs.get(index);
    }

    public abstract ColumnType getType();

    public abstract <T extends Column> T evaluate();

    public org.apache.spark.sql.Column toSpark() {
        throw new UnsupportedOperationException();
    }

    @Override
    public Expression copy(boolean withIdentity) {
        return (Expression) super.copy(withIdentity);
    }

    @Override
    public Expression copy() {
        return (Expression) super.copy();
    }

    @Override
    public Expression copy(Node... inputs) {
        return (Expression) super.copy(inputs);
    }

    @Override
    public Expression copy(List<Node> inputs) {
        return (Expression) super.copy(inputs);
    }
}
