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
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Getter
public class ViewportLocal extends Plan0<Table> implements ResultPlan {

    private final long computationId;
    private final ComputationType computationType;

    private final ParsedKey key;
    private final long startRow;
    private final long endRow;
    private final long startCol;
    private final long endCol;
    private final boolean content;
    private final boolean raw;

    @NotSemantic
    @Nullable
    private final ResultType resultType;

    public ViewportLocal(Expression source,
                         @Nullable ResultType resultType, ParsedKey key,
                         long startRow, long endRow,
                         long startCol, long endCol,
                         boolean content,
                         boolean raw, long computationId, ComputationType computationType) {
        super(List.of(source));
        this.computationId = computationId;
        this.key = key;
        this.computationType = computationType;
        this.resultType = resultType;
        this.startRow = startRow;
        this.endRow = endRow;
        this.startCol = startCol;
        this.endCol = endCol;
        this.content = content;
        this.raw = raw;
    }

    public Expression getSource() {
        return getExpression(0);
    }

    @Override
    protected Plan layout() {
        return getSource().getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(expression(0).getType()));
    }

    @Override
    public Table execute() {
        Expression expression = expression(0);
        Column result = expression.evaluate();
        return new LocalTable(result);
    }

    @Override
    public String toString() {
        return "Viewport(%s)(%s)(%d-%d)(%d-%d)%s(%s)(#%s)".formatted(
                key, computationType, startRow, endRow,
                startCol, endCol, content ? "(*)" : "", raw ? "U" : "F", computationId);
    }
}
