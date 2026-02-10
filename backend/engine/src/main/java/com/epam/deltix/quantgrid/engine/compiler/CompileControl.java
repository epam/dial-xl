package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ControlRequest;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.FuzzyScore;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ControlValuesResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ListLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.rule.ConditionUtil;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.util.Doubles;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@UtilityClass
class CompileControl {

    boolean isControlTable(ParsedTable table) {
        return table.decorators().stream().anyMatch(decorator -> decorator.decoratorName().equals("control"));
    }

    boolean isControlTable(CompileContext context, String name) {
        ParsedTable table = context.parsedTable(name);
        return isControlTable(table);
    }

    void verifyControlFormula(Formula formula) {
        if (formula instanceof Function function) {
            switch (function.name()) {
                case "DROPDOWN", "CHECKBOX" -> {
                    return;
                }
            }
        }

        throw new CompileError("Invalid control formula, expected one of DROPDOWN, CHECKBOX functions");
    }

    ControlResult compile(CompileContext context) {
        CompileUtil.verify(isControlTable(context, context.key().table()),
                "Function %s can be used only in control table".formatted(context.functionName()));

        return switch (context.functionName()) {
            case "DROPDOWN" -> compileDropdown(context);
            case "CHECKBOX" -> compileCheckbox(context);
            default -> throw new CompileError("Unknown control: " + context.functionName());
        };
    }

    ControlResult compileDropdown(CompileContext context) {
        CompiledNestedColumn values = context.compileArgument(1, NestedColumnValidators.STRING_OR_DOUBLE);
        ResultValidator<CompiledSimpleColumn> converter = SimpleColumnValidators.forType(values.type());

        CompiledResult dependency = null;
        CompiledSimpleColumn results;
        CompiledNestedColumn condition = null;

        if (context.hasArgument(0)) {
            dependency = context.compileArgument(0, TableValidators.NESTED_TABLE);
            CompileUtil.verifySameLayout(dependency, values, "Arguments 1 and 2 have different origin");
        }

        if (context.hasArgument(2)) {
            results = context.compileArgument(2, converter)
                    .transform(expression -> expression, values.format());

            condition = values.transform(expression -> {
                CompiledNestedColumn result = context.align(values, results).cast(CompiledNestedColumn.class);
                return new BinaryOperator(expression, result.expression(), BinaryOperation.EQ);
            }, BooleanFormat.INSTANCE);
        } else {
            CompiledSimpleColumn empty = new CompiledSimpleColumn(
                    new Constant(Doubles.EMPTY), List.of(), values.format());
            results = converter.convert(empty);
        }

        return new ControlResult(dependency, values, results, condition);
    }

    ControlResult compileCheckbox(CompileContext context) {
        CompiledNestedColumn values = context.compileArgument(1, NestedColumnValidators.STRING_OR_DOUBLE);
        ResultValidator<CompiledNestedColumn> converter = NestedColumnValidators.forType(values.type());

        CompiledResult dependency = null;
        CompiledNestedColumn results;
        CompiledNestedColumn condition = null;

        if (context.hasArgument(0)) {
            dependency = context.compileArgument(0, TableValidators.NESTED_TABLE);
            CompileUtil.verifySameLayout(dependency, values, "Arguments 1 and 2 have different origin");
        }

        if (context.hasArgument(2)) {
            results = context.compileArgument(2, converter)
                    .transform(expression ->  expression, values.format());

            condition = values.transform(expression ->
                    new InLocal(List.of(expression), List.of(results.expression())), BooleanFormat.INSTANCE);
        } else {
            CompiledNestedColumn empty = new CompiledNestedColumn(
                    new ListLocal(context.scalarLayout().node(), List.of()),
                    0, values.format());
            results = converter.convert(empty);
        }

        return new ControlResult(dependency, values, results, condition);
    }

    Plan compileRequest(CompileContext context, ControlRequest request) {
        ControlResult result = compile(context);
        List<ControlResult> dependencies = compileDependencies(context, request, result);

        Expression value = result.values().expression();
        Expression condition;

        if (dependencies.isEmpty()) {
            condition = new Expand(result.values.node(), new Constant(true));
        } else {
            List<Expression> conditions = dependencies.stream()
                    .map(dependency -> dependency.condition().expression())
                    .collect(Collectors.toList());

            condition = ConditionUtil.assembleCondition(conditions);
        }

        Plan plan = new SelectLocal(value, condition);

        if (request.query() != null) {
            Expression text = new Get(plan, 0);

            if (text.getType().isDouble()) {
                text = new Text(text, result.values().format());
            }

            FuzzyScore score = new FuzzyScore(text, request.query());
            plan = new FilterLocal(plan, score);
        }

        plan = new AggregateByLocal(plan, List.of(new Get(plan, 0)),
                List.of(new AggregateByLocal.Aggregation(AggregateType.MAX, List.of(new Get(plan, 1)))));

        if (request.query() == null) {
            plan = new OrderByLocal(plan, List.of(new Get(plan, 1), new Get(plan, 0)),
                    new boolean[] {false, true});
        } else {
            Expression text = new Get(plan, 0);

            if (text.getType().isDouble()) {
                text = new Text(text, result.values().format());
            }

            FuzzyScore score = new FuzzyScore(text, request.query());
            plan = new OrderByLocal(plan, List.of(score, new Get(plan, 1), new Get(plan, 0)),
                    new boolean[] {false, false, true});
        }

        Expression data = new Get(plan, 0);
        Expression flag =  new Text(new Get(plan, 1), null);

        if (data.getType().isDouble()) {
            data = new Text(data, null);
        }

        return new ControlValuesResultLocal(
                data, flag,
                request.key(), ResultType.toResultType(result.values()),
                request.startRow(), request.endRow(),
                context.computationId());
    }

    private List<ControlResult> compileDependencies(CompileContext context,
                                                    ControlRequest request,
                                                    ControlResult result) {
        if (result.dependency() == null) {
            return List.of();
        }

        List<ControlResult> dependencies = new ArrayList<>();
        ParsedTable table = context.parsedTable(request.key().tableName());

        for (ParsedFields fields : table.fields()) {
            boolean self = fields.fields().stream()
                    .anyMatch(field -> field.fieldName().equals(request.key().fieldName()));
            if (self) {
                continue;
            }

            ParsedField field = fields.fields().get(0);
            CompileKey key = CompileKey.fieldKey(table.tableName(), field.fieldName(), true, true);
            CompileContext ctx = new CompileContext(context.compiler(), key);
            ctx = ctx.withFunction((Function) fields.formula());
            ControlResult other = compile(ctx);

            if (other.condition() != null && other.dependency() != null
                    && result.dependency().hasSameLayout(other.dependency())) {
                dependencies.add(other);
            }
        }

        return dependencies;
    }

    record ControlResult(CompiledResult dependency, CompiledNestedColumn values,
                         CompiledResult result, CompiledNestedColumn condition) {
    }
}