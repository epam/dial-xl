package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@Getter
public class ViewportLocal extends Plan0<Table> {

    private final ParsedKey key;
    private final long start;
    private final long end;
    private final boolean content;

    @NotSemantic
    @Nullable
    private final ResultType resultType;

    public ViewportLocal(Expression source, @Nullable ResultType resultType, ParsedKey key) {
        this(source, resultType, key, -1, -1, false);
    }

    public ViewportLocal(Expression source,
                         @Nullable ResultType resultType,
                         ParsedKey key,
                         long start,
                         long end,
                         boolean content) {
        super(List.of(source));
        this.key = key;
        this.resultType = resultType;
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
        return "Viewport(%s)(%d-%d)%s".formatted(key, start, end, content ? "(*)" : "");
    }
}
