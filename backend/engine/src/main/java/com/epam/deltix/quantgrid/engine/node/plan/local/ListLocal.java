package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class ListLocal extends Plan1<Table, LocalTable> {

    public ListLocal(Plan source, List<Expression> expressions) {
        super(source, expressions);
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(type()));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    public LocalTable execute(Table source) {
        List<Expression> expressions = expressions(0);
        ColumnType type = type();

        if (type.isDouble()) {
            double[] values = new double[expressions.size()];

            for (int i = 0; i < expressions.size(); i++) {
                DoubleColumn numbers = expressions.get(i).evaluate();
                values[i] = numbers.get(0);
            }

            return new LocalTable(new DoubleDirectColumn(values));
        }

        if (type.isString()) {
            String[] values = new String[expressions.size()];

            for (int i = 0; i < expressions.size(); i++) {
                StringColumn strings = expressions.get(i).evaluate();
                values[i] = strings.get(0);
            }

            return new LocalTable(new StringDirectColumn(values));
        }

        throw new IllegalArgumentException("Unsupported type: " + type);
    }

    private ColumnType type() {
        List<Expression> expressions = expressions(0);
        return (expressions.isEmpty()) ? ColumnType.DOUBLE : expression(0, 0).getType();
    }
}