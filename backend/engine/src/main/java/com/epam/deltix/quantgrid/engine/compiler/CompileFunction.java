package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.SuggestionHelper;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledInputTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRowTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTotalTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.DateFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModel;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModels;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Concatenate;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.If;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.expression.TernaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.DateRangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.EvaluateModelLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.EvaluateNLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Fields;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ListLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.MRRLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RecallLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieveLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SetOperation;
import com.epam.deltix.quantgrid.engine.node.plan.local.SetOperationLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SplitLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.TokensCountLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.ConstBool;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@UtilityClass
public class CompileFunction {
    private static final Set<String> UNARY_FUNCTIONS =
            Arrays.stream(UnaryFunction.Type.values())
                    .map(Enum::name)
                    .collect(Collectors.toUnmodifiableSet());
    private static final Set<String> BINARY_FUNCTIONS =
            Arrays.stream(BinaryFunction.Type.values())
                    .map(Enum::name)
                    .collect(Collectors.toUnmodifiableSet());
    private static final Set<String> TERNARY_FUNCTIONS =
            Arrays.stream(TernaryFunction.Type.values())
                    .map(Enum::name)
                    .collect(Collectors.toUnmodifiableSet());

    public CompiledResult compile(CompileContext context) {
        String name = context.functionName();
        if (UNARY_FUNCTIONS.contains(name)) {
            return compileUnaryFunction(name, context);
        }

        if (BINARY_FUNCTIONS.contains(name)) {
            return compileBinaryFunction(name, context);
        }

        if (TERNARY_FUNCTIONS.contains(name)) {
            return compileTernaryFunction(name, context);
        }

        ParsedPython.Function function = context.pythonFunction(name);
        if (function != null) {
            return CompilePython.compile(context, function);
        }

        return switch (name) {
            case "UnaryOperator" -> compileUnaryOperator(context,
                    ((com.epam.deltix.quantgrid.parser.ast.UnaryOperator) context.function()).operation());
            case "BinaryOperator" -> compileBinaryOperator(context,
                    ((com.epam.deltix.quantgrid.parser.ast.BinaryOperator) context.function()).operation());
            case "POW" -> compileBinaryOperator(context, BinaryOperation.POW);
            case "ROW" -> compileRow(context);
            case "PERIODSERIES" -> compilePeriodSeries(context);
            case "EXTRAPOLATE" -> compileExtrapolate(context);
            case "PERCENTCHANGE" -> compilePercentChange(context);
            case "RANGE" -> compileRange(context);
            case "FILTER" -> compileFilter(context);
            case "RowReference" -> compileRowReference(context);
            case "FIND" -> compileFind(context);
            case "UNIQUE" -> compileUnique(context);
            case "UNIQUEBY" -> compileUniqueBy(context);
            case "SORT" -> compileSort(context);
            case "SORTBY" -> compileSortBy(context);
            case "COUNT" -> compileCount(context);
            case "SUM", "AVERAGE", "MAX", "MIN", "STDEVS", "STDEVP", "GEOMEAN", "MEDIAN", "CORREL" ->
                    compileDoubleAggregation(name, context);
            case "PERCENTILE", "PERCENTILE_EXC", "QUARTILE", "QUARTILE_EXC" ->
                    compileQuantileAggregation(name, context);
            case "MINBY", "MAXBY" -> compileRowAggregationByDouble(name, context);
            case "FIRST", "LAST", "SINGLE" -> (context.argumentCount() == 1)
                    ? compileFirstLastSingle(name, context)
                    : compileFirstsLasts(name, context);
            case "INDEX" -> compileIndex(context);
            case "INPUT" -> compileInput(context);
            case "PIVOT" -> CompilePivot.compile(context);
            case "UNPIVOT" -> CompileUnpivot.compile(context);
            case "FIELDS" -> compileFields(context);
            case "CONCAT", "CONCATENATE" -> compileConcatenate(context);
            case "TEXT" -> compileText(context);
            case "IF" -> compileIf(context);
            case "IFNA" -> compileIfNa(context);
            case "MODE" -> compileMode(context);
            case "PI" -> compilePi();
            case "SPLIT" -> compileSplit(context);
            case "DATERANGE" -> compileDateRange(context);
            case "LIST" -> compileList(context);
            case "TOTAL" -> compileTotal(context);
            case "EVALUATE_N" -> compileEvaluateN(context);
            case "EVALUATE_MODEL" -> compileEvaluateModel(context);
            case "RETRIEVE" -> compileRetrieve(context);
            case "RETRIEVE_SCORES" -> compileRetrieveScores(context);
            case "RETRIEVE_DESCRIPTIONS" -> compileRetrieveDescriptions(context);
            case "RECALL" -> compileRecall(context);
            case "BETWEEN" -> compileBetween(context);
            case "UNION", "INTERSECT", "SUBTRACT" -> compileSetOperation(name, context);
            case "IN" -> compileIn(context);
            default -> throw new CompileError("Unsupported function: " + name);
        };
    }

