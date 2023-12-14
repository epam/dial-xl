package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.ExpressionWithPlan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDoubleColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Column;

public class RowNumberSpark extends ExpressionWithPlan<SparkTable, DoubleColumn> {

    public RowNumberSpark(Plan layout) {
        super(layout);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.INTEGER;
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    public DoubleColumn evaluate(SparkTable layout) {
        TablePartition[] partitions = PartitionUtil.generateRowNumber(layout.getPartitions());
        return new SparkDoubleColumn(partitions);
    }

    @Override
    public Column toSpark() {
        throw new IllegalStateException("%s should not be translated to Spark expression".formatted(this));
    }
}
