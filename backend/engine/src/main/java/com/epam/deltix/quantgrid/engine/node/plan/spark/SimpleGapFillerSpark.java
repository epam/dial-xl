package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.GenericRow;

import java.util.List;

public class SimpleGapFillerSpark extends Plan1<SparkValue, SparkValue> {

    protected SimpleGapFillerSpark(Plan source) {
        super(source);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    protected SparkValue execute(SparkValue source) {
        if (!source.isEmpty()) {
            return source;
        }

        Schema schema = getPlan().getMeta().getSchema();

        Object[] values = new Object[schema.size()];
        for (int i = 0; i < values.length; i++) {
            values[i] = switch (schema.getType(i)) {
                case DOUBLE, INTEGER, BOOLEAN, DATE -> Double.NaN;
                case STRING, PERIOD_SERIES -> null;
            };
        }
        GenericRow emptyRow = new GenericRow(values);

        Dataset<Row> dataset = source.getDataset();
        Dataset<Row> singleRowDataset = Spark.session().createDataFrame(List.of(emptyRow), dataset.schema());

        return new SparkDatasetTable(singleRowDataset);
    }

}
