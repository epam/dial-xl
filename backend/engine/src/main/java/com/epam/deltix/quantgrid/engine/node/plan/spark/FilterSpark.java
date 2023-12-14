package com.epam.deltix.quantgrid.engine.node.plan.spark;

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

public class FilterSpark extends Plan1<SparkValue, SparkValue> {

    public FilterSpark(Plan input, Expression condition) {
        super(input, List.of(condition));
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
        Expression condition = expression(0);
        Column conditionColumn = condition.toSpark();
        Dataset<Row> filtered = dataset.filter(conditionColumn);
        return new SparkDatasetTable(filtered);
    }
}
