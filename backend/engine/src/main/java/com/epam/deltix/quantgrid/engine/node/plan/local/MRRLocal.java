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
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
public class MRRLocal extends Plan2<Table, Table, Table> {
    public MRRLocal(Plan retriever, Expression refs, Expression data, Plan groundTruth, Expression groundTruthData) {
        super(sourceOf(retriever, List.of(refs, data)), sourceOf(groundTruth, groundTruthData));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE, ColumnType.DOUBLE));
    }

    @Override
    public Table execute(Table retriever, Table groundTruthTable) {
        DoubleColumn refs = source(0).expressions().get(0).evaluate();
        StringColumn data = source(0).expressions().get(1).evaluate();
        StringColumn rowGroundTruthColumn = source(1).expressions().get(0).evaluate();

        int dataIndex = 0;
        double[] mrrs = new double[(int) rowGroundTruthColumn.size()];
        double[] resultRefs = new double[(int) rowGroundTruthColumn.size()];
        for (int rowId = 0; rowId < rowGroundTruthColumn.size(); ++rowId) {
            resultRefs[rowId] = rowId;

            while (dataIndex < refs.size() && refs.get(dataIndex) < rowId) {
                ++dataIndex;
            }

            String rowGroundTruth = rowGroundTruthColumn.get(rowId);
            List<String> groundTruth = EvaluationUtils.parseGroundTruth(rowGroundTruth);

            if (groundTruth.isEmpty()) {
                mrrs[rowId] = 1;
                continue;
            }

            Set<String> groundTruthSet = new HashSet<>(groundTruth);

            double mrr = 0;
            int groundTruthCount = groundTruthSet.size();
            for (int j = 0; j < data.size(); ++j) {
                if (groundTruthSet.contains(data.get(j))) {
                    mrr += 1 / (double) (j + 1);
                    groundTruthSet.remove(data.get(j));
                }
            }

            mrrs[rowId] = mrr / groundTruthCount;
        }

        return new LocalTable(new DoubleDirectColumn(resultRefs), new DoubleDirectColumn(mrrs));
    }

    @Override
    public String toString() {
        return "MRR()";
    }
}
