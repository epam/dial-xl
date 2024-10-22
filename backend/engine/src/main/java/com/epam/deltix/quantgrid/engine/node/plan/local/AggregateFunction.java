package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import lombok.experimental.UtilityClass;

import java.util.EnumSet;
import java.util.Set;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum AggregateFunction {

    COUNT(SchemaHelper.INTEGER, 1, false),
    COUNT_ALL(SchemaHelper.INTEGER, 1, false),
    SUM(SchemaHelper.DOUBLE_OR_INTEGER, 1, false),
    AVERAGE(SchemaHelper.DOUBLE, 1, false),
    MIN(SchemaHelper.INFERRED, 1, false),
    MAX(SchemaHelper.INFERRED, 1, false),
    STDEVS(SchemaHelper.DOUBLE, 1, false),
    STDEVP(SchemaHelper.DOUBLE, 1, false),
    GEOMEAN(SchemaHelper.DOUBLE, 1, false),
    MEDIAN(SchemaHelper.DOUBLE, 1, false),
    MODE(SchemaHelper.INFERRED, 1, false),
    CORRELATION(SchemaHelper.DOUBLE, 2, false),
    FIRST(SchemaHelper.INPUT, 0, false),
    LAST(SchemaHelper.INPUT, 0, false),
    SINGLE(SchemaHelper.INPUT, 0, false),
    INDEX(SchemaHelper.INPUT, 1, false),
    MINBY(SchemaHelper.INPUT, 1, false),
    MAXBY(SchemaHelper.INPUT, 1, false),
    FIRSTS(SchemaHelper.INPUT, 1, true),
    LASTS(SchemaHelper.INPUT, 1, true),
    PERIOD_SERIES(SchemaHelper.PERIOD_SERIES, 3, false);

    private final SchemaFunction schemaFunction;
    private final int argumentCount; // the number of expressions/columns for function
    private final boolean resultNested; // true if the result is nested, in this case aggregation node is layout

    public Schema schema(Plan plan, int sourceIndex, int argumentOffset) {
        return schemaFunction.apply(plan, sourceIndex, argumentOffset);
    }

    @UtilityClass
    private class SchemaHelper {
        private final Set<ColumnType> INTEGER_SET = EnumSet.of(ColumnType.INTEGER, ColumnType.BOOLEAN);

        public final SchemaFunction DOUBLE = (plan, source, argument) -> Schema.of(ColumnType.DOUBLE);
        public final SchemaFunction DOUBLE_OR_INTEGER = (plan, source, argument) ->
                INTEGER_SET.contains(plan.expression(source, argument).getType())
                        ? Schema.of(ColumnType.INTEGER)
                        : Schema.of(ColumnType.DOUBLE);
        public final SchemaFunction INFERRED = (plan, source, offset) ->
                Schema.of(plan.expression(source, offset).getType());
        public final SchemaFunction INPUT = (plan, source, argument) -> Schema.inputs(plan, source);
        public final SchemaFunction INTEGER = (plan, source, argument) -> Schema.of(ColumnType.INTEGER);
        public final SchemaFunction PERIOD_SERIES = (plan, source, argument) -> Schema.of(ColumnType.PERIOD_SERIES);
    }

    @FunctionalInterface
    public interface SchemaFunction {
        Schema apply(Plan plan, int sourceIndex, int argumentOffset);
    }
}
