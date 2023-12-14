package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Getter
public class ViewportLocal extends Plan0<Table> {

    private final String table;
    private final String field;
    private final long start;
    private final long end;
    private final boolean content;

    @NotSemantic
    @Nullable
    private final ResultType resultType;

    public ViewportLocal(Expression source,
                         @Nullable ResultType resultType,
                         String table,
                         String field) {
        this(source, resultType, table, field, -1, -1, false);
    }

    public ViewportLocal(Expression source,
                         @Nullable ResultType resultType,
                         String table,
                         String field,
                         long start,
                         long end,
                         boolean content) {
        super(List.of(source));
        this.resultType = resultType;
        this.table = table;
        this.field = field;
        this.start = start;
        this.end = end;
        this.content = content;
    }

    public boolean isOptional() {
        return start < 0 && end < 0;
    }

    public Expression getSource() {
        return getExpression(0);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(expression(0).getType()));
    }

    @Override
    public Table execute() {
        Expression expression = expression(0);
        Column column = expression.evaluate();

        long max = column.size();
        long offset = Math.min(start, max);
        long size = Math.min(end, max) - offset;

        Column result = viewport(column, offset, size);
        return new LocalTable(result);
    }

    private static Column viewport(Column column, long offset, long size) {
        if (column instanceof DoubleColumn doubles) {
            if (column.size() > 0) { // todo: need to revisit this bullshit for DoubleErrorColumn
                doubles.get(0);
            }

            return new DoubleLambdaColumn(index -> doubles.get(offset + index), size);
        }

        if (column instanceof StringColumn strings) {
            if (column.size() > 0) {
                strings.get(0);
            }

            return new StringLambdaColumn(index -> strings.get(offset + index), size);
        }

        if (column instanceof PeriodSeriesColumn series) {
            if (column.size() > 0) {
                series.get(0);
            }

            return new PeriodSeriesLambdaColumn(index -> series.get(offset + index), size);
        }

        throw new IllegalArgumentException();
    }

    @Override
    public String toString() {
        return "Viewport(%s[%s])(%d-%d)%s".formatted(table, field, start, end, content ? "(*)" : "");
    }
}
