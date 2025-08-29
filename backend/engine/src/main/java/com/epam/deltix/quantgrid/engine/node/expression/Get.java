package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.DatasetUtil;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public class Get extends ExpressionWithPlan<Table, Column> {

    @Getter
    private final int column;

    public Get(Plan table, int column) {
        super(table);
        this.column = column;
    }

    public Expression getExpression(SelectLocal select) {
        Util.verify(select == plan());
        return select.getExpression(column);
    }

    @Override
    public ColumnType getType() {
        return plan().getMeta().getSchema().getType(column);
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    protected Column evaluate(Table table) {
        return Util.throwIfError(table.getColumn(column));
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        Value execute = plan().execute();
        if (execute instanceof SparkValue table) {
            Dataset<Row> dataset = table.getDataset();
            String name = dataset.columns()[column];

            // getting a column from a dataset handles possible column name ambiguity, e.g. in a join
            return DatasetUtil.escapedCol(dataset, name);
        } else {
            throw new IllegalStateException(
                    "%s has not a SparkValue as an input: %s"
                            .formatted(this, execute.getClass().getSimpleName()));
        }

    }
}