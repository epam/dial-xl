package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledGroupTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.FieldsReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.AVERAGE;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.CORREL;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.COUNT;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.FIRST;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.GEOMEAN;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.INDEX;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.LAST;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MAX;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MAXBY;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MEDIAN;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MIN;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MINBY;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.MODE;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.PERCENTILE;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.PERCENTILE_EXC;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.PERIODSERIES;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.QUARTILE;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.QUARTILE_EXC;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.SINGLE;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.STDEVP;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.STDEVS;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.SUM;
import static com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType.TEXTJOIN;

@UtilityClass
class CompileGroupBy {

    private final List<ResultValidator<? extends CompiledResult>> VALIDATORS = List.of(
            TableValidators.NESTED, TableValidators.NESTED, TableValidators.NESTED, NestedColumnValidators.DOUBLE);

    private final EnumSet<AggregateType> AGGREGATIONS = EnumSet.of(
            COUNT, FIRST, LAST, SINGLE, SUM, AVERAGE, MIN, MAX, STDEVP, STDEVS, GEOMEAN, MEDIAN,
            CORREL, MODE, INDEX, MINBY, MAXBY, PERIODSERIES, PERCENTILE, PERCENTILE_EXC, QUARTILE, QUARTILE_EXC,
            TEXTJOIN
    );

    @SuppressWarnings("unchecked")
    CompiledGroupTable compile(CompileContext context) {
        CompileUtil.verify(context.hasArgument(0) || context.hasArgument(1),
                "GROUPBY function requires at least 1st or 2nd argument to be specified");

        ArrayList<ResultValidator<CompiledResult>> validators = new ArrayList<>();
        IntArrayList indices = new IntArrayList();

        for (int i = 0; i < 4; i++) {
            if (i != 2 && context.hasArgument(i)) {
                ResultValidator validator = VALIDATORS.get(i);
                validators.add(validator);
                indices.add(i);
            }
        }

        List<CompiledResult> args = CompileFunction.compileArgs(context, validators, indices.toIntArray());
        CompileUtil.verify(!args.isEmpty(), "GROUPBY function requires at least 1st or 2nd argument to be specified");

        int arg = 0;

        List<CompiledColumn> rows = List.of();
        if (context.hasArgument(0)) {
            rows = getColumns("rows", context, args.get(arg++));
        }

        List<CompiledColumn> vals = List.of();
        if (context.hasArgument(1)) {
            vals = getColumns("values", context, args.get(arg++));
        }

        List<AggregateType> types = getAggregations(context);
        CompiledColumn filter = context.hasArgument(3) ? args.get(arg++).cast(CompiledColumn.class) : null;

        if (types.size() == 1) {
            AggregateType type = types.get(0);
            int count = valueValidators(type).size();

            if (vals.size() > count && vals.size() % count == 0) {  // autofill aggregation functions
                int repetitions = vals.size() / count;
                types = Collections.nCopies(repetitions, type);
            }
        } else if (types.size() > 1) {
            AggregateType first = types.get(0);
            int count = valueValidators(first).size();

            for (AggregateType type : types) {
                int argCount = valueValidators(type).size();

                if (count != argCount) {
                    count = -1;
                    break;
                }
            }

            if (vals.size() == count) {  // autofill aggregation arguments
                int repetitions = types.size();
                vals = Collections.nCopies(repetitions, vals).stream().flatMap(Collection::stream).toList();
            }
        }

        List<ResultValidator<CompiledNestedColumn>> valueValidators = valueValidators(types);
        CompileUtil.verify(vals.size() == valueValidators.size(),
                "The number of provided columns: " + vals.size()
                        + " do not match with the expected number for aggregations: " + valueValidators.size());

        rows = convertColumns(rows, NestedColumnValidators.STRING_OR_DOUBLE);
        vals = convertColumns(vals, valueValidators);

        return compile(context, rows, vals, types, filter);
    }

    private CompiledGroupTable compile(CompileContext context, List<CompiledColumn> rows,
                                       List<CompiledColumn> vals, List<AggregateType> types,
                                       CompiledColumn filter) {

        List<Expression> all = new ArrayList<>();
        all.addAll(rows.stream().map(CompiledColumn::expression).toList());
        all.addAll(vals.stream().map(CompiledColumn::expression).toList());

        Plan result = new SelectLocal(all);
        if (filter != null) {
            result = new FilterLocal(result, filter.expression());
        }

        List<Expression> aggKeys = columns(result, 0, rows.size());
        List<Expression> aggVals = columns(result, rows.size(), all.size());

        List<ColumnFormat> formats = new ArrayList<>();
        List<AggregateByLocal.Aggregation> aggs = new ArrayList<>();

        int argStart = 0;
        for (AggregateType type : types) {
            int argEnd = argStart + valueValidators(type).size();
            List<Expression> args = aggVals.subList(argStart, argEnd);

            AggregateByLocal.Aggregation agg = new AggregateByLocal.Aggregation(type, args);
            aggs.add(agg);

            ColumnFormat format = FormatResolver.resolveAggregationFormat(type,
                    vals.subList(argStart, argEnd).stream().map(CompiledColumn::format).toList());
            formats.add(format);

            argStart = argEnd;
        }

        result = new AggregateByLocal(result, aggKeys, aggs);

        if (!rows.isEmpty()) {
            result = new OrderByLocal(result, columns(result, 0, rows.size()), Util.boolArray(rows.size(), true));
        }

        LinkedHashMap<String, ColumnFormat> columns = new LinkedHashMap<>();
        nameKeys(context, rows, columns);
        nameValues(types, formats, columns);
        return new CompiledGroupTable(result, columns, rows.size());
    }

