package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.DatasetUtil;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public class CartesianSpark extends Plan2<SparkValue, SparkValue, SparkValue> {

    public CartesianSpark(Plan left, Plan right) {
        super(sourceOf(left), sourceOf(right));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0, 1));
    }

    @Override
    public SparkValue execute(SparkValue leftValue, SparkValue rightValue) {
        Dataset<Row> left = leftValue.getDataset();
        Dataset<Row> right = rightValue.getDataset();
        Dataset<Row> cross = left.crossJoin(right);
        String[] uniqueNames = DatasetUtil.concatWithSuffix(left.columns(), right.columns());
        return new SparkDatasetTable(cross.toDF(uniqueNames));
    }
}
