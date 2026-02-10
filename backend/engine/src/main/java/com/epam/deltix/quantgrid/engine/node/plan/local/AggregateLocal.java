package com.epam.deltix.quantgrid.engine.node.plan.local;

import java.util.List;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

public class AggregateLocal extends Plan2<Table, Table, Table> {

    @Getter
    private final AggregateType type;
    private final boolean nested;

    public AggregateLocal(AggregateType type,
                          Plan layout, Plan source,
                          @Nullable Expression key, Expression... values) {
        this(type, layout, source, key, List.of(values));
    }

    public AggregateLocal(AggregateType type,
                          Plan layout, Plan source,
                          @Nullable Expression key, List<Expression> values) {
        super(sourceOf(layout), sourceOf(source, key == null ? values : Util.listOf(key, values)));
        this.type = type;
        this.nested = (key != null);
        Util.verify(values.size() == type.argumentCount());
    }

    public Plan getInputLayout() {
        return plan(0);
    }

    public Plan getSource() {
        return plan(1);
    }

    @Nullable
    public Expression getKey() {
        return nested ? expression(1, 0) : null;
    }

    public List<Expression> getValues() {
        return expressions(1, nested ? 1 : 0);
    }

    @Override
    protected Plan layout() {
        return type.resultNested() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(type.schema(this, 1, nested ? 1 : 0));
    }

    @Override
    protected Table execute(Table layout, Table table) {
        int size = Util.toIntSize(layout);
        Expression key = getKey();
        List<Expression> args = getValues();
        DoubleColumn keys = (key == null) ? null : key.evaluate();
        return aggregate(table, keys, args, size);
    }

    private Table aggregate(Table table, @Nullable DoubleColumn keys, List<Expression> arguments, int size) {
        List<Column> args = arguments.stream().map(expression -> (Column) expression.evaluate()).toList();
        AggregateFunction function = type.aggregateFunction();
        Object result = (keys == null)
                ? function.aggregate(table.size(), args)
                : function.aggregate(keys, args, size);

        if (result instanceof long[] references) {
            return LocalTable.indirectOf(table, references);
        }

        if (result instanceof double[] numbers) {
            return new LocalTable(new DoubleDirectColumn(numbers));
        }

        if (result instanceof String[] texts) {
            return new LocalTable(new StringDirectColumn(texts));
        }

        if (result instanceof PeriodSeries[] series) {
            return new LocalTable(new PeriodSeriesDirectColumn(series));
        }

        throw new IllegalArgumentException("Unsupported result: " + result.getClass());
    }
}