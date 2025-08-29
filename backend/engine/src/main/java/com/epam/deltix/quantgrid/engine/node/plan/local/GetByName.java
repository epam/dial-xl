package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.executor.ExecutionError;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Expression1;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class GetByName extends Expression1<StructColumn, Column> {

    private final String name;
    private final ColumnType type;

    public GetByName(Expression source, String name, ColumnType type) {
        super(source);
        this.name = name;
        this.type = type;
    }

    @Override
    public ColumnType getType() {
        return type;
    }

    @Override
    protected Column evaluate(StructColumn source) {
        int position = source.getNames().indexOf(name);

        if (position < 0) {
            String message = "The column '%s' does not exist in the pivot table.".formatted(name);
            throw new ExecutionError(message);
        }

        return source.getTable().getColumn(position);
    }
}