    private CompiledResult compileUnaryFunction(String name, CompileContext context) {
        UnaryFunction.Type function = UnaryFunction.Type.valueOf(name);
        if (function == UnaryFunction.Type.ISNA) {
            CompiledResult arg = context.compileArgument(0, ResultValidator.ANY);
            CompiledColumn column;

            if (arg instanceof CompiledColumn) {
               column = (CompiledColumn) arg;
            } else {
                CompiledTable table  = arg.cast(CompiledTable.class);
                if (table.nested()) {
                    Plan plan = table.hasCurrentReference()
                            ? new SelectLocal(table.currentReference(), table.queryReference())
                            : new SelectLocal(table.queryReference());
                    column = new CompiledNestedColumn(plan, table.dimensions(),
                            table.hasCurrentReference() ? 0 : CompiledTable.REF_NA,
                            table.hasCurrentReference() ? 1 : 0,
                            GeneralFormat.INSTANCE);
                } else {
                    column = new CompiledSimpleColumn(
                            table.queryReference(), table.dimensions(), GeneralFormat.INSTANCE);
                }
            }

            return column.transform(in -> new UnaryFunction(in, function), BooleanFormat.INSTANCE);
        }

        CompiledColumn arg = context.compileArgument(
                0, function.getArgumentType() == null
                        ? SimpleOrNestedValidators.ANY
                        : SimpleOrNestedValidators.forType(function.getArgumentType()));

        return arg.transform(expression -> new UnaryFunction(expression, function), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileBinaryFunction(String name, CompileContext context) {
        BinaryFunction.Type function = BinaryFunction.Type.valueOf(name);
        List<CompiledColumn> args = compileArgs(context, List.of(
                SimpleOrNestedValidators.forType(function.getArgument1Type()),
                SimpleOrNestedValidators.forType(function.getArgument2Type())));

        return CompiledColumn.transform(args.get(0), args.get(1),
                (arg1, arg2) -> new BinaryFunction(arg1, arg2, function),
                function.getResultFormat());
    }

    private CompiledResult compileTernaryFunction(String name, CompileContext context) {
        TernaryFunction.Type function = TernaryFunction.Type.valueOf(name);
        List<CompiledColumn> args = compileArgs(context, List.of(
                SimpleOrNestedValidators.forType(function.getArgument1Type()),
                SimpleOrNestedValidators.forType(function.getArgument2Type()),
                SimpleOrNestedValidators.forType(function.getArgument3Type())));

        return CompiledColumn.transform(args.get(0), args.get(1), args.get(2),
                (arg1, arg2, arg3) -> new TernaryFunction(arg1, arg2, arg3, function),
                function.getResultFormat());
    }

    private CompiledResult compileUnaryOperator(CompileContext context, UnaryOperation operation) {
        CompiledColumn arg = context.compileArgument(0, SimpleOrNestedValidators.DOUBLE);
        ColumnFormat format = FormatResolver.resolveFormat(operation, arg.format());
        return arg.transform(in -> new UnaryOperator(in, operation), format);
    }

    private CompiledResult compileBinaryOperator(CompileContext context, BinaryOperation operation) {
        if (operation == BinaryOperation.CONCAT) {
           return compileConcatenate(context);
        }

        List<CompiledColumn> args = compileArgs(
            context,
            operation.isAllowStrings() ?
            List.of(SimpleOrNestedValidators.STRING_OR_DOUBLE, SimpleOrNestedValidators.STRING_OR_DOUBLE) :
            List.of(SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.DOUBLE)
        );

        CompiledColumn left = args.get(0);
        CompiledColumn right = args.get(1);

        if (operation.isAllowStrings() && (left.type().isString() != right.type().isString())) {
            left = SimpleOrNestedValidators.STRING.convert(left);
            right = SimpleOrNestedValidators.STRING.convert(right);
        }

        ColumnFormat format = FormatResolver.resolveFormat(operation, left.format(), right.format());
        return CompiledColumn.transform(left, right, (arg1, arg2) -> new BinaryOperator(arg1, arg2, operation), format);
    }

    private CompiledColumn compileRow(CompileContext context) {
        if (context.key().isOverride()) {
            // query reference points to the row at which ROW() is being compiled in
            CompiledTable table = context.overrideRowTable();
            Get get = table.queryReference();
            Expression row = CompileUtil.plus(get, 1);
            return new CompiledSimpleColumn(row, table.dimensions(), GeneralFormat.INSTANCE);
        }

        CompiledTable layout = context.layout();
        RowNumber number = new RowNumber(layout.node());
        Expression row = CompileUtil.plus(number, 1);
        return new CompiledSimpleColumn(row, layout.dimensions(), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileRange(CompileContext context) {
        CompiledSimpleColumn count = compileArgs(context, SimpleColumnValidators.DOUBLE).get(0);
        CompiledTable table = context.currentTable(count.dimensions());
        RangeLocal range = new RangeLocal(table.node(), count.node());
        int column = table.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(range, table.dimensions(), table.currentRef(), column, GeneralFormat.INSTANCE);
    }

    private CompiledResult compileFilter(CompileContext context) {
        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.DOUBLE);
        CompiledTable table = args.table();
        CompiledSimpleColumn condition = args.columns.get(0);
        FilterLocal filter = new FilterLocal(table.node(), condition.node());
        return table.withNode(filter);
    }

    private CompiledResult compileRowReference(CompileContext context) {
        CompiledTable result = compileFind(context);
        CompiledTable table = context.compileArgument(0, TableValidators.NESTED_TABLE);

        if (!context.canMatchOverride(table.name())) {
            return result;
        }

        List<String> keys = table.keys(context);
        List<ColumnType> types = new ArrayList<>();

        if (keys.isEmpty()) {
            types.add(ColumnType.DOUBLE);
        } else {
            CompiledTable flat = table.flat().cast(CompiledTable.class);
            for (String key : keys) {
                ColumnType type = flat.field(context, key).cast(CompiledColumn.class).type();
                types.add(type);
            }
        }

        CompiledRow row = new CompiledRow();

        for (int i = 1; i < context.argumentCount(); i++) {
            Formula argument = context.argument(i);
            ColumnType type = types.get(i - 1);

            if (argument instanceof ConstText || argument instanceof ConstNumber || argument instanceof ConstBool) {
                Object key = CompileOverride.parseOverrideKey(type, argument);
                row.add(key);
                continue;
            }

            return result;
        }

        return new CompiledRowTable(result, row);
    }

    private CompiledTable compileFind(CompileContext context) {
        CompiledTable rightTable = context.compileArgument(0, TableValidators.NESTED_TABLE);
        CompileUtil.verify(rightTable.dimensions().isEmpty(),
                "%s does not support source with current promotedTable yet",
                context.functionName());

        rightTable = rightTable.flat().cast(CompiledTable.class);
        List<String> rightNames = rightTable.keys(context);
        int keyCount = context.argumentCount() - 1;
        List<Expression> rightKeys = new ArrayList<>(keyCount);

        if (rightNames.isEmpty()) {
            CompileUtil.verify(keyCount == 1,
                    "%s must have 1 argument for a table without keys",
                    context.functionName());

            rightKeys.add(CompileUtil.plus(rightTable.queryReference(), 1));
        } else {
            CompileUtil.verify(keyCount == rightNames.size(),
                    "%s must have %d arguments, but got: %d",
                    context.functionName(), rightNames.size(), keyCount);

            String rightTableName = rightTable.name();
            for (String name : rightNames) {
                CompiledSimpleColumn key = rightTable.field(context, name)
                        .cast(CompiledSimpleColumn.class, (expected, actual) ->
                                "The key '%s' of table '%s' must be %s, but got %s".formatted(
                                        name, rightTableName, expected, actual));
                rightKeys.add(key.node());
            }
        }

        List<ResultValidator<CompiledSimpleColumn>> validators = rightKeys.stream()
                .map(e -> SimpleColumnValidators.forType(e.getType())).toList();

        List<CompiledSimpleColumn> leftArgs = compileArgs(context, validators,
                IntStream.range(1, keyCount + 1).toArray());

        List<FieldKey> leftDims = leftArgs.get(0).dimensions();
        CompiledTable leftTable = context.currentTable(leftDims);
        List<Expression> leftKeys = leftArgs.stream().map(CompiledSimpleColumn::node).toList();

        Plan result = new JoinSingleLocal(leftTable.node(), rightTable.node(), leftKeys, rightKeys);
        return rightTable.withNode(result).withDimensions(leftTable.dimensions());
    }

    private CompiledResult compileUnique(CompileContext context) {
        CompiledNestedColumn source = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);
        List<Expression> keys = new ArrayList<>();

        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }

        keys.add(source.expression());
        DistinctByLocal distinct = new DistinctByLocal(source.node(), keys);
        return source.withNode(distinct);
    }

    private CompiledResult compileUniqueBy(CompileContext context) {
        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.STRING_OR_DOUBLE);
        CompiledTable table = args.table();
        List<Expression> keys = new ArrayList<>();

        if (table.hasCurrentReference()) {
            keys.add(table.currentReference());
        }

        keys.addAll(args.columns.stream().map(CompiledSimpleColumn::node).toList());
        DistinctByLocal distinct = new DistinctByLocal(table.node(), keys);
        return table.withNode(distinct);
    }

