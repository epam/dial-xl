package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledReferenceTable;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingModels;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledInputTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRowTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTotalTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.Concatenate;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.If;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.expression.TernaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryFunction;
import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.DateRangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.EmbeddingIndexLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.EvaluateModelLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.EvaluateNLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Fields;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ListLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.MRRLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedAggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RecallLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieveLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimpleAggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SplitLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.TokensCountLocal;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable.REF_NA;

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
                    ((UnaryOperator) context.function()).operation());
            case "BinaryOperator" -> compileBinaryOperator(context,
                    ((BinaryOperator) context.function()).operation());
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
            case "SUM", "AVERAGE", "MAX", "MIN", "STDEVS", "STDEVP", "GEOMEAN", "MEDIAN" ->
                    compileDoubleAggregation(name, context);
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
            case "CORREL" -> compileCorrelation(context);
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
            default -> throw new CompileError("Unsupported function: " + name);
        };
    }

    private CompiledResult compileUnaryFunction(String name, CompileContext context) {
        UnaryFunction.Type function = UnaryFunction.Type.valueOf(name);
        CompiledColumn arg = context.compileArgument(
                0, function.getArgumentType() == null
                        ? SimpleOrNestedValidators.ANY
                        : SimpleOrNestedValidators.forType(function.getArgumentType()));

        CompiledSimpleColumn flatArg = context.flattenArguments(List.of(arg)).get(0);

        Expression expression = new UnaryFunction(flatArg.node(), function);
        return context.nestResultIfNeeded(expression, List.of(arg), arg.dimensions());
    }

    private CompiledResult compileBinaryFunction(String name, CompileContext context) {
        BinaryFunction.Type function = BinaryFunction.Type.valueOf(name);
        List<CompiledColumn> args = compileExpressions(context, List.of(
                SimpleOrNestedValidators.forType(function.getArgument1Type()),
                SimpleOrNestedValidators.forType(function.getArgument2Type())));

        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);
        CompiledSimpleColumn first = flatArgs.get(0);
        CompiledSimpleColumn second = flatArgs.get(1);

        BinaryFunction expression = new BinaryFunction(first.node(), second.node(), function);
        return context.nestResultIfNeeded(expression, args, first.dimensions());
    }

    private CompiledResult compileTernaryFunction(String name, CompileContext context) {
        TernaryFunction.Type function = TernaryFunction.Type.valueOf(name);
        List<CompiledColumn> args = compileExpressions(context, List.of(
                SimpleOrNestedValidators.forType(function.getArgument1Type()),
                SimpleOrNestedValidators.forType(function.getArgument2Type()),
                SimpleOrNestedValidators.forType(function.getArgument3Type())));

        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);
        CompiledSimpleColumn first = flatArgs.get(0);
        CompiledSimpleColumn second = flatArgs.get(1);
        CompiledSimpleColumn third = flatArgs.get(2);

        TernaryFunction expression = new TernaryFunction(first.node(), second.node(), third.node(), function);
        return context.nestResultIfNeeded(expression, args, first.dimensions());
    }

    private CompiledResult compileUnaryOperator(CompileContext context, UnaryOperation operation) {
        CompiledColumn arg = context.compileArgument(0, SimpleOrNestedValidators.DOUBLE);

        CompiledSimpleColumn flatArg = context.flattenArguments(List.of(arg)).get(0);

        Expression expression = new com.epam.deltix.quantgrid.engine.node.expression.UnaryOperator(
                flatArg.node(), operation);

        return context.nestResultIfNeeded(expression, List.of(arg), flatArg.dimensions());
    }

    private CompiledResult compileBinaryOperator(
            CompileContext context, BinaryOperation operation) {

        if (operation == BinaryOperation.CONCAT) {
           return compileConcatenate(context);
        }

        List<CompiledColumn> args = compileExpressions(
            context,
            operation.isAllowStrings() ?
            List.of(SimpleOrNestedValidators.STRING_OR_DOUBLE, SimpleOrNestedValidators.STRING_OR_DOUBLE) :
            List.of(SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.DOUBLE)
        );

        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);

        CompiledSimpleColumn left = flatArgs.get(0);
        CompiledSimpleColumn right = flatArgs.get(1);

        if (operation.isAllowStrings() && (left.type().isString() != right.type().isString())) {
            left = SimpleColumnValidators.STRING.convert(left);
            right = SimpleColumnValidators.STRING.convert(right);
        }

        CompileUtil.verify(ColumnType.isClose(left.type(), right.type())
                        && (left.type().isDouble() || left.type().isString()),
                "The operation %s cannot be applied to the incompatible types %s and %s",
                operation, left.type(), right.type());

        CompileUtil.verify(left.type().isDouble() || operation.isAllowStrings(),
                "The operation %s cannot be applied to the STRING type", operation);

        Expression binop = new com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator(
                left.node(), right.node(), operation);

        return context.nestResultIfNeeded(binop, args, left.dimensions());
    }

    private CompiledColumn compileRow(CompileContext context) {
        if (context.key().isOverride()) {
            // query reference points to the row at which ROW() is being compiled in
            CompiledTable table = context.overrideRowTable();
            Get get = table.queryReference();
            Expression row = CompileUtil.plus(context, table, get, 1);
            return new CompiledSimpleColumn(row, table.dimensions());
        } else if (context.promotedTable() != null) {
            Get get = context.promotedTable.currentReference();
            Expression row = CompileUtil.plus(context, context.promotedTable, get, 1);
            return new CompiledSimpleColumn(row, context.promotedTable.dimensions());
        } else {
            CompiledTable layout = context.layout();
            RowNumber number = new RowNumber(layout.node());
            Expression row = CompileUtil.plus(context, layout, number, 1);
            return new CompiledSimpleColumn(row, layout.dimensions());
        }
    }

    private CompiledResult compileRange(CompileContext context) {
        CompileUtil.verify(context.promotedTable() == null, "RANGE function cannot be used within another formula");

        List<FieldKey> dimensions = context.collectArgument(0);
        CompiledTable source = context.currentTable(dimensions);
        CompileContext nestedContext = context.withCompiledAndPromoted(source, source, false);
        CompiledSimpleColumn count = nestedContext.compileArgument(0, SimpleColumnValidators.INTEGER);

        RangeLocal range = new RangeLocal(source.node(), count.node());
        int column = source.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(range, dimensions, source.currentRef(), column);
    }

    private CompiledResult compileFilter(CompileContext context) {
        TableWithColumns tableFunction = compileTableWithColumns(context, SimpleOrNestedValidators.BOOLEAN);

        CompiledTable source = tableFunction.promotedTable();
        CompiledSimpleColumn condition = tableFunction.columns.get(0);
        FilterLocal filter = new FilterLocal(source.node(), condition.node());

        return source.withNode(filter);
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
            types.add(ColumnType.INTEGER);
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

            if (argument instanceof ConstText || argument instanceof ConstNumber) {
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

        CompiledTable flatRightTable = rightTable.withNested(false);
        List<String> rightNames = flatRightTable.keys(context);
        int keyCount = context.argumentCount() - 1;
        List<Expression> rightKeys = new ArrayList<>(keyCount);

        if (rightNames.isEmpty()) {
            CompileUtil.verify(keyCount == 1,
                    "%s must have 1 expression for a table without keys",
                    context.functionName());

            rightKeys.add(flatRightTable.queryReference());
        } else {
            CompileUtil.verify(keyCount == rightNames.size(),
                    "%s must have %d expressions, but supplied: %d",
                    context.functionName(), rightNames.size(), keyCount);

            String rightTableName = flatRightTable.name();
            for (String name : rightNames) {
                CompiledSimpleColumn key = flatRightTable.field(context, name)
                        .cast(CompiledSimpleColumn.class, (expected, actual) ->
                                "The key '%s' of table '%s' must be a %s, but was %s".formatted(
                                        name, rightTableName, expected, actual));
                rightKeys.add(key.node());
            }
        }

        List<FieldKey> leftDims = context.collectArguments(1, context.argumentCount());
        List<Expression> leftKeys = new ArrayList<>();
        CompiledTable leftTable = context.currentTable(leftDims);
        CompileContext leftContext = context.with(leftTable, false);

        if (rightNames.isEmpty()) {
            CompiledColumn key = leftContext.compileArgument(1, SimpleColumnValidators.INTEGER);
            CompiledSimpleColumn flatKey = context.flattenArgument(key);
            leftKeys.add(CompileUtil.plus(leftContext, leftTable, flatKey.node(), -1));
        } else {

            leftKeys = context.flattenArguments(IntStream.range(1, context.argumentCount()).mapToObj(i -> {
                    ColumnType expectedType = rightKeys.get(i - 1).getType();
                    return leftContext.compileArgument(i, SimpleColumnValidators.forType(expectedType));
            }).toList()).stream().map(CompiledSimpleColumn::node).toList();

        }
        for (int i = 0; i < leftKeys.size(); ++i) {
            CompileUtil.verifySameLayout(leftTable, leftKeys.get(i),
                    "FIND key #%d is not aligned with the table. List arguments are not supported", i+1);
        }

        Plan result = new JoinSingleLocal(leftTable.node(), flatRightTable.node(), leftKeys, rightKeys);
        int rightColumnsStart = leftTable.node().getMeta().getSchema().size();

        if (rightColumnsStart > 0) {
            result = CompileUtil.selectColumns(result, rightColumnsStart);
        }

        return flatRightTable.withNode(result).withDimensions(leftTable.dimensions());
    }

    private CompiledResult compileUnique(CompileContext context) {
        CompiledNestedColumn source = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);

        List<Expression> keys = new ArrayList<>();

        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }

        keys.add(source.flat().node());

        DistinctByLocal distinct = new DistinctByLocal(source.node(), keys);
        return source.withNode(distinct);
    }

    private CompiledResult compileUniqueBy(CompileContext context) {
        TableWithColumns tableWithColumns = compileTableWithColumns(context, SimpleOrNestedValidators.STRING_OR_DOUBLE);

        CompiledTable source = tableWithColumns.promotedTable();
        List<Expression> keys = new ArrayList<>();
        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }
        keys.addAll(tableWithColumns.columns.stream().map(CompiledSimpleColumn::node).toList());

        DistinctByLocal distinct = new DistinctByLocal(source.node(), keys);
        return source.withNode(distinct);
    }

    private CompiledResult compileSort(CompileContext context) {
        CompiledNestedColumn source = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);
        TableWithColumns tableWithColumns = new TableWithColumns(source, source, List.of(source.flat()));

        return compileSortBy(tableWithColumns);
    }

    private CompiledResult compileSortBy(CompileContext context) {
        TableWithColumns tableWithColumns = compileTableWithColumns(context, NestedColumnValidators.STRING_OR_DOUBLE);
        return compileSortBy(tableWithColumns);
    }

    private CompiledResult compileSortBy(TableWithColumns tableWithColumns) {
        CompiledTable source = tableWithColumns.promotedTable();
        List<Expression> keys = new ArrayList<>();
        if (source.hasCurrentReference()) {
            keys.add(source.currentReference());
        }
        keys.addAll(tableWithColumns.columns().stream().map(CompiledSimpleColumn::node).toList());

        boolean[] ascending = new boolean[keys.size()];
        Arrays.fill(ascending, true);

        OrderByLocal order = new OrderByLocal(source.node(), keys, ascending);
        return source.withNode(order);
    }

    private CompiledSimpleColumn compileCount(CompileContext context) {
        CompiledTable source = context.compileArgument(0, TableValidators.NESTED);
        return compileCount(context, source, false);
    }

    CompiledSimpleColumn compileCount(CompileContext context, CompiledTable source, boolean all) {
        CompileUtil.verify(source.nested());
        AggregateFunction function = all ? AggregateFunction.COUNT_ALL : AggregateFunction.COUNT;

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Expression value;
        Plan aggregate;

        if (source instanceof CompiledNestedColumn column) {
            value = column.flat().node();
        } else {
            value = source.queryReference();
        }

        if (source.hasCurrentReference()) {
            Expression key = source.currentReference();
            aggregate = new NestedAggregateLocal(function, layout, source.node(), key, value);
        } else {
            aggregate = new SimpleAggregateLocal(function, layout, source.node(), value);
        }

        Get column = new Get(aggregate, 0);
        return new CompiledSimpleColumn(column, source.dimensions());
    }

    private CompiledResult compileDoubleAggregation(String name, CompileContext context) {
        AggregateFunction function = AggregateFunction.valueOf(name);
        CompiledNestedColumn source = context.compileArgument(
                0, NestedColumnValidators.DOUBLE);

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
        return new CompiledSimpleColumn(column, source.dimensions());
    }

    private CompiledResult compileFirstLastSingle(String name, CompileContext context) {
        AggregateFunction function = AggregateFunction.valueOf(name);
        CompiledTable source = context.compileArgument(0, TableValidators.NESTED);

        return compileRowAggregation(function, context, new TableWithColumns(source, source, List.of()));
    }

    private CompiledResult compileIndex(CompileContext context) {
        TableWithColumns tableWithColumns = compileTableWithColumns(context, SimpleOrNestedValidators.DOUBLE);
        CompiledSimpleColumn indexColumn = tableWithColumns.columns().get(0);
        Expression index = CompileUtil.plus(context, tableWithColumns.promotedTable(), indexColumn.node(), -1);

        return compileRowAggregation(
                AggregateFunction.INDEX, context, new TableWithColumns(tableWithColumns.compiledTable(), tableWithColumns.promotedTable(),
                        List.of(new CompiledSimpleColumn(index, indexColumn.dimensions()))));

    }

    private CompiledResult compileRowAggregationByDouble(String name, CompileContext context) {
        AggregateFunction function = AggregateFunction.valueOf(name);
        TableWithColumns tableWithColumns = compileTableWithColumns(context, SimpleOrNestedValidators.DOUBLE);

        return compileRowAggregation(function, context, tableWithColumns);
    }

    private CompiledResult compileRowAggregation(
            AggregateFunction function, CompileContext context, TableWithColumns tableWithColumns) {
        CompiledTable source = tableWithColumns.promotedTable();

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();
        Plan aggregate;

        List<Expression> expressions = tableWithColumns.columns.stream().map(CompiledSimpleColumn::node).toList();
        if (source.hasCurrentReference()) {
            Expression key = source.currentReference();
            aggregate = new NestedAggregateLocal(function, layout, plan, key, expressions);
        } else {
            aggregate = new SimpleAggregateLocal(function, layout, plan, expressions);
        }

        return source.withNode(aggregate).flat();
    }

    private CompiledResult compileFirstsLasts(String name, CompileContext context) {
        AggregateFunction function = switch (name) {
            case "FIRST" -> AggregateFunction.FIRSTS;
            case "LAST" -> AggregateFunction.LASTS;
            default -> throw new CompileError(name + " function takes invalid number of arguments");
        };

        TableWithColumns tableFunction = compileTableWithColumns(context, SimpleOrNestedValidators.DOUBLE);
        CompiledTable source = tableFunction.promotedTable();
        CompiledSimpleColumn limit = tableFunction.columns.get(0);

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

    private CompiledResult compilePeriodSeries(CompileContext context) {
        TableWithColumns tableWithColumns = compileTableWithColumns(
                context, List.of(SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.DOUBLE, SimpleOrNestedValidators.STRING));

        CompiledTable source = tableWithColumns.promotedTable();
        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(tableWithColumns.columns);

        CompiledSimpleColumn timestamp = flatArgs.get(0);
        CompiledSimpleColumn value = flatArgs.get(1);
        CompiledSimpleColumn period = flatArgs.get(2);


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
        return new CompiledSimpleColumn(result, source.dimensions());
    }

    private CompiledResult compileDateRange(CompileContext context) {
        CompileUtil.verify(context.promotedTable() == null, "DATERANGE function cannot be used within another formula");

        List<FieldKey> dimensions = context.collectArguments(0, context.argumentCount());
        CompiledTable currentTable = context.currentTable(dimensions);
        CompileContext currentContext = context.with(currentTable, false);

        List<CompiledSimpleColumn> args;

        int argumentCount = currentContext.argumentCount();
        if (argumentCount == 2) {
            args = compileExpressions(
                    currentContext,
                    List.of(SimpleColumnValidators.DOUBLE, SimpleColumnValidators.DOUBLE)
            );
        } else if (argumentCount == 3) {
            args = compileExpressions(
                    currentContext,
                    List.of(SimpleColumnValidators.DOUBLE, SimpleColumnValidators.DOUBLE, SimpleColumnValidators.INTEGER)
            );
        } else {
            args = compileExpressions(
                    currentContext,
                    List.of(SimpleColumnValidators.DOUBLE, SimpleColumnValidators.DOUBLE, SimpleColumnValidators.INTEGER, SimpleColumnValidators.INTEGER)
            );
        }

        CompiledSimpleColumn date1 = args.get(0);
        CompiledSimpleColumn date2 = args.get(1);
        CompiledSimpleColumn increment = argumentCount >= 3 ? args.get(2) : context.flattenArgument(CompileUtil.number(context, currentTable, 1));
        CompiledSimpleColumn dateType = argumentCount >= 4 ? args.get(3) : context.flattenArgument(CompileUtil.number(context, currentTable, 4));

        DateRangeLocal dateRangeLocal = new DateRangeLocal(
                currentTable.node(),
                date1.node(),
                date2.node(),
                increment.node(),
                dateType.node()
        );

        int column = currentTable.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(dateRangeLocal, dimensions, currentTable.currentRef(), column);
    }

    private CompiledNestedColumn compileList(CompileContext context) {
        ColumnType type = compileExpressions(context, SimpleColumnValidators.STRING_OR_DOUBLE).stream()
                .map(column -> {
                    CompileUtil.verify(column.dimensions().isEmpty(), "LIST function supports only scalar values");
                    return column.type();
                }).reduce((left, right) -> {
                    ColumnType result = ColumnType.closest(left, right);
                    return (result == null) ? ColumnType.STRING : result;
                }).orElse(ColumnType.DOUBLE);

        List<Expression> expressions = compileExpressions(context, SimpleColumnValidators.forType(type)).stream()
                .map(CompiledSimpleColumn::node).toList();

        ListLocal plan = new ListLocal(context.scalarLayout().node(), expressions);
        return new CompiledNestedColumn(plan, 0);
    }

    private CompiledSimpleColumn compileExtrapolate(CompileContext context) {
        CompiledSimpleColumn argument = context.compileArgument(0, SimpleColumnValidators.PERIOD_SERIES);
        Extrapolate expression = new Extrapolate(argument.node());
        return new CompiledSimpleColumn(expression, argument.dimensions());
    }

    private CompiledSimpleColumn compilePercentChange(CompileContext context) {
        CompiledSimpleColumn argument = context.compileArgument(0, SimpleColumnValidators.PERIOD_SERIES);
        PercentChange expression = new PercentChange(argument.node());
        return new CompiledSimpleColumn(expression, argument.dimensions());
    }

    private CompiledResult compileInput(CompileContext context) {
        String inputPath = context.constStringArgument(0);

        InputProvider inputProvider = context.inputProvider();
        InputMetadata metadata = inputProvider.readMetadata(inputPath, context.principal());

        InputLocal input = new InputLocal(metadata, inputProvider, context.principal());
        List<String> columnNames = List.copyOf(metadata.columnTypes().keySet());
        List<ColumnType> columnTypes = List.copyOf(metadata.columnTypes().values());

        SelectLocal select = new SelectLocal(new RowNumber(input));
        return new CompiledInputTable(input, columnNames, columnTypes, select);
    }

    private CompiledResult compileConcatenate(CompileContext context) {
        List<CompiledColumn> args = compileExpressions(
                context, Collections.nCopies(context.argumentCount(), SimpleOrNestedValidators.STRING_OR_DOUBLE));
        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);

        List<Expression> expressions = new ArrayList<>(args.size());
        for (CompiledSimpleColumn arg : flatArgs) {
            ColumnType type = arg.type();

            if (type.isString()) {
                expressions.add(arg.node());
            } else {
                // excel CONCAT handles dates differently compare to TEXT function
                Text text = new Text(arg.node(), (type == ColumnType.DATE) ? ColumnType.DOUBLE : type, null);
                expressions.add(text);
            }
        }

        Expression expression = (expressions.size()) == 1 ? expressions.get(0) : new Concatenate(expressions);
        return context.nestResultIfNeeded(expression, args, args.get(0).dimensions());
    }

    private CompiledResult compileText(CompileContext context) {
        CompiledColumn argument = context.compileArgument(0, SimpleOrNestedValidators.DOUBLE);

        String formatting = null;
        if (context.argumentCount() == 2) {
            // TODO: support dynamic formatting
            formatting = context.constStringArgument(1);
        }

        Text text = new Text(context.flattenArgument(argument).node(), argument.type(), formatting);
        return context.nestResultIfNeeded(text, List.of(argument), argument.dimensions());
    }

    private CompiledResult compileIf(CompileContext context) {
        List<CompiledColumn> args = compileExpressions(context, List.of(
                SimpleOrNestedValidators.BOOLEAN,
                SimpleOrNestedValidators.ANY,
                SimpleOrNestedValidators.ANY));
        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);

        CompiledSimpleColumn condition = flatArgs.get(0);
        CompiledSimpleColumn left = flatArgs.get(1);
        CompiledSimpleColumn right = flatArgs.get(2);

        CompileUtil.verify(ColumnType.isClose(left.type(), right.type()),
                "IF function requires left and right arguments to have same type");

        If expression = new If(condition.node(), left.node(), right.node());
        return context.nestResultIfNeeded(expression, args, condition.dimensions());
    }

    private CompiledResult compileIfNa(CompileContext context) {
        List<CompiledColumn> args = compileExpressions(context, List.of(
                SimpleOrNestedValidators.ANY,
                SimpleOrNestedValidators.ANY));
        List<CompiledSimpleColumn> flatArgs = context.flattenArguments(args);

        CompiledSimpleColumn source = flatArgs.get(0);
        CompiledSimpleColumn fallback = flatArgs.get(1);

        CompileUtil.verify(ColumnType.isClose(source.type(), fallback.type()),
                "IFNA function requires source and fallback arguments to have same type");

        UnaryFunction condition = new UnaryFunction(source.node(), UnaryFunction.Type.ISNA);
        If expression = new If(condition, fallback.node(), source.node());
        return context.nestResultIfNeeded(expression, args, source.dimensions());
    }

    private CompiledResult compileMode(CompileContext context) {
        CompiledNestedColumn source = context.compileArgument(0, NestedColumnValidators.STRING_OR_DOUBLE);

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
        return new CompiledSimpleColumn(column, source.dimensions());
    }

        private CompiledResult compileCorrelation(CompileContext context) {
        TableWithColumns tableWithColumns = compileTableWithColumns(context, NestedColumnValidators.DOUBLE);
        CompiledTable source = tableWithColumns.promotedTable();
        Expression left = tableWithColumns.columns().get(0).node();
        Expression right = tableWithColumns.columns().get(1).node();

        Plan layout = context.aggregationLayout(source).node().getLayout();
        Plan plan = source.node();

        Plan aggregate;

        if (source.hasCurrentReference()) {
            Get key = source.currentReference();
            aggregate = new NestedAggregateLocal(AggregateFunction.CORRELATION, layout, plan, key, left, right);
        } else {
            aggregate = new SimpleAggregateLocal(AggregateFunction.CORRELATION, layout, plan, left, right);
        }

        Get column = new Get(aggregate, 0);
        return new CompiledSimpleColumn(column, source.dimensions());
    }

    private CompiledResult compileFields(CompileContext context) {
        CompiledTable table = context.compileArgument(0, TableValidators.TABLE);
        return compileFields(context, table, true);
    }

    private CompiledTotalTable compileTotal(CompileContext context) {
        Formula arg1 = context.argument(0);
        Formula arg2 = context.argumentCount() > 1 ? context.argument(1) : new ConstNumber(1);

        CompileUtil.verify(arg1 instanceof TableReference, "TOTAL function requires table reference in 1 argument");
        CompileUtil.verify(arg2 instanceof ConstNumber, "TOTAL function requires constant number in 2 argument");

        String name = ((TableReference) arg1).table();
        int number = (int) ((ConstNumber) arg2).number();

        ParsedTable table = context.parsedTable(name);

        CompileUtil.verify(table.total() != null, "Table: %s does not have total definition", name);
        CompileUtil.verify(number > 0, "TOTAL function requires positive number in 2 argument");
        CompileUtil.verify(number <= table.total().size(), "Table: %s has only %d total definitions",
                name, table.total().size());

        // CompiledTotalTable requires some node, with queryReference column. We create a dummy one.
        SelectLocal dummyNode = new SelectLocal(new Constant(0));
        return new CompiledTotalTable(table, dummyNode, number);
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

    protected <T extends CompiledResult> List<T> compileExpressions(CompileContext context, ResultValidator<T> validator) {
        return compileExpressions(context, Collections.nCopies(context.argumentCount(), validator));
    }

    <T extends CompiledResult> List<T> compileExpressions(
            CompileContext context,
            List<ResultValidator<T>> columnValidators) {
        return compileExpressions(context, columnValidators, IntStream.range(0, columnValidators.size()).toArray());
    }

    <T extends CompiledResult> List<T> compileExpressions(
            CompileContext context,
            List<ResultValidator<T>> columnValidators,
            int... indexes) {
        CompileUtil.verify(columnValidators.size() == indexes.length);

        List<T> columns = new ArrayList<>();
        for (int i = 0; i < columnValidators.size(); ++i) {
            columns.add(context.compileArgument(indexes[i], columnValidators.get(i)));
        }

        List<FieldKey> dimensions = columns.stream().map(CompiledResult::dimensions)
                .reduce(List.of(), context::combine);

        ArrayList<T> result = new ArrayList<>(columns.size());
        for (int i = 0; i < columns.size(); ++i) {
            T col = columns.get(i);
            if (col instanceof CompiledSimpleColumn && col.scalar()) {
                result.add(col);
            } else {
                result.add(context.promote(col, dimensions).cast(columnValidators.get(i).getExpectedType()));
            }
        }

        boolean hasNested = columns.stream().anyMatch(CompiledNestedColumn.class::isInstance);

        if (hasNested) {
            List<CompiledNestedColumn> nestedColumns = result.stream().filter(CompiledNestedColumn.class::isInstance)
                    .map(CompiledNestedColumn.class::cast).toList();

            CompiledTable sourceTable = null;

            if (!nestedColumns.isEmpty()) {
                CompiledNestedColumn first = nestedColumns.get(0);
                if (context.promotedTable == null || !context.promotedTable.hasSameLayout(first)) {
                    sourceTable = first;
                }
            }

            if (sourceTable == null) {
                if (context.layout != null) {
                    sourceTable = context.layout;
                } else {
                    sourceTable = context.promotedTable;
                }
            }
            alignWithNestedTable(context, sourceTable, result);

        } else if (!result.stream().allMatch(CompiledResult::scalar)) {
            for (int i = 0; i < result.size(); ++i) {
                if (result.get(i) instanceof CompiledSimpleColumn column) {
                    CompiledSimpleColumn promCol = context.flattenArgument(context.promote(column, dimensions).cast(columnValidators.get(i).getExpectedType()));
                    if (context.isContextTablePromoted() && context.compiledTable.hasSameLayout(promCol)) {
                        promCol = new CompiledSimpleColumn(CompileUtil.projectColumn(context.promotedTable.queryReference(), promCol.node()), promCol.dimensions());
                    }
                    result.set(i, (T) promCol);
                }
            }
        }
        result.forEach(c -> CompileUtil.verifySameLayout(c, result.get(0),
                "You cannot use %s with lists of different origin.", context.function.operationSymbol()));

        return result;
    }

    // This is not the same as promotion. It's mostly for cases when nested and nested values (of the same
    // dimensionality) are used in the same expression.
    public <T extends CompiledResult> void alignWithNestedTable(CompileContext context, CompiledTable sourceTable,
                                                                List<T> result) {

        com.epam.deltix.quantgrid.engine.compiler.function.Function functionSpec =
                context.compiler.getFunctionSpecSafe(context.functionName());

        for (int i = 0; i < result.size(); ++i) {

            if (result.get(i) instanceof CompiledSimpleColumn column) {
                Expression dataExpression;
                if (column.scalar()) {
                    dataExpression = new Expand(sourceTable.node(), column.node());
                } else if (sourceTable.hasSameLayout(column)) {
                    dataExpression = column.node();
                } else {
                    dataExpression = CompileUtil.projectColumn(sourceTable.currentReference(), column.node());
                }

                result.set(i, (T) (sourceTable.hasCurrentReference()
                        ? new CompiledNestedColumn(new SelectLocal(sourceTable.currentReference(), dataExpression), sourceTable.dimensions(), 0, 1)
                        : new CompiledNestedColumn(new SelectLocal(dataExpression), sourceTable.dimensions(), REF_NA, 0)));
            }
            // Table and columns are expected to have same layout. Formulas like A.FILTER(B[x]) are not yet supported.
            CompileUtil.verifySameLayout(sourceTable, result.get(i),
                    "%s table and %s are not aligned.", context.function().operationSymbol(),
                    // For var arg functions last argument name will be used for vararg
                    functionSpec == null ? "arg" + (i+1)
                    : functionSpec.arguments().get(Math.min(i + 1, functionSpec.arguments().size() - 1)).name());
        }
    }

    private CompiledSimpleColumn compilePi() {
        return new CompiledSimpleColumn(new Constant(Math.PI), List.of());
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

        final String questionFieldName = CompileEvaluationUtils.getEvaluationQuestionField(table);
        CompiledSimpleColumn questionColumn = source.field(context, questionFieldName).cast(CompiledSimpleColumn.class);

        CompileContext currentContext = context.with(source, false);
        CompiledSimpleColumn nColumn =
                CompileUtil.number(currentContext, source, Integer.MAX_VALUE).cast(CompiledSimpleColumn.class);

        final List<Plan> retrievers = new ArrayList<>();
        final List<Plan> groundTruths = new ArrayList<>();
        final List<Plan> tokens = new ArrayList<>();

        List<CompileEvaluationUtils.EvaluationField> evaluationFields =
                CompileEvaluationUtils.getEvaluationFields(table);
        int targetId = -1;
        for (CompileEvaluationUtils.EvaluationField evaluationField : evaluationFields) {
            if (evaluationField.field().tableName().equals(tableName) &&
                    evaluationField.field().fieldName().equals(fieldName)) {
                targetId = retrievers.size();
            }

            FieldKey descriptionField = CompileEvaluationUtils.getDescriptionField(context, evaluationField.field());
            Formula concatenatedField = concatenateDescription(evaluationField.field(), descriptionField);

            Plan distinctedFields = distinctFieldWithDescription(context, evaluationField.field().tableName(),
                    evaluationField.field().fieldName(), descriptionField, concatenatedField);

            CompiledSimpleColumn evaluatedModel = context.compileFormula(
                    new com.epam.deltix.quantgrid.parser.ast.Function(
                            "EVALUATE_MODEL",
                            new FieldReference(
                                    new TableReference(evaluationField.field().tableName()), evaluationField.field().fieldName()
                            )
                    )
            ).cast(CompiledSimpleColumn.class);

            Plan modelTable = new SelectLocal(evaluatedModel.node());

            Plan queryEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                    source.node(),
                    questionColumn,
                    null,
                    modelTable,
                    new CompiledSimpleColumn(new Get(modelTable, 0), List.of()),
                    EmbeddingType.QUERY);

            Plan fieldEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                        distinctedFields,
                        new CompiledSimpleColumn(new Get(distinctedFields, 0), List.of()),
                        descriptionField != null ? new CompiledSimpleColumn(new Get(distinctedFields, 1), List.of()) : null,
                        modelTable,
                        new CompiledSimpleColumn(new Get(modelTable, 0), List.of()),
                        EmbeddingType.DOCUMENT);

            Plan retrieve = new RetrieveLocal(
                    fieldEmbeddings,
                    queryEmbeddings,
                    EmbeddingIndexLocal.NUMBER_OF_DIMENSIONS,
                    source.node(),
                    questionColumn.node(),
                    nColumn.node());

            retrievers.add(retrieve);

            Plan compiledConcatField = context.compileFormula(concatenatedField).cast(CompiledNestedColumn.class).node();

            Plan fieldTokens = new TokensCountLocal(
                    compiledConcatField,
                    new Get(compiledConcatField, 0)
            );

//          TODO: calculate max
//            Plan maxTokens = new SimpleAggregateLocal(AggregateFunction.MAX, fieldTokens.getLayout(),
//                    fieldTokens, new Get(fieldTokens, 0));

            tokens.add(fieldTokens);

            FieldKey groundTruth = evaluationField.groundTruth();
            groundTruths.add(new SelectLocal(context.field(groundTruth.tableName(), groundTruth.fieldName(), true)
                    .cast(CompiledSimpleColumn.class).node()));
        }

        if (targetId == -1) {
            throw new CompileError("EVALUATE_N function takes incorrect table or field name");
        }

        Plan evaluateN = new EvaluateNLocal(evaluationFields.size(), retrievers, tokens, groundTruths, context.scalarLayout().node());

        return new CompiledSimpleColumn(new Get(evaluateN, targetId), List.of());
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

        final String questionFieldName = CompileEvaluationUtils.getEvaluationQuestionField(table);
        CompiledSimpleColumn questionColumn = source.field(context, questionFieldName).cast(CompiledSimpleColumn.class);

        CompileContext currentContext = context.with(source, false);
        CompiledSimpleColumn nColumn =
                CompileUtil.number(currentContext, source, Integer.MAX_VALUE).cast(CompiledSimpleColumn.class);

        final List<Plan> mrrByModel = new ArrayList<>();

        Plan layout = context.scalarLayout().node();
        mrrByModel.add(layout);

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
                    new CompiledSimpleColumn(new Get(distinctedFields, 0), List.of()),
                    hasDescription ? new CompiledSimpleColumn(new Get(distinctedFields, 1), List.of()) : null,
                    modelName,
                    EmbeddingType.DOCUMENT);

            Plan retrieve = new RetrieveLocal(
                    fieldEmbeddings,
                    queryEmbeddings,
                    EmbeddingIndexLocal.NUMBER_OF_DIMENSIONS,
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

            mrrByModel.add(new MRRLocal(
                    retrieve,
                    new Get(retrieve, 0),
                    new Get(retrieve, 1),
                    groundTruthTable,
                    new Get(groundTruthTable, 0)
            ));
        });

        Plan evaluateModel = new EvaluateModelLocal(mrrByModel, EmbeddingModels.MODEL_NAMES);

        return new CompiledSimpleColumn(new Get(evaluateModel, 0), List.of());
    }

    private CompiledTable compileCommonRetrieve(CompileContext context) {
        if (!(context.argument(0) instanceof FieldReference fieldReference)) {
            throw new CompileError("The first argument of RETRIEVE should be a table field");
        }
        TableReference tableReference = (TableReference) fieldReference.table();

        String fieldName = fieldReference.field();
        String tableName = tableReference.table();

        List<FieldKey> dimensions = context.collectArguments(1, 4);
        CompiledTable currentTable = context.currentTable(dimensions);
        CompileContext currentContext = context.with(currentTable, false);

        List<CompiledSimpleColumn> args = compileExpressions(
                currentContext,
                List.of(SimpleColumnValidators.STRING, SimpleColumnValidators.INTEGER, SimpleColumnValidators.STRING),
                1, 2, 3
        );

        Plan queryEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                currentTable.node(),
                args.get(0).cast(CompiledSimpleColumn.class),
                null,
                currentTable.node(),
                args.get(2).cast(CompiledSimpleColumn.class),
                EmbeddingType.QUERY);

        List<FieldKey> fieldDimensions = context.combine(context.collectArgument(0), context.collectArgument(3));
        CompiledTable fieldCurrentTable = context.currentTable(fieldDimensions);
        CompileContext fieldContext = context.with(fieldCurrentTable, false);

        List<CompiledSimpleColumn> fieldArgs = context.flattenArguments(compileExpressions(
                fieldContext,
                List.of(SimpleOrNestedValidators.STRING, SimpleOrNestedValidators.STRING),
                0, 3
        ));

        Plan distinctedFields = distinctFieldWithDescription(context, tableName, fieldName);
        boolean hasDescription = distinctedFields.getMeta().getSchema().size() == 2;

        Plan modelTable = new SelectLocal(fieldArgs.get(1).node());

        Plan fieldEmbeddings = CompileEmbeddingIndex.compileEmbeddingIndex(
                distinctedFields,
                new CompiledSimpleColumn(new Get(distinctedFields, 0), List.of()),
                hasDescription ? new CompiledSimpleColumn(new Get(distinctedFields, 1), List.of()) : null,
                modelTable,
                new CompiledSimpleColumn(new Get(modelTable, 0), List.of()),
                EmbeddingType.DOCUMENT
        );

        return currentTable.withNode(new RetrieveLocal(
                fieldEmbeddings,
                queryEmbeddings,
                EmbeddingIndexLocal.NUMBER_OF_DIMENSIONS,
                currentTable.node(),
                args.get(0).cast(CompiledSimpleColumn.class).node(),
                args.get(1).cast(CompiledSimpleColumn.class).node()
        ), true);
    }

    private CompiledResult compileRetrieve(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 0);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 3)),
                    retrieve.dimensions(),
                    0,
                    1
            );
        }
    }

    private CompiledResult compileRetrieveScores(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 1);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 2)),
                    retrieve.dimensions(),
                    0,
                    1
            );
        }
    }

    private CompiledResult compileRetrieveDescriptions(CompileContext context) {
        CompiledTable retrieve = compileCommonRetrieve(context);

        if (!retrieve.hasCurrentReference()) {
            return new CompiledNestedColumn(new SelectLocal(new Get(retrieve.node(), 0)), 2);
        } else {
            int column = retrieve.node().getMeta().getSchema().size();

            return new CompiledNestedColumn(new SelectLocal(
                    new Get(retrieve.node(), retrieve.currentRef()), new Get(retrieve.node(), column - 1)),
                    retrieve.dimensions(),
                    0,
                    1
            );
        }
    }

    private CompiledResult compileRecall(CompileContext context) {
        TableWithColumns tableFunction = compileTableWithColumns(context, SimpleOrNestedValidators.STRING);

        CompiledTable source = tableFunction.promotedTable();
        CompiledSimpleColumn groundTruth = tableFunction.columns().get(0);

        Plan layout = context.aggregationLayout(source).node().getLayout();

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

        return new CompiledSimpleColumn(new Get(recall, 0), source.dimensions());
    }

    private CompiledResult compileSplit(CompileContext context) {
        List<FieldKey> dimensions = context.collectArguments(0, 2);
        CompiledTable currentTable = context.currentTable(dimensions);

        CompileContext nestedContext = context.withCompiledAndPromoted(currentTable, currentTable, false);

        List<CompiledSimpleColumn> compiledArgs = compileExpressions(nestedContext,
                List.of(SimpleColumnValidators.STRING, SimpleColumnValidators.STRING));
        CompiledSimpleColumn text = compiledArgs.get(0);
        CompiledSimpleColumn delimiter = compiledArgs.get(1);

        SplitLocal split = new SplitLocal(currentTable.node(), text.node(), delimiter.node());
        int column = currentTable.node().getMeta().getSchema().size();
        return new CompiledNestedColumn(split, dimensions, currentTable.currentRef(), column);
    }

    private <T extends CompiledColumn> TableWithColumns compileTableWithColumns(
            CompileContext context, ResultValidator<T> columnValidator) {
        return compileTableWithColumns(context, Collections.nCopies(context.argumentCount() - 1, columnValidator));
    }

    /**
     * Compilation include following steps:
     * 1. Compile arguments
     * 2. Promote to the least common dimensionality
     * 3. Align to nested source (or argument if some)
     * 4. Validations of layout (in most cases it's done in {@link #alignWithNestedTable} / {@link #compileExpressions}
     * (source verification is optional in SourceVerifier)
     * 5. {@link CompileContext#flattenArguments} the arguments
     * 6. (Optional for linear expressions) Nest result if needed {@link CompileContext#nestResultIfNeeded}
     */
    private <T extends CompiledColumn> TableWithColumns compileTableWithColumns(
            CompileContext context, List<ResultValidator<T>> columnValidators) {
        CompiledTable compiledTable = context.compileArgument(0, TableValidators.NESTED);
        List<FieldKey> dimensions = context.combine(
                compiledTable.dimensions(),
                context.collectArguments(1, columnValidators.size() + 1)
        );

        CompiledTable promotedTable = context.promote(compiledTable, dimensions).cast(CompiledTable.class);

        CompileContext nestedContext = context.withCompiledAndPromoted(promotedTable, compiledTable, false);
        List<CompiledResult> columns = new ArrayList<>();

        for (int i = 0; i < columnValidators.size(); i++) {
            CompiledResult column = nestedContext.compileArgument(i + 1, columnValidators.get(i));
            columns.add(nestedContext.promote(column, dimensions));
        }
        alignWithNestedTable(context, promotedTable, columns);

        return new TableWithColumns(compiledTable, promotedTable, context.flattenArguments(columns));
    }

    private record TableWithColumns(CompiledTable compiledTable, CompiledTable promotedTable, List<CompiledSimpleColumn> columns) {
    }
}
