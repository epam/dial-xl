package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.List;

public class OrderBySpark extends Plan1<SparkValue, SparkValue> {

    private final boolean[] ascending;

    public OrderBySpark(Plan input, List<Expression> keys, boolean[] ascending) {
        super(input, keys);
        this.ascending = ascending;
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
    protected SparkValue execute(SparkValue table) {
        Dataset<Row> dataset = table.getDataset();

        List<Expression> keyExpressions = expressions(0);
        int keyCount = ascending.length;
        Util.verify(keyExpressions.size() == keyCount, "Keys and directions should have the same size");

        Column[] sortKeys = new Column[keyCount];
        for (int i = 0; i < keyCount; i++) {
            Column column = keyExpressions.get(i).toSpark();
            sortKeys[i] = ascending[i] ? column : column.desc();
        }

        Dataset<Row> sorted = dataset.sort(sortKeys);

        return new SparkDatasetTable(sorted);
    }
}
