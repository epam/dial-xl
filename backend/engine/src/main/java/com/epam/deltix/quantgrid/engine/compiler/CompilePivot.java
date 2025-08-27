package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
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
        AggregateType aggregation = getAggregation(context);
        List<CompiledTable> args = CompileFunction.compileArgs(context,
                List.of(TableValidators.NESTED, TableValidators.NESTED, TableValidators.NESTED));

        List<CompiledColumn> rows = getColumns("rows", context, args.get(0), NestedColumnValidators.STRING_OR_DOUBLE);
        List<CompiledColumn> cols = getColumns("columns", context, args.get(1), NestedColumnValidators.STRING);
        List<CompiledColumn> vals = getColumns("values", context, args.get(2), valueValidators(aggregation));

        return compilePivot(context, rows, cols, vals, aggregation);
    }

    private AggregateType getAggregation(CompileContext context) {
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
        Expression col = concat(cols);
        Plan names = compileNames(col);

        List<Expression> all = new ArrayList<>();
        all.addAll(rows.stream().map(CompiledColumn::expression).toList());
        all.add(col);
        all.addAll(vals.stream().map(CompiledColumn::expression).toList());

        SelectLocal source = new SelectLocal(all);
        int keys = rows.size();

        List<Expression> aggKeys = columns(source, 0, keys + 1);       // rows + col
        List<Expression> aggVals = columns(source, keys + 1, all.size()); // vals

        AggregateByLocal agg = new AggregateByLocal(source, aggKeys,
                List.of(new AggregateByLocal.Aggregation(aggregation, aggVals)));

        ColumnType type = agg.getMeta().getSchema().getType(keys + 1);
        ColumnFormat format = FormatResolver.resolveAggregationFormat(aggregation,
                vals.stream().map(CompiledColumn::format).toList());

        PivotByLocal pivot = new PivotByLocal(agg,
                columns(agg, 0, keys),            // rows
                columns(agg, keys, keys + 2),       // col + res
                names,
                column(names, 0),
                type);

        OrderByLocal sorted = new OrderByLocal(pivot, columns(pivot, 0, keys), Util.boolArray(keys, true));
        return new CompiledPivotTable(names, sorted, keys(context, rows), format, type);
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

    private List<CompiledPivotTable.Key> keys(CompileContext context, List<CompiledColumn> rows) {
        Formula formula = context.argument(0);
        List<CompiledPivotTable.Key> keys = new ArrayList<>();
        Set<String> names = new HashSet<>();

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
}
