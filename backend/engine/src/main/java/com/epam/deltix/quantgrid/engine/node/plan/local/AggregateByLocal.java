package com.epam.deltix.quantgrid.engine.node.plan.local;

import java.util.List;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.Long2IntOpenCustomHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import lombok.Getter;

public class AggregateByLocal extends Plan1<Table, Table> {

    @Getter
    private final AggregateType type;
    @NotSemantic
    private final int keyCount;

    public AggregateByLocal(AggregateType type, Plan source, List<Expression> keys, List<Expression> values) {
        super(source, Util.combine(keys, values));
        this.type = type;
        this.keyCount = keys.size();
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        List<Expression> keys = expressions(0).subList(0, keyCount);
        Schema left = Schema.of(keys.stream().map(Expression::getType).toArray(ColumnType[]::new));
        AggregateType.SchemaFunction schemaFunction = type.schemaFunction();

        if (schemaFunction == AggregateType.SchemaFunction.INPUT) {
            schemaFunction = AggregateType.SchemaFunction.INFERRED;
        }

        Schema right = schemaFunction.apply(this, 0, keyCount);
        return new Meta(Schema.of(left, right));
    }

    @Override
    protected Table execute(Table table) {
        List<Column> columns = expressions(0).stream()
                .map(expression -> (Column) expression.evaluate()).toList();
        List<Column> keys = columns.subList(0, keyCount);
        List<Column> values = columns.subList(keyCount, columns.size());

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
        Column result = aggregate(rows, values, map.size());

        Table left = LocalTable.indirectOf(new LocalTable(keys), refs);
        Table right = new LocalTable(result);

        return LocalTable.compositeOf(left, right);
    }

    private Column aggregate(DoubleColumn rows, List<Column> values, int size) {
        AggregateFunction function = type.aggregateFunction();
        Object result = function.aggregate(rows, values, size);

        if (result instanceof long[] references) {
            return Column.indirectOf(values.get(0), references);
        }

        if (result instanceof double[] numbers) {
            return new DoubleDirectColumn(numbers);
        }

        if (result instanceof String[] texts) {
            return new StringDirectColumn(texts);
        }

        if (result instanceof PeriodSeries[] series) {
            return new PeriodSeriesDirectColumn(series);
        }

        throw new IllegalArgumentException("Unsupported result: " + result.getClass());
    }
}