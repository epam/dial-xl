package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.node.plan.spark.NestedAggregateSpark.Aggregation;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.Arrays;
import java.util.List;

public class SimpleAggregateSpark extends Plan2<Table, SparkValue, Table> {

    private final AggregateType function;

    public SimpleAggregateSpark(Plan layout, Plan source, AggregateType function) {
        super(layout, source);
        this.function = function;
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE));
    }

    @Override
    protected Table execute(Table layout, SparkValue table) {
        double result = switch (function) {
            case COUNT -> table.getDataset().count();
            case SUM -> aggAndCollect(table);
            default -> throw new IllegalArgumentException("Unsupported function: " + function);
        };
        return new LocalTable(new DoubleDirectColumn(result));
    }

    private double aggAndCollect(SparkValue table) {
        Dataset<Row> dataset = table.getDataset();
        List<Column> valueColumns = Arrays.stream(dataset.columns())
                .map(dataset::col)
                .toList();

        Aggregation aggregation = NestedAggregateSpark.aggregate(valueColumns, function);
        Dataset<Row> aggDataset = dataset.agg(aggregation.column());

        List<Row> rows = aggDataset.collectAsList();
        Util.verify(rows.size() == 1, "Simple aggregation should return a single value");
        return rows.get(0).getDouble(0);
    }
}
