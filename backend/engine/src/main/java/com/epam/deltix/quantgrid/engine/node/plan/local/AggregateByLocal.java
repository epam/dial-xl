package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.executor.ExecutionError;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.ErrorColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.Long2IntOpenCustomHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class AggregateByLocal extends Plan1<Table, Table> {

    private final int keyCount;
    private final AggregateType[] types;
    private final int[] valCount;

    public AggregateByLocal(Plan source, List<Expression> keys, List<Aggregation> aggregations) {
        super(source, Util.combine(keys, aggregations.stream().map(Aggregation::values)
                .flatMap(Collection::stream).toList()));

        this.keyCount = keys.size();
        this.types = aggregations.stream().map(Aggregation::type).toArray(AggregateType[]::new);
        this.valCount = aggregations.stream().map(Aggregation::values).mapToInt(List::size).toArray();
    }

    public List<Expression> getKeys() {
        return expressions(0).subList(0, keyCount);
    }

    public List<Aggregation> getAggregations() {
        List<Aggregation> aggregations = new ArrayList<>();
        List<Expression> expressions = expressions(0);

        for (int i = 0, position = keyCount; i < types.length; position += valCount[i++]) {
            List<Expression> values = expressions.subList(position, position + valCount[i]);
            aggregations.add(new Aggregation(types[i], values));
        }

        return aggregations;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        List<ColumnType> schema = new ArrayList<>();
        getKeys().stream().map(Expression::getType).forEach(schema::add);

        for (int i = 0, position = keyCount; i < types.length; position += valCount[i++]) {
            AggregateType.SchemaFunction function = types[i].schemaFunction();

            if (function == AggregateType.SchemaFunction.INPUT) {
                function = AggregateType.SchemaFunction.INFERRED;
            }

            ColumnType type = function.apply(this, 0, position).getType(0);
            schema.add(type);
        }

        return new Meta(Schema.of(schema));
    }

    @Override
    protected Table execute(Table table) {
        List<Column> keys = getKeys().stream().map(expression -> (Column) expression.evaluate()).toList();
        if (keys.isEmpty()) {
            DoubleLambdaColumn rows = new DoubleLambdaColumn(index -> 0, table.size());
            return aggregate(rows, rows.size() == 0 ? 0 : 1);
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
        Table left = LocalTable.indirectOf(new LocalTable(keys), refs);
        Table right = aggregate(rows, map.size());
        return LocalTable.compositeOf(left, right);
    }

    private Table aggregate(DoubleColumn rows, int size) {
        List<Aggregation> aggregations = getAggregations();
        if (aggregations.isEmpty()) {
            return new LocalTable(size);
        }

        List<Column> results = new ArrayList<>();

        for (Aggregation aggregation : aggregations) {
            Column column;

            try {
                column = aggregate(aggregation, rows, size);
            } catch (ExecutionError error) {
                column = new ErrorColumn(error.getMessage(), size);
            }

            results.add(column);
        }

        return new LocalTable(results);
    }

    private static Column aggregate(Aggregation aggregation, DoubleColumn rows, int size) {
        AggregateFunction function = aggregation.type.aggregateFunction();
        List<Column> values = aggregation.values.stream()
                .map(expression -> (Column) expression.evaluate()).toList();

        if (aggregation.type().schemaFunction() == AggregateType.SchemaFunction.INPUT) {
            Column vals = values.get(0);
            List<Column> args = values.subList(1, values.size());
            long[] refs = (long[]) function.aggregate(rows, args, size);
            return Column.indirectOf(vals, refs);
        }

        Object result = function.aggregate(rows, values, size);

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

    public record Aggregation(AggregateType type, List<Expression> values) {
    }
}