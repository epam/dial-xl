package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.evaluation.EvaluationUtils;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
public class RecallLocal extends Plan2<Table, Table, Table> {
    public RecallLocal(Plan layout, Plan plan, Expression groundTruth, Expression data, Expression refs) {
        super(sourceOf(layout), sourceOf(plan, List.of(groundTruth, data, refs)));
    }

    public RecallLocal(Plan layout, Plan plan, Expression groundTruth, Expression data) {
        super(sourceOf(layout), sourceOf(plan, List.of(groundTruth, data)));
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE));
    }

    @Override
    public Table execute(Table layout, Table a) {
        List<Expression> expressions = source(1).expressions();

        StringColumn data = expressions.get(1).evaluate();
        DoubleColumn refs = expressions.size() == 3 ? expressions.get(2).evaluate()
                : new DoubleLambdaColumn((i) -> 0, data.size());
        StringColumn rowGroundTruthColumn = expressions.get(0).evaluate();

        double[] recalls = new double[(int) layout.size()];
        int j = 0;
        for (int i = 0; i < layout.size(); ++i) {
            String rowGroundTruth = rowGroundTruthColumn.get(i * (rowGroundTruthColumn.size() / layout.size()));
            List<String> groundTruth = EvaluationUtils.parseGroundTruth(rowGroundTruth);

            if (groundTruth.isEmpty()) {
                recalls[i] = 1;
                continue;
            }

            Set<String> groundTruthSet = new HashSet<>(groundTruth);

            int founded = 0;
            while (j < data.size() && refs.get(j) < i) {
                ++j;
            }
            while (j < data.size() && refs.get(j) == i) {
                if (groundTruthSet.contains(data.get(j))) {
                    ++founded;
                    groundTruthSet.remove(data.get(j));
                }

                ++j;
            }

            recalls[i] = founded / (double) groundTruth.size();
        }

        return new LocalTable(new DoubleDirectColumn(recalls));
    }

    @Override
    public String toString() {
        return "Recall()";
    }
}
