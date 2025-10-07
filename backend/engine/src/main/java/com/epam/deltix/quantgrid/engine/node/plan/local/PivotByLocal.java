package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.Pivot;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.Long2IntOpenCustomHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.List;

public class PivotByLocal extends Plan2<Table, Table, Table> {

    private final ColumnType type;
    @NotSemantic
    private final int keyCount;

    public PivotByLocal(Plan source, List<Expression> keys, List<Expression> values,
                        Plan search, Expression searchNames, ColumnType type) {
        super(sourceOf(source, Util.combine(keys, values)), sourceOf(search, searchNames));
        this.type = type;
        this.keyCount = keys.size();
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        List<Expression> expressions = expressions(0);
        List<Expression> keys = expressions.subList(0, keyCount);
        Schema left = Schema.of(keys.stream().map(Expression::getType).toArray(ColumnType[]::new));
        Schema right = Schema.of(ColumnType.STRUCT);
        return new Meta(Schema.of(left, right));
    }

    @Override
    protected Table execute(Table table, Table search) {
        List<Column> columns = expressions(0).stream()
                .map(expression -> (Column) expression.evaluate()).toList();
        List<Column> keys = columns.subList(0, keyCount);
        List<Column> values = columns.subList(keys.size(), columns.size());

        if (keys.isEmpty()) {
            DoubleColumn rows = new DoubleLambdaColumn(index -> 0, table.size());
            StringColumn names = expression(1, 0).evaluate();
            StructColumn result = new Pivot(names, type).aggregate(rows, values, (table.size() > 0) ? 1 : 0);
            return new LocalTable(result);
        }

        TableHashStrategy strategy = TableHashStrategy.fromColumns(keys);
        Long2IntOpenCustomHashMap map = new Long2IntOpenCustomHashMap(strategy);
        map.defaultReturnValue(-1);

        LongArrayList refs = new LongArrayList();
        DoubleArrayList indices = new DoubleArrayList();

        for (int ref = 0, next = 0; ref < table.size(); ref++) {
            int index = map.putIfAbsent(ref, next);

            if (index < 0) {
                refs.add(ref);
                indices.add(next++);
            } else {
                indices.add(index);
            }
        }

        DoubleColumn rows = new DoubleDirectColumn(indices);
        StringColumn names = expression(1, 0).evaluate();
        StructColumn result = new Pivot(names, type).aggregate(rows, values, map.size());

        Table left = LocalTable.indirectOf(new LocalTable(keys), refs);
        Table right = new LocalTable(result);
        return LocalTable.compositeOf(left, right);
    }
}