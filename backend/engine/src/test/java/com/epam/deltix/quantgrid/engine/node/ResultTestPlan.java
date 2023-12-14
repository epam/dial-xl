package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructField;

import java.util.Arrays;

@NotSemantic
public class ResultTestPlan extends Plan0<Value> {

    private final Meta meta;
    private final Value value;

    public ResultTestPlan(Column... columns) {
        ColumnType[] types = Arrays.stream(columns).map(ResultTestPlan::typeOf).toArray(ColumnType[]::new);
        this.meta = new Meta(Schema.of(types));
        this.value = new LocalTable(columns);
    }

    public ResultTestPlan(Dataset<Row> dataset) {
        ColumnType[] types = Arrays.stream(dataset.schema().fields())
                .map(StructField::dataType).map(SchemaUtil::of).toArray(ColumnType[]::new);

        this.meta = new Meta(Schema.of(types));
        this.value = new SparkDatasetTable(dataset);
    }

    public ResultTestPlan(TablePartition... partitions) {
        ColumnType[] types = partitions[0].getColumns().stream()
                .map(TablePartition.ColumnPartition::getType).toArray(ColumnType[]::new);

        this.meta = new Meta(Schema.of(types));
        this.value = new SparkTable(partitions);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return meta;
    }

    @Override
    public Value execute() {
        return value;
    }

    private static ColumnType typeOf(Column column) {
        if (column instanceof DoubleColumn) {
            return ColumnType.DOUBLE;
        }

        if (column instanceof StringColumn) {
            return ColumnType.STRING;
        }

        if (column instanceof PeriodSeriesColumn) {
            return ColumnType.PERIOD_SERIES;
        }

        throw new IllegalArgumentException("Unsupported column: " + column.getClass());
    }
}
