package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Concatenate;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.PivotByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.FieldsReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn.PIVOT_NAME;
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

@UtilityClass
public class CompilePivot {

    private final List<ResultValidator<CompiledTable>> VALIDATORS = List.of(
            TableValidators.NESTED, TableValidators.NESTED, TableValidators.NESTED);

    private final EnumSet<AggregateType> AGGREGATIONS = EnumSet.of(
            COUNT, FIRST, LAST, SINGLE, SUM, AVERAGE, MIN, MAX, STDEVP, STDEVS, GEOMEAN, MEDIAN,
            CORREL, MODE, INDEX, MINBY, MAXBY, PERIODSERIES, PERCENTILE, PERCENTILE_EXC, QUARTILE, QUARTILE_EXC
    );

    public FieldKey pivotKey(String table) {
        return new FieldKey(table, PIVOT_NAME);
    }

    public ParsedFields pivotParsedField(FieldKey key) {
        ParsedField field = ParsedField.builder()
                .name(new ParsedText(null, key.fieldName()))
                .decorators(List.of())
                .build();

        FieldReference formula = new FieldReference(new CurrentField(PIVOT_NAME), key.fieldName());
        return new ParsedFields(null, List.of(field), formula);
    }

    public CompiledPivotTable compile(CompileContext context) {
        ArrayList<ResultValidator<CompiledTable>> validators = new ArrayList<>();
        IntArrayList indices = new IntArrayList();

        for (int i = 0; i < 3; i++) {
            if (context.hasArgument(i)) {
                validators.add(VALIDATORS.get(i));
                indices.add(i);
            }
        }

        List<CompiledTable> args = CompileFunction.compileArgs(context, validators, indices.toIntArray());
        CompileUtil.verify(!args.isEmpty(),
                "PIVOT function requires at least 1st or 2nd or 3rd argument to be specified");

        AggregateType aggregation = getAggregation(context);

        int arg = 0;
        List<CompiledColumn> rows = context.hasArgument(0)
                ? getColumns("rows", context, args.get(arg++), NestedColumnValidators.STRING_OR_DOUBLE)
                : List.of();

        List<CompiledColumn> cols = context.hasArgument(1)
                ? getColumns("columns", context, args.get(arg++), NestedColumnValidators.STRING)
                : List.of();

        List<CompiledColumn> vals = context.hasArgument(2)
                ? getColumns("values", context, args.get(arg++), valueValidators(aggregation))
                : List.of();

        return compilePivot(context, rows, cols, vals, aggregation);
    }

    private AggregateType getAggregation(CompileContext context) {
        if (!context.hasArgument(2)) {
            CompileUtil.verify(!context.hasArgument(3),
                    "PIVOT function requires 3rd argument when 4th argument is specified");
            return null;
        }

        if (!context.hasArgument(3)) {
            return SINGLE;
        }

        try {
            String function = context.constStringArgument(3);
            AggregateType aggregation = AggregateType.valueOf(function);
            CompileUtil.verify(AGGREGATIONS.contains(aggregation));
            return aggregation;
        } catch (Throwable e) {
            throw new CompileError("Expected aggregation function. One of: " + AGGREGATIONS.stream()
                    .map(type -> "\"" + type.name() + "\"").collect(Collectors.joining(", ")));
        }
    }

    private CompiledPivotTable compilePivot(CompileContext context,
                                            List<CompiledColumn> rows, List<CompiledColumn> cols,
                                            List<CompiledColumn> vals, AggregateType aggregation) {
        Plan names = null;
        List<Expression> all = new ArrayList<>();
        all.addAll(rows.stream().map(CompiledColumn::expression).toList());

        if (!cols.isEmpty()) {
            Expression col = concat(cols);
            names = compileNames(col);
            all.add(col);
        }

        all.addAll(vals.stream().map(CompiledColumn::expression).toList());

        SelectLocal source = new SelectLocal(all);
        List<Expression> aggKeys = columns(source, 0, all.size() - vals.size()); // rows + col
        List<Expression> aggVals = columns(source, all.size() - vals.size(), all.size()); // vals

        Plan result = new AggregateByLocal(source, aggKeys, aggregation == null ? List.of()
                : List.of(new AggregateByLocal.Aggregation(aggregation, aggVals)));

        ColumnType type = null;
        ColumnFormat format = null;

        if (aggregation != null) {
            type = result.getMeta().getSchema().getType(all.size() - vals.size());
            format = FormatResolver.resolveAggregationFormat(aggregation,
                    vals.stream().map(CompiledColumn::format).toList());
        } else if (!cols.isEmpty()) {
            type = ColumnType.DOUBLE;
            format = GeneralFormat.INSTANCE;
        }

        if (!cols.isEmpty()) {
            result = new PivotByLocal(result,
                    columns(result, 0, rows.size()),
                    columns(result, rows.size(), rows.size() + (aggregation == null ? 1 : 2)),
                    names,
                    column(names, 0),
                    type);
        }

        if (!rows.isEmpty()) {
            result = new OrderByLocal(result, columns(result, 0, rows.size()), Util.boolArray(rows.size(), true));
        }

        Set<String> naming = new HashSet<>();
        List<CompiledPivotTable.Key> keys = keys(context, rows, naming);
        String name = value(context, cols, vals, naming);

        return new CompiledPivotTable(names, result, keys, name, format, type);
    }

