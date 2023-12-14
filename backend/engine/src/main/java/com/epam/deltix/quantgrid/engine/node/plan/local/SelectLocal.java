package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.ArrayList;
import java.util.List;

public class SelectLocal extends Plan0<Table> {

    public SelectLocal(Expression... expressions) {
        this(List.of(expressions));
    }

    public SelectLocal(List<Expression> expressions) {
        super(expressions);
    }

    @Override
    protected Plan layout() {
        return getExpression(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType[] types = expressions(0).stream().map(Expression::getType).toArray(ColumnType[]::new);
        return new Meta(Schema.of(types));
    }

    @Override
    public Table execute() {
        List<Expression> expressions = expressions(0);
        List<Column> columns = new ArrayList<>(expressions.size());

        for (Expression expression : expressions) {
            Column column = expression.evaluate();
            columns.add(column);
        }

        return new LocalTable(columns);
    }
}
