package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.List;

public class DistinctBySpark extends Plan1<SparkValue, SparkValue> {

    public DistinctBySpark(Plan source, List<Expression> keys) {
        super(source, keys);
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
    public SparkValue execute(SparkValue table) {
        Dataset<Row> dataset = table.getDataset();
        String[] columns = dataset.columns();

        List<Expression> keys = expressions(0);
        String[] keyColumns = new String[keys.size()];
        for (int i = 0; i < keyColumns.length; i++) {
            Expression key = keys.get(i);
            if (key instanceof Get get) {
                int index = get.getColumn();
                keyColumns[i] = columns[index];
            } else {
                throw new IllegalStateException("%s can have only pure Get for keys, but was %s"
                        .formatted(this, key));
            }
        }

        // dropDuplicates uses 'First' function that does not guaranty stable order for non-grouping columns.
        // This is not correct, and we should preserve an original global order.
        Dataset<Row> distinct = dataset.dropDuplicates(keyColumns);

        return new SparkDatasetTable(distinct);
    }
}
