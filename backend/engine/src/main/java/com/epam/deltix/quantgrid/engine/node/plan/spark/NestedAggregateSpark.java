package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.spark.GapFillerTransform;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.partitioning.RowNumRepartition;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.UnsafeRow;
import org.apache.spark.sql.catalyst.expressions.codegen.UnsafeRowWriter;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;

import java.util.List;

public class NestedAggregateSpark extends Plan2<SparkTable, SparkValue, SparkDatasetTable> {

    private final AggregateType function;

    public NestedAggregateSpark(Plan layout, Plan source,
                                Expression key,
                                List<Expression> values, AggregateType function) {
        super(sourceOf(layout), sourceOf(source, Util.listOf(key, values)));
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
    protected SparkDatasetTable execute(SparkTable layout, SparkValue table) {
        Dataset<Row> dataset = table.getDataset();

        Expression key = expression(1, 0);
        Column keyColumn = key.toSpark();

        List<Expression> values = expressions(1, 1);
        List<Column> valueColumns = values.stream().map(Expression::toSpark).toList();

        Aggregation aggregation = aggregate(valueColumns, function);
        Dataset<Row> aggDataset = dataset.groupBy(keyColumn).agg(aggregation.column);
        UnsafeRow zero = zeroRow(aggregation);
        Dataset<Row> aligned = align(aggDataset, layout, zero);

        return new SparkDatasetTable(aligned);
    }

    static Aggregation aggregate(List<Column> columns, AggregateType function) {
        return switch (function) {
            case COUNT -> countColumn(columns);
            case SUM -> sumColumn(columns);
            default -> throw new IllegalArgumentException("Unsupported function: " + function);
        };
    }

    private static Aggregation countColumn(List<Column> columns) {
        Util.verify(columns.isEmpty(), "Count aggregation should not accept any value columns");
        Column count = functions.count(functions.lit(1)).cast(DataTypes.DoubleType);
        return new Aggregation(count, 0.0);
    }

    private static Aggregation sumColumn(List<Column> columns) {
        Util.verify(!columns.isEmpty(), "Sum aggregation should accept at least one value column");
        double zero = 0.0;
        Column sum = columns.stream()
                .map(col -> functions.coalesce(functions.sum(col), functions.lit(zero)))
                .reduce(Column::plus)
                .get();
        return new Aggregation(sum, zero);
    }

    static Dataset<Row> align(Dataset<Row> aggDataset, SparkTable layout, UnsafeRow zero) {
        long[] ranges = PartitionUtil.ranges(layout.getPartitions());
        String[] names = aggDataset.columns();
        String rnName = names[0];
        Column rnCol = aggDataset.col(rnName);

        RowNumRepartition rowNumRepartition = new RowNumRepartition(rnCol, ranges);
        Dataset<Row> repartitioned = aggDataset
                .transform(rowNumRepartition::apply)
                .sortWithinPartitions(rnCol);

        GapFillerTransform gapFiller = new GapFillerTransform(0, ranges, rnCol, zero);
        return repartitioned.transform(gapFiller::apply).drop(rnName);
    }

    record Aggregation(Column column, double zero) {
    }

    private static UnsafeRow zeroRow(Aggregation aggregation) {
        UnsafeRowWriter rowWriter = new UnsafeRowWriter(2);
        rowWriter.resetRowWriter();
        rowWriter.write(0, 0.0);
        rowWriter.write(1, aggregation.zero);
        return rowWriter.getRow().copy();
    }
}
