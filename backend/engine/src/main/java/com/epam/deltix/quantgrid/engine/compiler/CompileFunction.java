package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledInputTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Abs;
import com.epam.deltix.quantgrid.engine.node.expression.Concatenate;
import com.epam.deltix.quantgrid.engine.node.expression.Date;
import com.epam.deltix.quantgrid.engine.node.expression.DateTimePart;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.If;
import com.epam.deltix.quantgrid.engine.node.expression.IsNa;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.expression.Substitute;
import com.epam.deltix.quantgrid.engine.node.expression.Substring;
import com.epam.deltix.quantgrid.engine.node.expression.SubstringFunction;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.expression.Value;
import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Fields;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedAggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimpleAggregateLocal;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalInputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@UtilityClass
public class CompileFunction {

    public CompiledResult compile(CompileContext context, Function function) {
        List<Formula> arguments = function.arguments();
        String name = function.name();

        return switch (name) {
            case "UnaryOperator" -> compileUnaryOperator(context, (UnaryOperator) function);
            case "BinaryOperator" -> compileBinaryOperator(context, (BinaryOperator) function);
            case "ROW" -> compileRow(context, arguments);
            case "PERIODSERIES" -> compilePeriodSeries(context, arguments);
            case "EXTRAPOLATE" -> compileExtrapolate(context, arguments);
            case "PERCENTCHANGE" -> compilePercentChange(context, arguments);
            case "RANGE" -> compileRange(context, arguments);
            case "FILTER" -> compileFilter(context, arguments);
            case "FIND" -> compileFind(context, arguments);
            case "DISTINCT" -> compileDistinct(context, arguments);
            case "DISTINCTBY" -> compileDistinctBy(context, arguments);
            case "ORDERBY" -> compileOrderBy(context, arguments);
            case "COUNT" -> compileCount(context, arguments);
            case "SUM", "AVERAGE", "MAX", "MIN" -> compileSumAvgMinMax(name, context, arguments);
            case "FIRST", "LAST", "SINGLE" -> (arguments.size() == 1)
                    ? compileFirstLastSingle(name, context, arguments)
                    : compileFirstsLasts(name, context, arguments);
            case "INPUT" -> compileInput(context, arguments);
            case "PIVOT" -> CompilePivot.compile(context, arguments);
            case "UNPIVOT" -> CompileUnpivot.compile(context, arguments);
            case "FIELDS" -> compileFields(context, arguments);
            case "DATE" -> compileDate(context, arguments);
            case "YEAR" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.YEAR);
            case "MONTH" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.MONTH);
            case "DAY" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.DAY);
            case "HOUR" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.HOUR);
            case "MINUTE" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.MINUTE);
            case "SECOND" -> compileDateTimePart(context, arguments, DateTimePart.DateTimePartFunction.SECOND);
            case "CONCAT", "CONCATENATE" -> compileConcatenate(context, arguments);
            case "TEXT" -> compileText(context, arguments);
            case "VALUE" -> compileValue(context, arguments);
            case "IF" -> compileIf(context, arguments);
            case "IFNA" -> compileIfNa(context, arguments);
            case "ISNA" -> compileIsNa(context, arguments);
            case "ABS" -> compileAbs(context, arguments);
            case "LEFT", "RIGHT", "MID" -> compileSubstring(name, context, arguments);
            case "SUBSTITUTE" -> compileSubstitute(context, arguments);
            case "MODE" -> compileMode(context, arguments);
            case "CORREL" -> compileCorrelation(context, arguments);
            default -> throw new CompileError("Unknown function: " + function.name());
        };
    }

    private CompiledColumn compileUnaryOperator(CompileContext context, UnaryOperator operator) {
        CompiledColumn argument = context.compile(operator.argument()).cast(CompiledColumn.class);
        CompileUtil.verify(argument.type().isDouble());
        Expression expression = new com.epam.deltix.quantgrid.engine.node.expression.UnaryOperator(
                argument.node(), operator.operation());
        return new CompiledColumn(expression, argument.dimensions());
    }

    private CompiledColumn compileBinaryOperator(CompileContext context, BinaryOperator operator) {
        List<CompiledColumn> args = compileExpressions(context, operator.arguments());
        CompiledColumn left = args.get(0);
        CompiledColumn right = args.get(1);

        CompileUtil.verify(ColumnType.isClose(left.type(), right.type())
                        && (left.type().isDouble() || left.type().isString()),
                "The operation %s cannot be applied to the incompatible types %s and %s",
                operator.operation(), left.type(), right.type());

        CompileUtil.verify(left.type().isDouble() || operator.operation().isAllowStrings(),
                "The operation %s cannot be applied to the STRING type", operator.operation());

        Expression expression = new com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator(
                left.node(), right.node(), operator.operation());

        return new CompiledColumn(expression, left.dimensions());
    }

    private CompiledColumn compileRow(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.isEmpty());
        CompileUtil.verify(context.table == null, "Not allowed to use within formula");
        CompiledTable table = context.layout();
        RowNumber row = new RowNumber(table.node());
        return new CompiledColumn(row, table.dimensions());
    }

    private CompiledResult compileRange(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1);
        CompiledColumn count = context.compile(arguments.get(0)).cast(CompiledColumn.class);

        CompileUtil.verify(count.dimensions().isEmpty());
        CompileUtil.verify(count.type().isDouble());

        RangeLocal range = new RangeLocal(count.node());
        return new CompiledNestedColumn(range, 0);
    }

    private CompiledResult compileFilter(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 2);
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        List<FieldKey> dimensions = context.collect(arguments.get(1));
        dimensions = context.combine(source.dimensions(), dimensions);
        source = context.promote(source, dimensions).cast(CompiledTable.class);

        CompileContext nested = context.with(source, false);
        CompiledColumn condition = nested.compile(arguments.get(1)).cast(CompiledColumn.class);
        CompileUtil.verify(condition.type().isDouble());

        condition = nested.promote(condition, dimensions).cast(CompiledColumn.class);
        FilterLocal filter = new FilterLocal(source.node(), condition.node());

        return source.withNode(filter);
    }

    private static CompiledResult compileFind(CompileContext context, List<Formula> arguments) {
        CompiledTable rightTable = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(rightTable.nested());
        CompileUtil.verify(rightTable.dimensions().isEmpty(), "FIND does not support source with current table yet");

        List<String> rightNames = rightTable.keys(context);
        CompileUtil.verify(!rightNames.isEmpty(), "Source should have keys");

        int keyCount = arguments.size() - 1;
        if (keyCount != rightNames.size()) {
            throw new CompileError("FIND expressions count %d does not match keys count %d (%s)"
                    .formatted(keyCount, rightNames.size(), rightNames));
        }

        List<Expression> rightKeys = new ArrayList<>(rightNames.size());
        rightTable = rightTable.withNested(false);

        for (String name : rightNames) {
            Expression key = rightTable.field(context, name).cast(CompiledColumn.class).node();
            rightKeys.add(key);
        }

        List<FieldKey> leftDims = List.of();
        for (int i = 1; i < arguments.size(); i++) {
            List<FieldKey> dims = context.collect(arguments.get(i));
            leftDims = context.combine(leftDims, dims);
        }

        List<Expression> leftKeys = new ArrayList<>();
        CompiledTable leftTable = context.currentTable(leftDims);
        CompileContext leftContext = context.with(leftTable, false);

        for (int i = 1; i < arguments.size(); i++) {
            CompiledColumn key = leftContext.compile(arguments.get(i)).cast(CompiledColumn.class);
            key = leftContext.promote(key, leftDims).cast(CompiledColumn.class);
            leftKeys.add(key.node());
        }

        JoinSingleLocal join = new JoinSingleLocal(leftTable.node(), rightTable.node(), leftKeys, rightKeys);
        int rightColumnsStart = leftTable.node().getMeta().getSchema().size();
        SelectLocal rightSelect = CompileUtil.selectColumns(join, rightColumnsStart);
        return rightTable.withNode(rightSelect).withDimensions(leftTable.dimensions());
    }

    private CompiledResult compileDistinct(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1);
        CompiledNestedColumn source = context.compile(arguments.get(0)).cast(CompiledNestedColumn.class);

        List<Expression> keys = new ArrayList<>();

        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }

        keys.add(source.flat().node());

        DistinctByLocal distinct = new DistinctByLocal(source.node(), keys);
        return source.withNode(distinct);
    }

    private CompiledResult compileDistinctBy(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() > 1);
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        List<FieldKey> dimensions = source.dimensions();
        for (int i = 1; i < arguments.size(); i++) {
            List<FieldKey> keyDimensions = context.collect(arguments.get(i));
            dimensions = context.combine(dimensions, keyDimensions);
        }

        source = context.promote(source, dimensions).cast(CompiledTable.class);

        CompileContext nested = context.with(source, false);
        List<Expression> keys = new ArrayList<>();

        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }

        for (int i = 1; i < arguments.size(); i++) {
            CompiledColumn key = nested.compile(arguments.get(i)).cast(CompiledColumn.class);
            key = nested.promote(key, dimensions).cast(CompiledColumn.class);
            keys.add(key.node());
        }

        DistinctByLocal distinct = new DistinctByLocal(source.node(), keys);
        return source.withNode(distinct);
    }

    private CompiledResult compileOrderBy(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() > 1);
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        List<FieldKey> dimensions = source.dimensions();
        for (int i = 1; i < arguments.size(); i++) {
            List<FieldKey> keyDimensions = context.collect(arguments.get(i));
            dimensions = context.combine(dimensions, keyDimensions);
        }

        source = context.promote(source, dimensions).cast(CompiledTable.class);

        CompileContext nested = context.with(source, false);
        List<Expression> keys = new ArrayList<>();

        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }

        for (int i = 1; i < arguments.size(); i++) {
            CompiledColumn key = nested.compile(arguments.get(i)).cast(CompiledColumn.class);
            key = nested.promote(key, dimensions).cast(CompiledColumn.class);
            keys.add(key.node());
        }

        boolean[] ascending = new boolean[keys.size()];
        Arrays.fill(ascending, true);

        OrderByLocal order = new OrderByLocal(source.node(), keys, ascending);
        return source.withNode(order);
    }

    private CompiledColumn compileCount(CompileContext context, List<Formula> arguments) {
        Util.verify(arguments.size() == 1);
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        return compileCount(context, source);
    }

    CompiledColumn compileCount(CompileContext context, CompiledTable source) {
        CompileUtil.verify(source.nested());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan aggregate;

        if (source.hasCurrentReference()) {
            SelectLocal select = new SelectLocal(source.currentReference());
            Get key = new Get(select, 0);
            aggregate = new NestedAggregateLocal(AggregateFunction.COUNT, layout, select, key);
        } else {
            aggregate = new SimpleAggregateLocal(AggregateFunction.COUNT, layout, source.node());
        }

        Get column = new Get(aggregate, 0);
        return new CompiledColumn(column, source.dimensions());
    }

    private CompiledResult compileSumAvgMinMax(String name, CompileContext context, List<Formula> arguments) {
        AggregateFunction function = AggregateFunction.valueOf(name);
        Util.verify(arguments.size() == 1);
        CompiledNestedColumn source = context.compile(arguments.get(0)).cast(CompiledNestedColumn.class);
        Util.verify(source.type().isDouble());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();

        Expression value = source.flat().node();
        Plan aggregate;

        if (source.hasCurrentReference()) {
            Get key = source.currentReference();
            aggregate = new NestedAggregateLocal(function, layout, plan, key, value);
        } else {
            aggregate = new SimpleAggregateLocal(function, layout, plan, value);
        }

        Get column = new Get(aggregate, 0);
        return new CompiledColumn(column, source.dimensions());
    }

    private CompiledResult compileFirstLastSingle(String name, CompileContext context, List<Formula> arguments) {
        AggregateFunction function = AggregateFunction.valueOf(name);
        CompileUtil.verify(arguments.size() == 1);
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();
        Plan aggregate;

        if (source.hasCurrentReference()) {
            Expression key = source.currentReference();
            aggregate = new NestedAggregateLocal(function, layout, plan, key);
        } else {
            aggregate = new SimpleAggregateLocal(function, layout, plan);
        }

        return source.withNode(aggregate).flat();
    }

    private CompiledResult compileFirstsLasts(String name, CompileContext context, List<Formula> arguments) {
        AggregateFunction function = switch (name) {
            case "FIRST" -> AggregateFunction.FIRSTS;
            case "LAST" -> AggregateFunction.LASTS;
            default -> throw new CompileError(name + " function takes invalid number of arguments");
        };

        CompileUtil.verify(arguments.size() == 2, "LAST/FIRST function requires 2 arguments");
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);

        List<FieldKey> dimensions = context.combine(source.dimensions(), context.collect(arguments.get(1)));
        source = context.promote(source, dimensions).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        CompileContext nestedContext = context.with(source, false);
        CompiledColumn limit = nestedContext.compile(arguments.get(1)).cast(CompiledColumn.class);
        limit = nestedContext.promote(limit, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(limit.type().isDouble(), "Limit argument should be a DOUBLE, but was %s", limit.type());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();
        Plan aggregate;

        if (source.hasCurrentReference()) {
            Expression key = source.currentReference();
            aggregate = new NestedAggregateLocal(function, layout, plan, key, limit.node());
        } else {
            aggregate = new SimpleAggregateLocal(function, layout, plan, limit.node());
        }

        return source.withNode(aggregate);
    }

    private CompiledResult compilePeriodSeries(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 4, "PERIODSERIES has 4 args, but only %s supplied", arguments.size());
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);

        List<FieldKey> dimensions = source.dimensions();
        for (int i = 1; i < arguments.size(); i++) {
            Formula arg = arguments.get(i);
            List<FieldKey> dims = context.collect(arg);
            dimensions = context.combine(dimensions, dims);
        }

        source = context.promote(source, dimensions).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());
        CompileContext nestedContext = context.with(source, false);

        CompiledColumn timestamp = nestedContext.compile(arguments.get(1)).cast(CompiledColumn.class);
        timestamp = nestedContext.promote(timestamp, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(timestamp.type().isDouble(),
                "Timestamp argument should be a DOUBLE, but was %s", timestamp.type());

        CompiledColumn value = nestedContext.compile(arguments.get(2)).cast(CompiledColumn.class);
        value = nestedContext.promote(value, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(value.type().isDouble(),
                "Value argument should be a DOUBLE, but was %s", timestamp.type());

        CompiledColumn period = nestedContext.compile(arguments.get(3)).cast(CompiledColumn.class);
        period = nestedContext.promote(period, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(period.type().isString(),
                "Period argument should be a STRING, but was %s", period.type());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan aggregation;

        if (source.hasCurrentReference()) {
            aggregation = new NestedAggregateLocal(AggregateFunction.PERIOD_SERIES, layout, source.node(),
                    source.currentReference(), timestamp.node(), value.node(), period.node());
        } else {
            aggregation = new SimpleAggregateLocal(AggregateFunction.PERIOD_SERIES, layout, source.node(),
                    timestamp.node(), value.node(), period.node());
        }

        Get result = new Get(aggregation, 0);
        return new CompiledColumn(result, source.dimensions());
    }

    private CompiledColumn compileExtrapolate(CompileContext context, List<Formula> arguments) {
        Util.verify(arguments.size() == 1);
        CompiledColumn argument = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        Util.verify(argument.type().isPeriodSeries());
        Extrapolate expression = new Extrapolate(argument.node());
        return new CompiledColumn(expression, argument.dimensions());
    }

    private CompiledColumn compilePercentChange(CompileContext context, List<Formula> arguments) {
        Util.verify(arguments.size() == 1);
        CompiledColumn argument = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        Util.verify(argument.type().isPeriodSeries());
        PercentChange expression = new PercentChange(argument.node());
        return new CompiledColumn(expression, argument.dimensions());
    }

    private CompiledResult compileInput(CompileContext context, List<Formula> arguments) {
        Formula pathFormula = arguments.get(0);
        CompileUtil.verify(pathFormula instanceof ConstText, "INPUT path should be a plain text");
        String inputPath = ((ConstText) pathFormula).text();

        MetadataProvider metadataProvider = context.metadataProvider();
        InputMetadata metadata = metadataProvider.read(inputPath);

        InputLocal input = new InputLocal(metadata, new LocalInputProvider());
        List<String> columnNames = List.copyOf(metadata.columnTypes().keySet());
        List<ColumnType> columnTypes = List.copyOf(metadata.columnTypes().values());

        SelectLocal select = new SelectLocal(new RowNumber(input));
        return new CompiledInputTable(input, columnNames, columnTypes, select);
    }

    private static CompiledColumn compileDate(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 3, "DATE function requires 3 arguments: DATE(YEAR, MONTH, DAY)");
        List<CompiledColumn> args = compileExpressions(context, arguments);

        CompiledColumn year = args.get(0);
        CompiledColumn month = args.get(1);
        CompiledColumn day = args.get(2);

        CompileUtil.verify(year.type().isDouble(), "YEAR argument in DATE function must be a number");
        CompileUtil.verify(month.type().isDouble(), "Month argument in DATE function must be a number");
        CompileUtil.verify(day.type().isDouble(), "Day argument in DATE function must be a number");

        Date date = new Date(year.node(), month.node(), day.node());
        return new CompiledColumn(date, year.dimensions());
    }

    private CompiledColumn compileDateTimePart(CompileContext context, List<Formula> arguments,
                                               DateTimePart.DateTimePartFunction function) {
        CompileUtil.verify(arguments.size() == 1, function + " requires single argument");
        CompiledColumn date = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        CompileUtil.verify(date.type().isDouble(), function + " function argument must be a number");

        DateTimePart dateTimePart = new DateTimePart(date.node(), function);
        return new CompiledColumn(dateTimePart, date.dimensions());
    }

    private CompiledColumn compileConcatenate(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(!arguments.isEmpty(), "CONCATENATE function requires at least one argument");
        List<CompiledColumn> args = compileExpressions(context, arguments);

        List<Expression> expressions = new ArrayList<>(args.size());
        for (CompiledColumn arg : args) {
            ColumnType type = arg.type();
            CompileUtil.verify(type.isDouble() || type.isString(),
                    "CONCATENATE function allows only numbers or strings");

            if (type.isString()) {
                expressions.add(arg.node());
            } else {
                // excel CONCAT handles dates differently compare to TEXT function
                Text text = new Text(arg.node(), (type == ColumnType.DATE) ? ColumnType.DOUBLE : type, null);
                expressions.add(text);
            }
        }

        Expression expression = (expressions.size()) == 1 ? expressions.get(0) : new Concatenate(expressions);
        return new CompiledColumn(expression, args.get(0).dimensions());
    }

    private CompiledColumn compileText(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1 || arguments.size() == 2,
                "TEXT function requires one mandatory argument and optional formatting for dates");

        CompiledColumn argument = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        ColumnType type = argument.type();
        CompileUtil.verify(type.isDouble(), "TEXT function allows only numbers");

        String formatting = null;
        if (arguments.size() == 2) {
            Formula formula = arguments.get(1);
            if (formula instanceof ConstText text) {
                formatting = text.text();
            } else {
                throw new CompileError("TEXT function allows only constant string formatting");
            }
        }

        Text text = new Text(argument.node(), type, formatting);
        return new CompiledColumn(text, argument.dimensions());
    }

    private CompiledResult compileValue(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1, "VALUE function requires 1 argument");
        CompiledColumn argument = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        CompileUtil.verify(argument.type().isString(), "VALUE function requires one STRING argument");
        Value expression = new Value(argument.node());
        return new CompiledColumn(expression, argument.dimensions());
    }

    private CompiledResult compileIf(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 3, "IF function requires 3 arguments");
        List<CompiledColumn> args = compileExpressions(context, arguments);

        CompiledColumn condition = args.get(0);
        CompiledColumn left = args.get(1);
        CompiledColumn right = args.get(2);

        CompileUtil.verify(condition.type().isDouble(), "IF function requires DOUBLE condition argument");
        CompileUtil.verify(ColumnType.isClose(left.type(), right.type()),
                "IF function requires left and right arguments to have same type");

        If expression = new If(condition.node(), left.node(), right.node());
        return new CompiledColumn(expression, condition.dimensions());
    }

    private CompiledResult compileIfNa(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 2, "IFNA function requires 2 arguments");
        List<CompiledColumn> args = compileExpressions(context, arguments);

        CompiledColumn source = args.get(0);
        CompiledColumn fallback = args.get(1);

        CompileUtil.verify(ColumnType.isClose(source.type(), fallback.type()),
                "IFNA function requires source and fallback arguments to have same type");

        IsNa condition = new IsNa(source.node());
        If expression = new If(condition, fallback.node(), source.node());
        return new CompiledColumn(expression, source.dimensions());
    }

    private CompiledResult compileIsNa(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1, "ISNA function requires 1 argument");
        CompiledColumn source = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        IsNa expression = new IsNa(source.node());
        return new CompiledColumn(expression, source.dimensions());
    }

    private CompiledResult compileAbs(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1, "ABS function requires DOUBLE argument");
        CompiledColumn source = context.compile(arguments.get(0)).cast(CompiledColumn.class);
        CompileUtil.verify(source.type().isDouble(), "ABS function requires DOUBLE argument");
        Abs expression = new Abs(source.node());
        return new CompiledColumn(expression, source.dimensions());
    }

    private CompiledColumn compileSubstring(String name, CompileContext context, List<Formula> arguments) {
        SubstringFunction function = SubstringFunction.valueOf(name);
        int requiredArguments = function.getArgumentsCount();
        CompileUtil.verify(arguments.size() == requiredArguments,
                "%s function requires %d arguments", name, requiredArguments);
        List<CompiledColumn> args = compileExpressions(context, arguments);

        CompileUtil.verify(args.get(0).type().isString(), "%s requires string source argument", name);
        for (int i = 1; i < requiredArguments; i++) {
            CompileUtil.verify(args.get(i).type().isDouble(), "%s %d argument must be numeric", name, (i + 1));
        }

        Substring substring = new Substring(function, args.stream().map(CompiledColumn::node).toList());
        return new CompiledColumn(substring, args.get(0).dimensions());
    }

    private CompiledColumn compileSubstitute(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 3, "SUBSTITUTE function requires 3 arguments");
        List<CompiledColumn> args = compileExpressions(context, arguments);

        for (int i = 0; i < args.size(); i++) {
            CompiledColumn column = args.get(i);
            CompileUtil.verify(column.type().isString(), "SUBSTITUTE %d argument must be string", (i + 1));
        }

        Substitute substitute = new Substitute(args.get(0).node(), args.get(1).node(), args.get(2).node());

        return new CompiledColumn(substitute, args.get(0).dimensions());
    }

    private CompiledResult compileMode(CompileContext context, List<Formula> arguments) {
        Util.verify(arguments.size() == 1);
        CompiledNestedColumn source = context.compile(arguments.get(0)).cast(CompiledNestedColumn.class);
        Util.verify(source.type().isDouble() || source.type().isString());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();

        Expression value = source.flat().node();
        Plan aggregate;

        if (source.hasCurrentReference()) {
            Get key = source.currentReference();
            aggregate = new NestedAggregateLocal(AggregateFunction.MODE, layout, plan, key, value);
        } else {
            aggregate = new SimpleAggregateLocal(AggregateFunction.MODE, layout, plan, value);
        }

        Get column = new Get(aggregate, 0);
        return new CompiledColumn(column, source.dimensions());
    }

    private CompiledResult compileCorrelation(CompileContext context, List<Formula> arguments) {
        Util.verify(arguments.size() == 3, "CORREL requires 3 arguments");
        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);

        List<FieldKey> dimensions = source.dimensions();
        for (int i = 1; i < arguments.size(); i++) {
            Formula arg = arguments.get(i);
            List<FieldKey> dims = context.collect(arg);
            dimensions = context.combine(dimensions, dims);
        }

        source = context.promote(source, dimensions).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());
        CompileContext nestedContext = context.with(source, false);

        CompiledColumn left = nestedContext.compile(arguments.get(1)).cast(CompiledColumn.class);
        left = nestedContext.promote(left, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(left.type().isDouble(), "Left argument should be a DOUBLE, but was %s", left.type());

        CompiledColumn right = nestedContext.compile(arguments.get(2)).cast(CompiledColumn.class);
        right = nestedContext.promote(right, dimensions).cast(CompiledColumn.class);
        CompileUtil.verify(right.type().isDouble(), "Right argument should be a DOUBLE, but was %s", right.type());

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();

        Plan aggregate;

        if (source.hasCurrentReference()) {
            Get key = source.currentReference();
            aggregate = new NestedAggregateLocal(AggregateFunction.CORRELATION, layout, plan,
                    key, left.node(), right.node());
        } else {
            aggregate = new SimpleAggregateLocal(AggregateFunction.CORRELATION, layout, plan,
                    left.node(), right.node());
        }

        Get column = new Get(aggregate, 0);
        return new CompiledColumn(column, source.dimensions());
    }

    private CompiledResult compileFields(CompileContext context, List<Formula> arguments) {
        CompileUtil.verify(arguments.size() == 1);
        CompiledTable table = context.compile(arguments.get(0)).cast(CompiledTable.class);
        return compileFields(context, table, true);
    }

    CompiledNestedColumn compileFields(CompileContext context, CompiledTable table, boolean withPivot) {
        List<String> allFields = table.fields(context);

        String[] fields = allFields.stream()
                .filter(field -> !field.equals(CompilePivot.PIVOT_NAME))
                .toArray(String[]::new);

        CompiledPivotTable pivot = (withPivot && allFields.contains(CompilePivot.PIVOT_NAME))
                ? table.field(context, CompilePivot.PIVOT_NAME).cast(CompiledPivotTable.class)
                : null;

        Fields plan = (pivot == null)
                ? new Fields(fields)
                : new Fields(pivot.pivotNames(), pivot.pivotNamesKey(), fields);

        return new CompiledNestedColumn(plan, 0);
    }

    private List<CompiledColumn> compileExpressions(CompileContext context, List<Formula> arguments) {
        List<CompiledColumn> columns = arguments.stream().map(context::compile)
                .map(column -> column.cast(CompiledColumn.class)).toList();

        List<FieldKey> dimensions = columns.stream().map(CompiledColumn::dimensions)
                .reduce(List.of(), context::combine);

        return columns.stream().map(column -> context.promote(column, dimensions))
                .map(column -> column.cast(CompiledColumn.class)).toList();
    }
}