    private Plan compileNames(Expression column) {
        SelectLocal source = new SelectLocal(column);
        DistinctByLocal unique = new DistinctByLocal(source, List.of(column(source, 0)));
        return new OrderByLocal(unique, List.of(column(unique, 0)), Util.boolArray(1, true));
    }

    private List<CompiledColumn> getColumns(String name, CompileContext context, CompiledTable table,
                                            ResultValidator<CompiledNestedColumn> validator) {
        verify(name, table);

        if (table instanceof CompiledNestedColumn column) {
            return List.of(validator.convert(column));
        }

        return table.fields(context).stream()
                .map(field -> table.field(context, field))
                .map(validator::convert)
                .map(column -> (CompiledColumn) column)
                .toList();
    }

    private void verify(String name, CompiledTable table) {
        CompileUtil.verify(!table.reference(),
                "Argument: %s is invalid. Expected table or array. Example: Table[Column] or Table[[Column1], [Column2]]",
                name);
        CompileUtil.verify(table.dimensions().isEmpty(), "Argument: %s has dependency on columns: %s",
                name, table.dimensions());
    }

    private List<CompiledColumn> getColumns(String name, CompileContext context, CompiledTable table,
                                            List<ResultValidator<CompiledNestedColumn>> validators) {
        verify(name, table);
        List<CompiledResult> results = new ArrayList<>();

        if (table instanceof CompiledNestedColumn column) {
            results.add(column);
        } else {
            table.fields(context).stream()
                    .map(field -> table.field(context, field))
                    .forEach(results::add);
        }

        CompileUtil.verify(results.size() == validators.size(), "Size does not match");
        List<CompiledColumn> columns = new ArrayList<>();

        for (int i = 0; i < results.size(); i++) {
            CompiledResult result = results.get(i);
            ResultValidator<CompiledNestedColumn> validator = validators.get(i);
            CompiledNestedColumn column = validator.convert(result);
            columns.add(column);
        }

        return columns;
    }

    private List<ResultValidator<CompiledNestedColumn>> valueValidators(AggregateType type) {
        return switch (type) {
            case COUNT, FIRST, LAST, SINGLE -> List.of(NestedColumnValidators.ANY);
            case SUM, AVERAGE, MIN, MAX, STDEVP, STDEVS, GEOMEAN, MEDIAN -> List.of(NestedColumnValidators.DOUBLE);
            case CORREL, PERCENTILE, PERCENTILE_EXC, QUARTILE, QUARTILE_EXC ->
                    List.of(NestedColumnValidators.DOUBLE, NestedColumnValidators.DOUBLE);
            case MODE -> List.of(NestedColumnValidators.STRING_OR_DOUBLE, NestedColumnValidators.STRING_OR_DOUBLE);
            case INDEX, MINBY, MAXBY -> List.of(NestedColumnValidators.ANY, NestedColumnValidators.DOUBLE);
            case PERIODSERIES -> List.of(NestedColumnValidators.DOUBLE, NestedColumnValidators.DOUBLE,
                    NestedColumnValidators.STRING);
            case COUNT_ALL, FIRSTS, LASTS ->
                    throw new IllegalArgumentException("Unsupported aggregation type: " + type);
        };
    }

    private Expression concat(List<CompiledColumn> columns) {
        if (columns.size() == 1) {
            return columns.get(0).expression();
        }

        List<Expression> expressions = new ArrayList<>();

        for (int i = 0; i < columns.size(); i++) {
            CompiledColumn column = columns.get(i);
            Expression expression = column.expression();

            if (i > 0) {
                expressions.add(new Expand(expression.getLayout(), new Constant(" & ")));
            }

            expressions.add(expression);
        }

        return new Concatenate(expressions);
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

    private List<CompiledPivotTable.Key> keys(CompileContext context, List<CompiledColumn> rows, Set<String> names) {
        if (rows.isEmpty()) {
            return List.of();
        }

        Formula formula = context.argument(0);
        List<CompiledPivotTable.Key> keys = new ArrayList<>();

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
            for (int j = 1; !names.add(name); j++) {
                name = base + j;
            }

            ColumnFormat format = rows.get(i).format();
            keys.add(new CompiledPivotTable.Key(name, format));
        }

        return keys;
    }

    private String value(CompileContext context,
                         List<CompiledColumn> cols, List<CompiledColumn> vals,
                         Set<String> names) {
        if (!cols.isEmpty()) {
            return PIVOT_NAME;
        }

        if (vals.isEmpty()) {
            return null;
        }

        Formula formula = context.argument(2);
        String name;

        if (formula instanceof FieldReference field) {
            name = field.field();
        } else {
            name = "value";
        }

        String base = name;
        for (int i = 1; !names.add(name); i++) {
            name = base + i;
        }

        return name;
    }
}