    private List<CompiledColumn> getColumns(String name, CompileContext context, CompiledResult result) {
        CompiledTable table = result.cast(CompiledTable.class);
        verifyArgument(name, table);

        if (table instanceof CompiledNestedColumn column) {
            return List.of(column);
        }

        return table.fields(context).stream()
                .map(field -> table.field(context, field))
                .map(NestedColumnValidators.ANY::convert)
                .map(column -> (CompiledColumn) column)
                .toList();
    }

    private List<CompiledColumn> convertColumns(List<CompiledColumn> columns,
                                                ResultValidator<CompiledNestedColumn> converter) {
        return convertColumns(columns, Collections.nCopies(columns.size(), converter));
    }

    private List<CompiledColumn> convertColumns(List<CompiledColumn> columns,
                                                List<ResultValidator<CompiledNestedColumn>> converters) {
        return IntStream.range(0, columns.size())
                .mapToObj(i -> {
                    CompiledColumn column = columns.get(i);
                    ResultValidator<CompiledNestedColumn> converter = converters.get(i);
                    column = converter.convert(column);
                    return column;
                }).toList();
    }

    private void verifyArgument(String name, CompiledTable table) {
        CompileUtil.verify(!table.reference() && table.assignable(),
                "Argument: %s is invalid. Expected table or array. Example: Table[Column] or Table[[Column1], [Column2]]",
                name);
        CompileUtil.verify(table.dimensions().isEmpty(), "Argument: %s has dependency on columns: %s",
                name, table.dimensions());
    }

    private List<AggregateType> getAggregations(CompileContext context) {
        if (!context.hasArgument(1)) {
            CompileUtil.verify(!context.hasArgument(2),
                    "GROUPBY function requires 2rd argument when 3th argument is specified");
            return List.of();
        }

        if (!context.hasArgument(2)) {
            return List.of(SINGLE);
        }

        try {
            List<String> functions;

            try {
                functions = context.constStringListArgument(2);
            } catch (CompileError error) {
                functions = List.of(context.constStringArgument(2));
            }

            return functions.stream().map(function -> {
                AggregateType aggregation = AggregateType.valueOf(function);
                CompileUtil.verify(AGGREGATIONS.contains(aggregation));
                return aggregation;
            }).toList();
        } catch (Throwable e) {
            throw new CompileError("Expected one aggregation function or list of aggregation functions. Supported: "
                    + AGGREGATIONS.stream()
                    .map(type -> "\"" + type.name() + "\"").collect(Collectors.joining(", ")));
        }
    }

    private List<ResultValidator<CompiledNestedColumn>> valueValidators(List<AggregateType> types) {
        return types.stream().flatMap(type -> valueValidators(type).stream()).toList();
    }

    private List<ResultValidator<CompiledNestedColumn>> valueValidators(AggregateType type) {
        return switch (type) {
            case COUNT, FIRST, LAST, SINGLE -> List.of(NestedColumnValidators.ANY);
            case SUM, AVERAGE, STDEVP, STDEVS, GEOMEAN, MEDIAN -> List.of(NestedColumnValidators.DOUBLE);
            case CORREL, PERCENTILE, PERCENTILE_EXC, QUARTILE, QUARTILE_EXC ->
                    List.of(NestedColumnValidators.DOUBLE, NestedColumnValidators.DOUBLE);
            case MIN, MAX, MODE -> List.of(NestedColumnValidators.STRING_OR_DOUBLE);
            case INDEX, MINBY, MAXBY -> List.of(NestedColumnValidators.ANY, NestedColumnValidators.DOUBLE);
            case PERIODSERIES -> List.of(NestedColumnValidators.DOUBLE, NestedColumnValidators.DOUBLE,
                    NestedColumnValidators.STRING);
            case COUNT_ALL, FIRSTS, LASTS ->
                    throw new IllegalArgumentException("Unsupported aggregation type: " + type);
            case TEXTJOIN -> List.of(NestedColumnValidators.STRING, NestedColumnValidators.STRING);
        };
    }

    private List<Expression> columns(Plan plan, int from, int to) {
        List<Expression> columns = new ArrayList<>(to - from);

        for (int i = from; i < to; i++) {
            Get column = column(plan, i);
            columns.add(column);
        }

        return columns;
    }

    private Get column(Plan plan, int column) {
        return new Get(plan, column);
    }

    private void nameKeys(CompileContext context, List<CompiledColumn> rows,
                          LinkedHashMap<String, ColumnFormat> columns) {

        if (rows.isEmpty()) {
            return;
        }

        Formula formula = context.argument(0);

        for (int i = 0; i < rows.size(); i++) {
            String name;
            if (formula instanceof FieldReference field) {
                name = field.field();
            } else if (formula instanceof FieldsReference fields) {
                name = fields.fields().get(i);
            } else {
                name = (rows.size() == 1) ? "key" : ("key" + (i + 1));
            }

            String base = name;
            for (int j = 1; columns.containsKey(name); j++) {
                name = base + j;
            }

            ColumnFormat format = rows.get(i).format();
            columns.put(name, format);
        }
    }

    private void nameValues(List<AggregateType> types, List<ColumnFormat> formats,
                            LinkedHashMap<String, ColumnFormat> columns) {
        if (types.isEmpty()) {
            return;
        }

        for (int i = 0; i < types.size(); i++) {
            AggregateType type = types.get(i);
            String name = type.name();

            for (int j = 1; columns.containsKey(name); j++) {
                name = type.name() + j;
            }

            ColumnFormat format = formats.get(i);
            columns.put(name, format);
        }
    }
}