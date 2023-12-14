package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.DatasetUtil;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDatasetTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.hadoop.shaded.com.google.common.collect.Streams;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;

import java.util.List;

public class JoinAllSpark extends Plan2<SparkValue, SparkValue, SparkDatasetTable> {
    private final JoinType joinType;

    public JoinAllSpark(Plan left, List<Expression> leftKeys,
                        Plan right, List<Expression> rightKeys) {
        this(left, leftKeys, right, rightKeys, JoinType.INNER);
    }

    public JoinAllSpark(Plan left, List<Expression> leftKeys,
                        Plan right, List<Expression> rightKeys,
                        JoinType joinType) {
        super(sourceOf(left, leftKeys), sourceOf(right, rightKeys));
        verifyJoinKeys(leftKeys, rightKeys);
        this.joinType = joinType;
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
    protected SparkDatasetTable execute(SparkValue leftValue, SparkValue rightValue) {
        List<Expression> leftKeys = expressions(0);
        List<Expression> rightKeys = expressions(1);

        Column joinCondition = Streams
                .zip(leftKeys.stream(), rightKeys.stream(), (l, r) -> l.toSpark().equalTo(r.toSpark()))
                .reduce(Column::and)
                .get(); // safe: verifyJoinKeys in the constructor

        Dataset<Row> left = leftValue.getDataset();
        Dataset<Row> right = rightValue.getDataset();
        String[] uniqueNames = DatasetUtil.concatWithSuffix(left.columns(), right.columns());
        Dataset<Row> join = left.join(right, joinCondition, joinType.name()).toDF(uniqueNames);

        if (joinType == JoinType.LEFT) {
            // doubles in the right part might be null
            join = fillNaN(join, left.schema().size(), join.schema().size());
        }

        return new SparkDatasetTable(join);
    }

    /**
     * Accepts dataset and a range of its fields that might contain DoubleType columns with null values.
     * null values should be replaced with NaN to follow in-memory convention.
     */
    private static Dataset<Row> fillNaN(Dataset<Row> dataset, int from, int to) {
        boolean isDatasetModified = false;
        StructField[] fields = dataset.schema().fields();
        Column[] newColumns = new Column[fields.length];

        for (int i = 0; i < fields.length; i++) {
            StructField field = fields[i];
            Column col = dataset.col(field.name());

            if ((from <= i && i < to) && field.dataType() == DataTypes.DoubleType) {
                newColumns[i] = functions.coalesce(col, functions.lit(Double.NaN)).as(field.name());
                isDatasetModified = true;
            } else {
                newColumns[i] = col;
            }
        }

        if (!isDatasetModified) {
            return dataset;
        } else {
            return dataset.select(newColumns);
        }
    }

    private static void verifyJoinKeys(List<Expression> leftKeys, List<Expression> rightKeys) {
        Util.verify(leftKeys.size() == rightKeys.size(), "Number of join columns doesn't match");
        Util.verify(!leftKeys.isEmpty(), "Number of join keys cannot be 0");
    }

    public enum JoinType {
        INNER, LEFT
    }
}
