package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.UnsafeRow;
import org.apache.spark.sql.catalyst.expressions.codegen.UnsafeRowWriter;

@Slf4j
public class NestedToPeriodSeriesSpark extends Plan2<SparkTable, SparkValue, SparkDatasetTable> {

    private final Period period;

    public NestedToPeriodSeriesSpark(Plan layout, Plan source, Expression key, Expression timestamp, Expression value,
                                     Period period) {
        super(sourceOf(layout), sourceOf(source, key, timestamp, value));
        this.period = period;
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.PERIOD_SERIES));
    }

    @Override
    protected SparkDatasetTable execute(SparkTable layout, SparkValue source) {
        Dataset<Row> dataset = source.getDataset();

        Column key = expression(1, 0).toSpark();
        Column timestamp = expression(1, 1).toSpark();
        Column value = expression(1, 2).toSpark();

        Column aggregation = SimpleToPeriodSeriesSpark.aggregate(period);

        Dataset<Row> aggregated = dataset.select(timestamp, value, key)
                .groupBy(key)
                .agg(aggregation);

        UnsafeRow zero = zero();
        Dataset<Row> alignedResult = NestedAggregateSpark.align(aggregated, layout, zero);

        return new SparkDatasetTable(alignedResult);
    }

    private static UnsafeRow zero() {
        UnsafeRowWriter rowWriter = new UnsafeRowWriter(2);
        rowWriter.resetRowWriter();
        rowWriter.write(0, 0.0);
        rowWriter.setNullAt(1);
        return rowWriter.getRow().copy();
    }
}
