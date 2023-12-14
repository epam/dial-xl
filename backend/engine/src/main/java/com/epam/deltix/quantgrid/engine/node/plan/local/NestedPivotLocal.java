package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan3;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

public class NestedPivotLocal extends Plan3<Table, Table, Table, Table> {

    @Getter
    private final String[] sourceNames;

    public NestedPivotLocal(Plan layout,
                            Plan source, Expression key, Expression name, Expression value,
                            Plan names, Expression namesKey,
                            String[] sourceNames) {
        super(sourceOf(layout), sourceOf(source, key, name, value), sourceOf(names, namesKey));
        this.sourceNames = sourceNames;
    }

    public Plan getSource() {
        return plan(1);
    }

    public Expression getKey() {
        return expression(1, 0);
    }

    public Expression getName() {
        return expression(1, 1);
    }

    public Expression getValue() {
        return expression(1, 2);
    }

    public Plan getNames() {
        return plan(2);
    }

    public Expression getNamesKey() {
        return expression(2, 0);
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType type = expression(1, 2).getType();
        return new Meta(Schema.ofN(type, sourceNames.length));
    }

    @Override
    protected Table execute(Table layout, Table table, Table distinctNameSource) {
        long tableSize = table.size();
        int resultSize = Util.toIntSize(layout);

        DoubleColumn keys = getKey().evaluate();
        StringColumn names = getName().evaluate();
        Column values = getValue().evaluate();
        StringColumn allNames = getNamesKey().evaluate();

        return SimplePivotLocal.pivot(keys, names, values, allNames, sourceNames, tableSize, resultSize);
    }
}
