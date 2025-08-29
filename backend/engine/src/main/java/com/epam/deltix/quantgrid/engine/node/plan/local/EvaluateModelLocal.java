package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.List;

@Getter
public class EvaluateModelLocal extends PlanN<Table, Table> {
    private final @NotSemantic List<String> models;

    public EvaluateModelLocal(List<Plan.Source> sources, List<String> models) {
        super(sources);
        this.models = models;
    }

    @Override
    protected Plan layout() {
        return plan(0);
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.STRING));
    }

    @Override
    protected Table execute(List<Table> tables) {
        tables.remove(0);

        String bestModel = "";
        double bestScore = -1;

        for (int i = 0; i < models.size(); ++i) {
            DoubleColumn scoreColumn = expression(i + 1, 0).evaluate();
            double avgScore = 0;

            for (int j = 0; j < scoreColumn.size(); ++j) {
                avgScore += scoreColumn.get(j);
            }

            if (scoreColumn.size() == 0) {
                avgScore = 1;
            } else {
                avgScore /= scoreColumn.size();
            }

            if (avgScore > bestScore) {
                bestScore = avgScore;
                bestModel = models.get(i);
            }
        }

        return new LocalTable(new StringDirectColumn(bestModel));
    }

    @Override
    public String toString() {
        return "EvaluateModel()";
    }
}
