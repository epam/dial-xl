package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class Fields extends PlanN<Table, Table> {

    private final String[] fields;

    public Fields(String[] fields) {
        this.fields = sort(fields);
    }

    public Fields(Plan pivotNames, Expression pivotNamesKey, String[] fields) {
        super(sourceOf(pivotNames, pivotNamesKey));
        this.fields = sort(fields);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING));
    }

    @Override
    public Table execute(List<Table> sources) {
        if (sources.isEmpty()) {
            return new LocalTable(new StringDirectColumn(fields));
        }

        StringColumn pivotNames = expression(0, 0).evaluate();
        Set<String> allNames = new TreeSet<>();
        Collections.addAll(allNames, fields);
        Collections.addAll(allNames, pivotNames.toArray());
        return new LocalTable(new StringDirectColumn(allNames.toArray(String[]::new)));
    }

    private static String[] sort(String[] fields) {
        String[] copy = fields.clone();
        Arrays.sort(copy);
        return copy;
    }
}
