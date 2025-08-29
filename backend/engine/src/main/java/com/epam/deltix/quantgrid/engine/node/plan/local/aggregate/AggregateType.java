package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum AggregateType {
    COUNT(new Count(), SchemaFunction.DOUBLE, 1, false),
    COUNT_ALL(new CountAll(), SchemaFunction.DOUBLE, 1, false),
    SUM(new Sum(), SchemaFunction.DOUBLE, 1, false),
    AVERAGE(new Average(), SchemaFunction.DOUBLE, 1, false),
    MIN(new Min(), SchemaFunction.INFERRED, 1, false),
    MAX(new Max(), SchemaFunction.INFERRED, 1, false),
    STDEVS(new Stdev(true), SchemaFunction.DOUBLE, 1, false),
    STDEVP(new Stdev(false), SchemaFunction.DOUBLE, 1, false),
    GEOMEAN(new Geomean(), SchemaFunction.DOUBLE, 1, false),
    MEDIAN(new Median(), SchemaFunction.DOUBLE, 1, false),
    MODE(new Mode(), SchemaFunction.INFERRED, 1, false),
    CORREL(new Correl(), SchemaFunction.DOUBLE, 2, false),
    FIRST(new First(), SchemaFunction.INPUT, 0, false),
    LAST(new Last(), SchemaFunction.INPUT, 0, false),
    SINGLE(new Single(), SchemaFunction.INPUT, 0, false),
    INDEX(new Index(), SchemaFunction.INPUT, 1, false),
    MINBY(new MinBy(), SchemaFunction.INPUT, 1, false),
    MAXBY(new MaxBy(), SchemaFunction.INPUT, 1, false),
    FIRSTS(new Firsts(), SchemaFunction.INPUT, 1, true),
    LASTS(new Lasts(), SchemaFunction.INPUT, 1, true),
    PERIODSERIES(new PerSeries(), SchemaFunction.PERIOD_SERIES, 3, false),
    PERCENTILE(new Quantile(Quantile.Type.PERCENTILE_INC), SchemaFunction.DOUBLE, 2, false),
    PERCENTILE_EXC(new Quantile(Quantile.Type.PERCENTILE_EXC), SchemaFunction.DOUBLE, 2, false),
    QUARTILE(new Quantile(Quantile.Type.QUARTILE_INC), SchemaFunction.DOUBLE, 2, false),
    QUARTILE_EXC(new Quantile(Quantile.Type.QUARTILE_EXC), SchemaFunction.DOUBLE, 2, false);

    private final AggregateFunction aggregateFunction;
    private final SchemaFunction schemaFunction;
    private final int argumentCount; // the number of expressions/columns for function
    private final boolean resultNested; // true if the result is nested, in this case aggregation node is layout

    public Schema schema(Plan plan, int sourceIndex, int argumentOffset) {
        return schemaFunction.apply(plan, sourceIndex, argumentOffset);
    }

    @FunctionalInterface
    public interface SchemaFunction {
        SchemaFunction DOUBLE = (plan, source, argument) -> Schema.of(ColumnType.DOUBLE);
        SchemaFunction INFERRED = (plan, source, offset) ->
                Schema.of(plan.expression(source, offset).getType());
        SchemaFunction INPUT = (plan, source, argument) -> Schema.inputs(plan, source);
        SchemaFunction PERIOD_SERIES = (plan, source, argument) -> Schema.of(ColumnType.PERIOD_SERIES);

        Schema apply(Plan plan, int sourceIndex, int argumentOffset);
    }
}