    private CompiledResult compileSort(CompileContext context) {
        CompiledNestedColumn arg = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);
        return compileSortBy(new TableArgs(arg, List.of(arg.flat())));
    }

    private CompiledResult compileSortBy(CompileContext context) {
        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.STRING_OR_DOUBLE);
        return compileSortBy(args);
    }

    private CompiledResult compileSortBy(TableArgs args) {
        CompiledTable table = args.table();
        List<Expression> keys = new ArrayList<>();

        if (table.hasCurrentReference()) {
            keys.add(table.currentReference());
        }
        keys.addAll(args.columns().stream().map(CompiledSimpleColumn::node).toList());

        boolean[] ascending = new boolean[keys.size()];
        Arrays.fill(ascending, true);

        OrderByLocal order = new OrderByLocal(table.node(), keys, ascending);
        return table.withNode(order);
    }

    private CompiledSimpleColumn compileCount(CompileContext context) {
        CompiledTable arg = context.compileArgument(0, TableValidators.NESTED);
        return compileCount(context, arg, false);
    }

    CompiledSimpleColumn compileCount(CompileContext context, CompiledTable arg, boolean all) {
        CompileUtil.verify(arg.nested());
        AggregateType type = all ? AggregateType.COUNT_ALL : AggregateType.COUNT;

        Plan layout = context.layout(arg.dimensions()).node().getLayout();
        Expression value = (arg instanceof CompiledNestedColumn column) ? column.expression() : arg.queryReference();

        Expression key = arg.hasCurrentReference() ? arg.currentReference() : null;
        Plan aggregate = new AggregateLocal(type, layout, arg.node(), key, value);

        Get column = new Get(aggregate, 0);
        return new CompiledSimpleColumn(column, arg.dimensions(), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileDoubleAggregation(String name, CompileContext context) {
        AggregateType type = AggregateType.valueOf(name);
        List<CompiledNestedColumn> args = compileArgs(context, NestedColumnValidators.DOUBLE);

        CompiledNestedColumn table = args.get(0);
        Plan layout = context.layout(table.dimensions()).node().getLayout();

        Expression key = table.hasCurrentReference() ? table.currentReference() : null;
        List<Expression> values = args.stream().map(CompiledNestedColumn::expression).toList();
        Plan aggregate = new AggregateLocal(type, layout, table.node(), key, values);

        Get column = new Get(aggregate, 0);
        return new CompiledSimpleColumn(column, table.dimensions(),
                FormatResolver.resolveDoubleAggregationFormat(type, table.format()));
    }

    private CompiledResult compileQuantileAggregation(String name, CompileContext context) {
        AggregateType type = AggregateType.valueOf(name);
        List<ResultValidator<CompiledColumn>> validators = new ArrayList<>();
        validators.add((ResultValidator) NestedColumnValidators.DOUBLE);
        validators.add(SimpleOrNestedValidators.DOUBLE);
        List<CompiledColumn> args = compileArgs(context, validators);

        CompiledNestedColumn array = (CompiledNestedColumn) args.get(0);
        CompiledColumn quantile = args.get(1);

        Plan layout = context.layout(array.dimensions()).node().getLayout();
        Expression key = array.hasCurrentReference() ? array.currentReference() : null;
        List<Expression> values = List.of(array.expression(), quantile.expression());
        Plan aggregate = new AggregateLocal(type, layout, array.node(), key, values);

        Get column = new Get(aggregate, 0);
        return new CompiledSimpleColumn(column, array.dimensions(), array.format());
    }

    private CompiledResult compileFirstLastSingle(String name, CompileContext context) {
        AggregateType function = AggregateType.valueOf(name);
        CompiledTable arg = context.compileArgument(0, TableValidators.NESTED);
        return compileRowAggregation(function, context, new TableArgs(arg, List.of()));
    }

    private CompiledResult compileIndex(CompileContext context) {
        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.DOUBLE);
        return compileRowAggregation(AggregateType.INDEX, context, args);
    }

    private CompiledResult compileRowAggregationByDouble(String name, CompileContext context) {
        AggregateType function = AggregateType.valueOf(name);
        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.DOUBLE);
        return compileRowAggregation(function, context, args);
    }

    private CompiledResult compileRowAggregation(AggregateType type, CompileContext context, TableArgs args) {
        CompiledTable table = args.table();
        Plan layout = context.layout(table.dimensions()).node().getLayout();

        Expression key = table.hasCurrentReference() ? table.currentReference() : null;
        List<Expression> values = args.columns.stream().map(CompiledSimpleColumn::node).toList();

        Plan aggregate = new AggregateLocal(type, layout, table.node(), key, values);
        return table.withNode(aggregate).flat();
    }

    private CompiledResult compileFirstsLasts(String name, CompileContext context) {
        AggregateType type = switch (name) {
            case "FIRST" -> AggregateType.FIRSTS;
            case "LAST" -> AggregateType.LASTS;
            default -> throw new CompileError(name + " function takes invalid number of arguments");
        };

        TableArgs args = compileTableArgs(context, SimpleOrNestedValidators.DOUBLE);
        CompiledTable table = args.table();
        CompiledSimpleColumn limit = args.columns.get(0);

        Plan layout = context.layout(table.dimensions()).node().getLayout();
        Expression key = table.hasCurrentReference() ? table.currentReference() : null;

        Plan aggregate = new AggregateLocal(type, layout, table.node(), key, limit.node());
        return table.withNode(aggregate);
    }

    private CompiledResult compilePeriodSeries(CompileContext context) {
        List<CompiledNestedColumn> args = compileArgs(context, List.of(SimpleOrNestedValidators.DOUBLE,
                SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.STRING))
                .stream().map(NestedColumnValidators.ANY::convert).toList();

        CompiledTable table = args.get(0);
        CompiledNestedColumn timestamp = args.get(0);
        CompiledNestedColumn value = args.get(1);
        CompiledNestedColumn period = args.get(2);

        Plan layout = context.layout(table.dimensions()).node().getLayout();
        Expression key = table.hasCurrentReference() ? table.currentReference() : null;
        Plan aggregate = new AggregateLocal(AggregateType.PERIODSERIES, layout, table.node(), key,
                timestamp.expression(), value.expression(), period.expression());

        Get result = new Get(aggregate, 0);
        return new CompiledSimpleColumn(result, table.dimensions(), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileDateRange(CompileContext context) {
        List<ResultValidator<CompiledSimpleColumn>> validators = List.of(SimpleColumnValidators.DOUBLE,
                        SimpleColumnValidators.DOUBLE, SimpleColumnValidators.DOUBLE, SimpleColumnValidators.DOUBLE)
                .subList(0, context.argumentCount());

        List<CompiledSimpleColumn> args = compileArgs(context, validators);

        CompiledTable table = context.currentTable(args.get(0).dimensions());
        CompiledSimpleColumn date1 = args.get(0);
        CompiledSimpleColumn date2 = args.get(1);
        CompiledSimpleColumn increment = args.size() >= 3 ? args.get(2) : CompileUtil.number(table, 1);
        CompiledSimpleColumn dateType = args.size() >= 4 ? args.get(3) : CompileUtil.number(table, 4);

        DateRangeLocal plan = new DateRangeLocal(table.node(),
                date1.node(), date2.node(), increment.node(), dateType.node());

        int column = table.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(plan, table.dimensions(), table.currentRef(), column, DateFormat.DEFAULT_DATE_TIME_FORMAT);
    }

    private CompiledNestedColumn compileList(CompileContext context) {
        ColumnType type = compileArgs(context, SimpleColumnValidators.STRING_OR_DOUBLE).stream()
                .map(column -> {
                    CompileUtil.verify(column.scalar(), "LIST function accepts texts or numbers only.");
                    return column.type();
                })
                .reduce((left, right) -> left == right ? left : ColumnType.STRING)
                .orElse(ColumnType.DOUBLE);

        List<CompiledSimpleColumn> values = compileArgs(context, SimpleColumnValidators.forType(type));
        List<Expression> expressions = CompileUtil.toExpressionList(values);
        List<ColumnFormat> formats = CompileUtil.toFormatList(values);
        ColumnFormat resultFormat = FormatResolver.resolveListFormat(type, formats);

        ListLocal plan = new ListLocal(context.scalarLayout().node(), expressions);
        return new CompiledNestedColumn(plan, 0, resultFormat);
    }

    private CompiledColumn compileExtrapolate(CompileContext context) {
        CompiledColumn argument = context.compileArgument(0, SimpleOrNestedValidators.PERIOD_SERIES);
        return argument.transform(Extrapolate::new, argument.format());
    }

    private CompiledColumn compilePercentChange(CompileContext context) {
        CompiledColumn argument = context.compileArgument(0, SimpleOrNestedValidators.PERIOD_SERIES);
        return argument.transform(PercentChange::new, GeneralFormat.INSTANCE);
    }

    private CompiledResult compileInput(CompileContext context) {
        String path = context.constStringArgument(0);
        InputProvider provider = context.inputProvider();

        InputMetadata metadata;
        try {
           metadata = provider.readMetadata(path, context.principal());
        } catch (Exception e) {
            throw new CompileError(e);
        }

        InputLocal plan = new InputLocal(metadata, provider, context.principal());
        List<String> columnNames = plan.getReadColumns();
        List<ColumnFormat> columnFormats = columnNames.stream()
                .map(metadata.columnTypes()::get)
                .map(type -> switch (type) {
                    case BOOLEAN -> BooleanFormat.INSTANCE;
                    case DATE -> DateFormat.DEFAULT_DATE_FORMAT;
                    default -> GeneralFormat.INSTANCE;
                })
                .toList();

        SelectLocal select = new SelectLocal(new RowNumber(plan));
        return new CompiledInputTable(plan, columnNames, columnFormats, select);
    }

    private CompiledResult compileConcatenate(CompileContext context) {
        List<CompiledColumn> args = compileArgs(context, SimpleOrNestedValidators.STRING);
        CompiledColumn first = args.get(0);

        if (args.size() == 1) {
            return first;
        }

        List<Expression> expressions = args.stream().map(CompiledColumn::expression).toList();
        Concatenate concatenate = new Concatenate(expressions);
        return first.transform(expr -> concatenate, GeneralFormat.INSTANCE);
    }

    private CompiledResult compileText(CompileContext context) {
        CompiledColumn arg = context.compileArgument(0, SimpleOrNestedValidators.DOUBLE);
        return CompileUtil.toStringColumn(arg);
    }

    private CompiledResult compileIf(CompileContext context) {
        List<CompiledColumn> args = compileArgs(context, List.of(
                SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.ANY, SimpleOrNestedValidators.ANY));

        CompiledColumn condition = args.get(0);
        CompiledColumn left = args.get(1);
        CompiledColumn right = args.get(2);

        CompileUtil.verify(left.type() == right.type(),
                "IF function requires left and right arguments to have same type");

        return CompiledColumn.transform(condition, left, right, If::new, left.format());
    }

    private CompiledResult compileIfNa(CompileContext context) {
        List<CompiledColumn> args = compileArgs(context, List.of(
                SimpleOrNestedValidators.ANY, SimpleOrNestedValidators.ANY));

        CompiledColumn source = args.get(0);
        CompiledColumn fallback = args.get(1);

        CompileUtil.verify(source.type() == fallback.type(),
                "IFNA function requires source and fallback arguments to have same type");

        return CompiledColumn.transform(source, fallback, (arg1, arg2) -> {
            UnaryFunction condition = new UnaryFunction(arg1, UnaryFunction.Type.ISNA);
            return new If(condition, arg2, arg1);
        }, source.format());
    }

    private CompiledResult compileMode(CompileContext context) {
        CompiledNestedColumn arg = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);

        Plan layout = context.layout(arg.dimensions()).node().getLayout();
        Plan plan = arg.node();

        Get key = arg.hasCurrentReference() ? arg.currentReference() : null;
        Expression value = arg.expression();

        Plan aggregate = new AggregateLocal(AggregateType.MODE, layout, plan, key, value);
        Get column = new Get(aggregate, 0);

        return new CompiledSimpleColumn(column, arg.dimensions(), arg.format());
    }

    private CompiledResult compileFields(CompileContext context) {
        CompiledTable table = context.compileArgument(0, TableValidators.TABLE);
        return compileFields(context, table);
    }

    private CompiledTotalTable compileTotal(CompileContext context) {
        Formula arg1 = context.argument(0);
        Formula arg2 = context.argumentCount() > 1 ? context.argument(1) : new ConstNumber(1);

        CompileUtil.verify(arg1 instanceof TableReference, "TOTAL function requires table reference in 1 argument");
        CompileUtil.verify(arg2 instanceof ConstNumber, "TOTAL function requires constant number in 2 argument");

        String name = ((TableReference) arg1).table();
        int number = (int) ((ConstNumber) arg2).number();

        ParsedTable table = context.parsedTable(name);

        CompileUtil.verify(table.totals() != null, "Table: %s does not have total definition", name);
        CompileUtil.verify(number > 0, "TOTAL function requires positive number in 2 argument");
        CompileUtil.verify(number <= table.totals().size(), "Table: %s has only %d total definitions",
                name, table.totals().size());

        // CompiledTotalTable requires some node, with queryReference column. We create a dummy one.
        SelectLocal dummyNode = new SelectLocal(new Constant(0));
        return new CompiledTotalTable(table, dummyNode, number);
    }

    CompiledNestedColumn compileFields(CompileContext context, CompiledTable table) {
        List<String> allFields = table.fields(context);

        String[] fields = allFields.stream()
                .filter(field -> !field.equals(CompiledPivotColumn.PIVOT_NAME))
                .toArray(String[]::new);

        CompiledPivotColumn pivot = allFields.contains(CompiledPivotColumn.PIVOT_NAME)
                ? table.field(context, CompiledPivotColumn.PIVOT_NAME).cast(CompiledPivotColumn.class)
                : null;

        Fields plan = (pivot == null)
                ? new Fields(fields)
                : new Fields(pivot.names(), pivot.nameColumn(), fields);

        return new CompiledNestedColumn(plan, 0, GeneralFormat.INSTANCE);
    }

    <T extends CompiledResult> List<T> compileArgs(CompileContext context, ResultValidator<T> nValidator) {
        return compileArgs(context, Collections.nCopies(context.argumentCount(), nValidator));
    }

    <T extends CompiledResult> List<T> compileArgs(CompileContext context, List<ResultValidator<T>> validators) {
        return compileArgs(context, validators, IntStream.range(0, validators.size()).toArray());
    }

    /**
     * Compiles arguments and aligns them to the common layout.
     */
    @SuppressWarnings("uncheked")
    <T extends CompiledResult> List<T> compileArgs(CompileContext context,
                                                   List<ResultValidator<T>> validators,
                                                   int... indexes) {
        CompileUtil.verify(validators.size() == indexes.length);

        List<T> args = new ArrayList<>();
        boolean hasNested = false;

        for (int i = 0; i < validators.size(); i++) {
            T arg = context.withDimensions(List.of()).compileArgument(indexes[i], validators.get(i));
            args.add(arg);
            hasNested |= arg.nested();
        }

        List<FieldKey> dimensions = args.stream().map(CompiledResult::dimensions).reduce(context.dimensions(), context::combine);

        if (hasNested && !dimensions.isEmpty()) { // recompile nested types with the desired dimensions
            for (int i = 0; i < args.size(); i++) {
                T arg = args.get(i);

                if (arg.nested() && !arg.dimensions().isEmpty() && !arg.dimensions().equals(dimensions)) {
                    arg = context.withDimensions(dimensions).compileArgument(indexes[i], validators.get(i));
                }

                args.set(i, arg);
            }
        }

        for (int i = 0; i < args.size(); i++) { // promote to the same dims
            T arg = args.get(i);
            arg = context.promote(arg, dimensions).cast(validators.get(i).getExpectedType());
            args.set(i, arg);
        }

        if (hasNested) {
            CompiledTable nested = args.stream()
                    .filter(CompiledResult::nested)
                    .map(CompiledTable.class::cast)
                    .findFirst()
                    .get();

            for (int i = 0; i < args.size(); i++) {
                T arg = args.get(i);
                arg = (T) context.align(nested, arg);
                args.set(i, arg);
            }
        }

        for (int i = 1; i < args.size(); ++i) {
            T arg = args.get(i);
            if (!arg.hasSameLayout(args.get(0))) {
                if (CompileUtil.isOperator(context.function())) {
                    throw new CompileError(
                            "Operands of the '%s' operator are from different origins and may have different sizes."
                                    .formatted(context.function().operationSymbol()));
                }

                throw new CompileError(
                        "The arguments '%s' and '%s' of the %s function are from different origins and may have different sizes.%s"
                                .formatted(
                                        context.getFunctionArgName(0),
                                        context.getFunctionArgName(i),
                                        context.function().operationSymbol(),
                                        SuggestionHelper.getSuggestion(context, i)));
            }
        }

        return args;
    }

    private CompiledSimpleColumn compilePi() {
        return new CompiledSimpleColumn(new Constant(Math.PI), List.of(), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileEvaluateN(CompileContext context) {
        ParsedTable table = context.compiler().evaluationTable();
        CompiledTable source = context.compileFormula(new TableReference(table.tableName()))
                .cast(CompiledReferenceTable.class).flat().cast(CompiledTable.class);

        if (!(context.argument(0) instanceof FieldReference field)) {
            throw new CompileError("The field argument of EVALUATE_N should be a table field");
        }
        String tableName = ((TableReference) field.table()).table();
        String fieldName = field.field();

        String questionFieldName = CompileEvaluationUtils.getEvaluationQuestionField(table);
        CompiledSimpleColumn questionColumn = source.field(context, questionFieldName).cast(CompiledSimpleColumn.class);
        CompiledSimpleColumn nColumn = CompileUtil.number(source, Integer.MAX_VALUE);

        List<Plan.Source> retrievers = new ArrayList<>();
        List<Plan.Source> groundTruths = new ArrayList<>();
        List<Plan.Source> tokens = new ArrayList<>();

        List<CompileEvaluationUtils.EvaluationField> evaluationFields = CompileEvaluationUtils.getEvaluationFields(table);
        int targetId = -1;
        for (CompileEvaluationUtils.EvaluationField evaluationField : evaluationFields) {
            if (evaluationField.field().tableName().equals(tableName) &&
                    evaluationField.field().fieldName().equals(fieldName)) {
                targetId = retrievers.size();
            }

            FieldKey descriptionField = CompileEvaluationUtils.getDescriptionField(context, evaluationField.field());
            Formula concatenatedField = concatenateDescription(evaluationField.field(), descriptionField);

            Plan distinctFields = distinctFieldWithDescription(context, evaluationField.field().tableName(),
                    evaluationField.field().fieldName(), descriptionField, concatenatedField);

            CompiledSimpleColumn evaluatedModel = context.compileFormula(
                    new Function("EVALUATE_MODEL", new FieldReference(new TableReference(
                            evaluationField.field().tableName()), evaluationField.field().fieldName()))
            ).cast(CompiledSimpleColumn.class);

            Plan modelTable = new SelectLocal(evaluatedModel.node());

            Plan queryEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                    source.node(),
                    questionColumn,
                    null,
                    modelTable,
                    new CompiledSimpleColumn(new Get(modelTable, 0), List.of(), GeneralFormat.INSTANCE),
                    EmbeddingType.QUERY);

            Plan fieldEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                        distinctFields,
                        new CompiledSimpleColumn(new Get(distinctFields, 0), List.of(), GeneralFormat.INSTANCE),
                        descriptionField != null ? new CompiledSimpleColumn(new Get(distinctFields, 1), List.of(), GeneralFormat.INSTANCE) : null,
                        modelTable,
                        new CompiledSimpleColumn(new Get(modelTable, 0), List.of(), GeneralFormat.INSTANCE),
                        EmbeddingType.DOCUMENT);

            Plan retrieve = new RetrieveLocal(
                    fieldEmbeddings,
                    queryEmbeddings,
                    EmbeddingModel.NUMBER_OF_DIMENSIONS,
                    source.node(),
                    questionColumn.node(),
                    nColumn.node());

            CompileUtil.verify(retrieve.getMeta().getSchema().size() == 4);
            retrievers.add(new Plan.Source(retrieve, List.of(new Get(retrieve, 0), new Get(retrieve, 1))));

            Plan compiledConcatField = context.compileFormula(concatenatedField).cast(CompiledNestedColumn.class).node();

            Plan fieldTokens = new TokensCountLocal(
                    compiledConcatField,
                    new Get(compiledConcatField, 0)
            );

//          TODO: calculate max
//            Plan maxTokens = new SimpleAggregateLocal(AggregateFunction.MAX, fieldTokens.getLayout(),
//                    fieldTokens, new Get(fieldTokens, 0));

            tokens.add(new Plan.Source(fieldTokens, List.of(new Get(fieldTokens, 0))));

            FieldKey groundTruthKey = evaluationField.groundTruth();
            Expression grandTruthValue = context.field(groundTruthKey.tableName(), groundTruthKey.fieldName(), true)
                    .cast(CompiledSimpleColumn.class).node();

            SelectLocal groundTruth = new SelectLocal(grandTruthValue);
            groundTruths.add(new Plan.Source(groundTruth, List.of(new Get(groundTruth, 0))));
        }

        if (targetId == -1) {
            throw new CompileError("EVALUATE_N function takes incorrect table or field name");
        }

        Plan evaluateN = new EvaluateNLocal(retrievers, tokens, groundTruths, context.scalarLayout().node());
        return new CompiledSimpleColumn(new Get(evaluateN, targetId), List.of(), GeneralFormat.INSTANCE);
    }

    private Plan distinctFieldWithDescription(CompileContext context,
                                              String tableName,
                                              String fieldName) {
        FieldKey descriptionField = CompileEvaluationUtils.getDescriptionField(context, new FieldKey(tableName, fieldName));
        Formula concatenatedField = concatenateDescription(new FieldKey(tableName, fieldName), descriptionField);

        return distinctFieldWithDescription(context, tableName, fieldName, descriptionField, concatenatedField);
    }

    private Plan distinctFieldWithDescription(CompileContext context,
                                              String tableName,
                                              String fieldName,
                                              FieldKey descriptionField,
                                              Formula concatenatedField) {
        CompiledTable distinctedTable = context.compileFormula(new Function(
                "UNIQUEBY",
                new TableReference(tableName),
                concatenatedField
        )).cast(CompiledReferenceTable.class).flat().cast(CompiledTable.class);

        Plan distinctedFields;
        if (descriptionField != null) {
            distinctedFields = new SelectLocal(
                    distinctedTable.field(context, fieldName).cast(CompiledSimpleColumn.class).node(),
                    distinctedTable.field(context, descriptionField.fieldName()).cast(CompiledSimpleColumn.class).node()
            );
        } else {
            distinctedFields = new SelectLocal(
                    distinctedTable.field(context, fieldName).cast(CompiledSimpleColumn.class).node()
            );
        }

        return distinctedFields;
    }

    private static Formula concatenateDescription(FieldKey field,
                                                  FieldKey descriptionField) {
        Formula dataField = new FieldReference(new TableReference(field.tableName()), field.fieldName());

        if (descriptionField != null) {
            return new Function(
                    "CONCATENATE",
                    dataField,
                    new ConstText(" "),
                    new FieldReference(new TableReference(descriptionField.tableName()), descriptionField.fieldName())
            );
        } else {
            return dataField;
        }
    }

    private CompiledResult compileEvaluateModel(CompileContext context) {
        ParsedTable table = context.compiler().evaluationTable();
        CompiledTable source = context.compileFormula(new TableReference(table.tableName()))
                .cast(CompiledReferenceTable.class).flat().cast(CompiledTable.class);

        if (!(context.argument(0) instanceof FieldReference fieldReference)) {
            throw new CompileError("The field argument of EVALUATE_MODEL should be a table field");
        }
        String tableName = ((TableReference) fieldReference.table()).table();
        String fieldName = fieldReference.field();

        String questionFieldName = CompileEvaluationUtils.getEvaluationQuestionField(table);
        CompiledSimpleColumn questionColumn = source.field(context, questionFieldName).cast(CompiledSimpleColumn.class);
        CompiledSimpleColumn nColumn = CompileUtil.number(source, Integer.MAX_VALUE);

        List<Plan.Source> mrrByModel = new ArrayList<>();

        Plan layout = context.scalarLayout().node();
        mrrByModel.add(new Plan.Source(layout, List.of()));

        Plan distinctedFields = distinctFieldWithDescription(context, tableName, fieldName);
        boolean hasDescription = distinctedFields.getMeta().getSchema().size() == 2;

        EmbeddingModels.getModels().forEach((modelName, model) -> {
            Plan queryEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                    context,
                    source.node(),
                    questionColumn,
                    null,
                    modelName,
                    EmbeddingType.QUERY);

            Plan fieldEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                    context,
                    distinctedFields,
                    new CompiledSimpleColumn(new Get(distinctedFields, 0), List.of(), GeneralFormat.INSTANCE),
                    hasDescription ? new CompiledSimpleColumn(new Get(distinctedFields, 1), List.of(), GeneralFormat.INSTANCE) : null,
                    modelName,
                    EmbeddingType.DOCUMENT);

            Plan retrieve = new RetrieveLocal(
                    fieldEmbeddings,
                    queryEmbeddings,
                    EmbeddingModel.NUMBER_OF_DIMENSIONS,
                    source.node(),
                    questionColumn.node(),
                    nColumn.node()
            );

            List<CompileEvaluationUtils.EvaluationField> fields = CompileEvaluationUtils.getEvaluationFields(table);
            FieldKey groundTruth = null;
            for (CompileEvaluationUtils.EvaluationField field : fields) {
                if (field.field().tableName().equals(tableName) && field.field().fieldName().equals(fieldName)) {
                    groundTruth = field.groundTruth();
                }
            }

            if (groundTruth == null) {
                throw new CompileError("EVALUATE_MODEL function takes incorrect table or field name");
            }

            Plan groundTruthTable = new SelectLocal(
                    context.field(groundTruth.tableName(), groundTruth.fieldName(), true).cast(CompiledSimpleColumn.class).node()
            );

            MRRLocal mrr = new MRRLocal(
                    retrieve,
                    new Get(retrieve, 0),
                    new Get(retrieve, 1),
                    groundTruthTable,
                    new Get(groundTruthTable, 0)
            );
            mrrByModel.add(new Plan.Source(mrr, List.of(new Get(mrr, 1))));
        });

        Plan evaluateModel = new EvaluateModelLocal(mrrByModel, EmbeddingModels.MODEL_NAMES);

        return new CompiledSimpleColumn(new Get(evaluateModel, 0), List.of(), GeneralFormat.INSTANCE);
    }

    private CompiledTable compileCommonRetrieve(CompileContext context) {
        if (!(context.argument(0) instanceof FieldReference fieldReference)) {
            throw new CompileError("The first argument of RETRIEVE should be a table field");
        }
        TableReference tableReference = (TableReference) fieldReference.table();

        String fieldName = fieldReference.field();
        String tableName = tableReference.table();

        List<CompiledSimpleColumn> args = compileArgs(
                context,
                List.of(SimpleColumnValidators.STRING, SimpleColumnValidators.DOUBLE, SimpleColumnValidators.STRING),
                1, 2, 3
        );

        List<FieldKey> dimensions = args.get(0).dimensions();
        CompiledTable currentTable = context.currentTable(dimensions);

        Plan queryEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                currentTable.node(),
                args.get(0).cast(CompiledSimpleColumn.class),
                null,
                currentTable.node(),
                args.get(2).cast(CompiledSimpleColumn.class),
                EmbeddingType.QUERY);

        List<CompiledColumn> fieldArgs = compileArgs(
                context,
                List.of(SimpleOrNestedValidators.STRING, SimpleOrNestedValidators.STRING),
                0, 3
        );

        Plan distinctedFields = distinctFieldWithDescription(context, tableName, fieldName);
        boolean hasDescription = distinctedFields.getMeta().getSchema().size() == 2;

        Plan modelTable = new SelectLocal(fieldArgs.get(1).expression());

        Plan fieldEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                distinctedFields,
                new CompiledSimpleColumn(new Get(distinctedFields, 0), List.of(), GeneralFormat.INSTANCE),
                hasDescription ? new CompiledSimpleColumn(new Get(distinctedFields, 1), List.of(), GeneralFormat.INSTANCE) : null,
                modelTable,
                new CompiledSimpleColumn(new Get(modelTable, 0), List.of(), GeneralFormat.INSTANCE),
                EmbeddingType.DOCUMENT
        );

        return currentTable.withNode(new RetrieveLocal(
                fieldEmbeddings,
                queryEmbeddings,
                EmbeddingModel.NUMBER_OF_DIMENSIONS,
                currentTable.node(),
                args.get(0).cast(CompiledSimpleColumn.class).node(),
                args.get(1).cast(CompiledSimpleColumn.class).node()
        ), true);
    }

    private CompiledResult compileRetrieve(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 0, GeneralFormat.INSTANCE);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 3)),
                    retrieve.dimensions(),
                    0,
                    1,
                    GeneralFormat.INSTANCE
            );
        }
    }

    private CompiledResult compileRetrieveScores(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 1, GeneralFormat.INSTANCE);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 2)),
                    retrieve.dimensions(),
                    0,
                    1,
                    GeneralFormat.INSTANCE
            );
        }
    }

    private CompiledResult compileRetrieveDescriptions(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 2, GeneralFormat.INSTANCE);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 1)),
                    retrieve.dimensions(),
                    0,
                    1,
                    GeneralFormat.INSTANCE
            );
        }
    }

    private CompiledResult compileRecall(CompileContext context) {
        TableArgs tableFunction = compileTableArgs(context, SimpleOrNestedValidators.STRING);

        CompiledTable source = tableFunction.table();
        CompiledSimpleColumn groundTruth = tableFunction.columns().get(0);

        Plan layout = context.layout(source.dimensions()).node().getLayout();

        Plan recall;
        if (source.hasCurrentReference()) {
            recall = new RecallLocal(
                    layout,
                    source.node(),
                    groundTruth.node(),
                    new Get(source.node(), 1),
                    source.currentReference()
            );
        } else {
            recall = new RecallLocal(
                    layout,
                    source.node(),
                    groundTruth.node(),
                    new Get(source.node(), 0)
            );
        }

        return new CompiledSimpleColumn(new Get(recall, 0), source.dimensions(), GeneralFormat.INSTANCE);
    }

    private CompiledResult compileSplit(CompileContext context) {
        List<CompiledSimpleColumn> args = compileArgs(context,
                List.of(SimpleColumnValidators.STRING, SimpleColumnValidators.STRING));
        CompiledSimpleColumn text = args.get(0);
        CompiledSimpleColumn delimiter = args.get(1);

        List<FieldKey> dimensions = text.dimensions();
        CompiledTable currentTable = context.currentTable(dimensions);

        SplitLocal split = new SplitLocal(currentTable.node(), text.node(), delimiter.node());
        int column = currentTable.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(split, dimensions, currentTable.currentRef(), column, GeneralFormat.INSTANCE);
    }

    private CompiledResult compileBetween(CompileContext context) {
        List<CompiledColumn> args = compileArgs(context, List.of(SimpleOrNestedValidators.STRING_OR_DOUBLE,
                SimpleOrNestedValidators.STRING_OR_DOUBLE, SimpleOrNestedValidators.STRING_OR_DOUBLE));

        ColumnType type = args.stream()
                .map(CompiledColumn::type)
                .reduce((left, right) -> left == right ? left : ColumnType.STRING)
                .orElse(ColumnType.DOUBLE);;
        ResultValidator<CompiledColumn> converter = SimpleOrNestedValidators.forType(type);
        args = args.stream().map(converter::convert).toList();

        return CompiledColumn.transform(args.get(0), args.get(1), args.get(2), (value, start, end) -> {
            Expression left = new BinaryOperator(value, start, BinaryOperation.GTE);
            Expression right = new BinaryOperator(value, end, BinaryOperation.LTE);
            return new BinaryOperator(left, right, BinaryOperation.AND);
        }, BooleanFormat.INSTANCE);
    }

    private CompiledTable compileSetOperation(String name, CompileContext context) {
        SetOperation operation = SetOperation.valueOf(name);
        CompiledNestedColumn leftColumn = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);
        CompiledNestedColumn rightColumn = context.compileArgument(1, NestedColumnValidators.STRING_OR_DOUBLE);

        if (leftColumn.type() != rightColumn.type()) {
            leftColumn = NestedColumnValidators.STRING.convert(leftColumn).cast(CompiledNestedColumn.class);
            rightColumn = NestedColumnValidators.STRING.convert(rightColumn).cast(CompiledNestedColumn.class);
        }

        List<FieldKey> dimensions = context.combine(leftColumn, rightColumn);
        Plan union;
        if (dimensions.isEmpty()) {
            union = new SetOperationLocal(
                    leftColumn.node(),
                    leftColumn.expression(),
                    rightColumn.node(),
                    rightColumn.expression(),
                    operation);
            return new CompiledNestedColumn(union, 0, leftColumn.format());
        }

        leftColumn = context.promote(leftColumn, dimensions).cast(CompiledNestedColumn.class);
        rightColumn = context.promote(rightColumn, dimensions).cast(CompiledNestedColumn.class);
        union = new SetOperationLocal(
                leftColumn.node(),
                leftColumn.currentReference(),
                leftColumn.expression(),
                rightColumn.node(),
                rightColumn.currentReference(),
                rightColumn.expression(),
                operation);
        return new CompiledNestedColumn(union, dimensions, 0, 1, leftColumn.format());
    }

    private CompiledColumn compileIn(CompileContext context) {
        CompiledColumn valueColumn = context.compileArgument(0, SimpleOrNestedValidators.STRING_OR_DOUBLE);
        CompiledNestedColumn sourceColumn = context.compileArgument(1, NestedColumnValidators.STRING_OR_DOUBLE);

        if (valueColumn.type() != sourceColumn.type()) {
            valueColumn = SimpleOrNestedValidators.STRING.convert(valueColumn);
            sourceColumn = NestedColumnValidators.STRING.convert(sourceColumn);
        }

        if (sourceColumn.dimensions().isEmpty()) {
            Expression sourceNode = sourceColumn.expression();
            return valueColumn.transform(
                    original -> new InLocal(List.of(original), List.of(sourceNode)),
                    BooleanFormat.INSTANCE);
        }

        List<FieldKey> dimensions = context.combine(sourceColumn.dimensions(), valueColumn.dimensions());
        valueColumn = context.promote(valueColumn, dimensions).cast(CompiledColumn.class);
        sourceColumn = context.promote(sourceColumn, dimensions).cast(CompiledNestedColumn.class);

        CompiledTable valueTable =  valueColumn instanceof CompiledNestedColumn nestedColumn ? nestedColumn
                : context.currentTable(dimensions);

        List<Expression>  valueKeys = List.of(valueTable.currentReference(), valueColumn.expression());
        List<Expression> sourceKeys = List.of(sourceColumn.currentReference(), sourceColumn.expression());

        Expression result = new InLocal(valueKeys, sourceKeys);
        return valueColumn.transform(original -> result, BooleanFormat.INSTANCE);
    }

    private TableArgs compileTableArgs(CompileContext context,
                                       ResultValidator<? extends CompiledColumn> nColumnValidator) {
        return compileTableArgs(context, Collections.nCopies(context.argumentCount() - 1, nColumnValidator));
    }

    /**
     * Compiles table arg and column args and aligns them to the common layout.
     */
    private TableArgs compileTableArgs(CompileContext context,
                                       List<ResultValidator<? extends CompiledColumn>> columnValidators) {

        context = context.withPlaceholder(context.argument(0)); // will be removed

        List<ResultValidator<CompiledResult>> validators = new ArrayList<>();
        validators.add((ResultValidator) TableValidators.NESTED);

        for (ResultValidator<? extends CompiledColumn> validator : columnValidators) {
            validators.add((ResultValidator) validator);
        }

        List<CompiledResult> results = compileArgs(context, validators);
        CompiledTable table = results.get(0).cast(CompiledTable.class);
        List<CompiledSimpleColumn> columns = results.subList(1, results.size()).stream()
                .map(arg -> arg.cast(CompiledNestedColumn.class).flat())
                .toList();

       return new TableArgs(table, columns);
    }

    private record TableArgs(CompiledTable table, List<CompiledSimpleColumn> columns) {
    }
}
