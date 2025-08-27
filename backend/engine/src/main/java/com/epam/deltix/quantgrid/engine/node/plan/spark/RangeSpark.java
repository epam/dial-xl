package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class RangeSpark extends Plan0<SparkTable> {

    public RangeSpark(Expression expression) {
        super(List.of(expression));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE));
    }

    @Override
    public SparkTable execute() {
        DoubleColumn count = expression(0).evaluate();
        long rowCount = extractCount(count);

        ColumnPartition columnPartition = PartitionUtil.generateRowNumber(rowCount);
        TablePartition tablePartition = TablePartition.builder()
                .index(0).startRow(0).endRow(rowCount - 1).column(columnPartition).build();
        TablePartition[] tablePartitions = {tablePartition};

        return new SparkTable(tablePartitions);
    }

    private static long extractCount(DoubleColumn column) {
        double value = column.get(0);
        long integer = (long) value;

        if (integer != value) {
            throw new IllegalArgumentException("Invalid argument \"count\" for function RANGE: expected an integer number.");
        }

        if (integer < 0) {
            throw new IllegalArgumentException("The count cannot be negative");
        }

        return integer;
    }
}
