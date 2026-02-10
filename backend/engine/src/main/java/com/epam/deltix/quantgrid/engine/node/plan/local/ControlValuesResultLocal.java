package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

import java.util.List;

@Getter
public class ControlValuesResultLocal extends Plan0<Table> implements ResultPlan {

    private final FieldKey key;
    @NotSemantic
    private final ResultType type;
    private final long startRow;
    private final long endRow;
    private final long computationId;

    public ControlValuesResultLocal(Expression value, Expression available,
                                    FieldKey key, ResultType type,
                                    long startRow, long endRow,
                                    long computationId) {
        super(List.of(value, available));
        this.key = key;
        this.type = type;
        this.startRow = startRow;
        this.endRow = endRow;
        this.computationId = computationId;
    }

    @Override
    public FieldKey getKey() {
        return key;
    }

    @Override
    public long getComputationId() {
        return computationId;
    }

    @Override
    public ComputationType getComputationType() {
        return ComputationType.REQUIRED;
    }

    @Override
    protected Plan layout() {
        return getExpression(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(getExpression(0).getType(), ColumnType.DOUBLE));
    }

    @Override
    public Table execute() {
        Column value = getExpression(0).evaluate();
        Column available = (getExpressionCount() == 1)
                ? new DoubleLambdaColumn(index -> 1, value.size())
                : getExpression(1).evaluate();

        return new LocalTable(value, available);
    }

    @Override
    public String toString() {
        return "ControlResult(%s[%s], %s-%s)(#%s)".formatted(key.tableName(), key.fieldName(),
                startRow, endRow, computationId);
    }
}
