package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.PythonExpression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.PythonPlan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class CompilePython {

    @SneakyThrows
    public CompiledResult compile(CompileContext context, ParsedPython.Function function) {
        String code = function.code();
        String name = function.name();

        List<ResultType> args = function.parameters().stream().map(parameter -> type(parameter.type())).toList();
        ResultType result = type(function.result().type());

        if (!result.isNested() && args.stream().noneMatch(ResultType::isNested)) {
            return compilePythonExpression(context, code, name, args, result);
        }

        return compilePythonPlan(context, code, name, args, result);
    }

    private CompiledResult compilePythonPlan(CompileContext context, String code, String name,
                                             List<ResultType> argumentTypes, ResultType resultType) {

        IntArrayList nestedPositions = new IntArrayList();
        IntArrayList simplePositions = new IntArrayList();

        List<CompiledNestedColumn> nestedArgs = new ArrayList<>();
        List<CompiledSimpleColumn> simpleArgs = new ArrayList<>();
        List<FieldKey> dimensions = List.of();

        for (int i = 0; i < argumentTypes.size(); i++) {
            ResultType type = argumentTypes.get(i);

            if (type.isNested()) {
                ResultValidator<CompiledNestedColumn> validator = NestedColumnValidators.forType(type.columnType());
                CompiledNestedColumn argument = context.compileArgument(i, validator);
                dimensions = context.combine(dimensions, argument.dimensions());
                nestedArgs.add(argument);
                nestedPositions.add(i);
            } else {
                ResultValidator<CompiledSimpleColumn> validator = SimpleColumnValidators.forType(type.columnType());
                CompiledSimpleColumn argument = context.compileArgument(i, validator);
                dimensions = context.combine(dimensions, argument.dimensions());
                simpleArgs.add(argument);
                simplePositions.add(i);
            }
        }

        CompiledTable layout = context.currentTable(dimensions);
        List<Plan.Source> sources = new ArrayList<>();
        List<Expression> expressions = new ArrayList<>();

        for (CompiledSimpleColumn arg : simpleArgs) {
            arg = context.promote(arg, dimensions).cast(CompiledSimpleColumn.class);
            expressions.add(arg.node());
        }

        sources.add(Plan.sourceOf(layout.node(), expressions));

        for (CompiledNestedColumn arg : nestedArgs) {
            CompiledNestedColumn column = context.promote(arg, dimensions).cast(CompiledNestedColumn.class);
            Plan plan = column.node();
            List<Expression> keyValue = column.hasCurrentReference()
                    ? List.of(column.currentReference(), column.expression())
                    : List.of(column.expression());

            sources.add(Plan.sourceOf(plan, keyValue));
        }

        PythonPlan plan = new PythonPlan(sources,
                nestedPositions.toIntArray(), simplePositions.toIntArray(),
                code, name, resultType.columnType(), resultType.isNested(), layout.scalar());

        int column = plan.getMeta().getSchema().size() - 1;
        return resultType.isNested()
                ? new CompiledNestedColumn(plan, dimensions, layout.currentRef(), column)
                : new CompiledSimpleColumn(new Get(plan, column), dimensions);
    }

    private CompiledResult compilePythonExpression(CompileContext context, String code, String name,
                                                   List<ResultType> argumentTypes, ResultType resultType) {
        List<ResultValidator<CompiledColumn>> validators = argumentTypes.stream()
                .map(type -> SimpleOrNestedValidators.forType(type.columnType())).toList();

        List<CompiledColumn> arguments = CompileFunction.compileArgs(context, validators);
        List<Expression> expressions = arguments.stream().map(CompiledColumn::expression).toList();
        ColumnType type = resultType.columnType();

        if (arguments.isEmpty()) {
            List<FieldKey> dimensions =  List.of();
            Plan layout = context.layout(dimensions).node();
            PythonExpression expression = new PythonExpression(layout, expressions, code, name, type);
            return new CompiledSimpleColumn(expression, dimensions);
        }

        CompiledColumn first = arguments.get(0);
        Plan layout = first.node().getLayout();
        PythonExpression expression = new PythonExpression(layout, expressions, code, name, type);
        return first.transform(ignore -> expression);
    }

    private ResultType type(String type) {
        return switch (type) {
            case "str" -> new ResultType(null, null, ColumnType.STRING, false);
            case "float" -> new ResultType(null, null, ColumnType.DOUBLE, false);
            case "list[str]" -> new ResultType(null, null, ColumnType.STRING, true);
            case "list[float]" -> new ResultType(null, null, ColumnType.DOUBLE, true);
            default -> throw new IllegalArgumentException("Unsupported type: " + type
                    + ". Supported types: str, float, list[str], list[float]");
        };
    }
}