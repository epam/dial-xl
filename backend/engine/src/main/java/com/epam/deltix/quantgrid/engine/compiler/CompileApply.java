package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedApply;
import com.epam.deltix.quantgrid.parser.ParsedApplyFilter;
import com.epam.deltix.quantgrid.parser.ParsedApplySort;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@UtilityClass
class CompileApply {
    final String INCORRECT_FILTER_LAYOUT
            = "Filter condition expected to be an array of booleans of the same length as table.";
    final String INCORRECT_SORT_LAYOUT
            = "Sort key expected to be an array of numbers of the same length as table.";

    CompiledResult compile(ParsedApply apply, CompileContext context, List<FieldKey> dimensions) {
        CompiledTable current = context.currentTable(dimensions);

        if (apply.filter() != null) {
            current = applyFilter(context, current, apply.filter(), dimensions);
        }

        if (apply.sort() != null) {
            current = applySort(context, current, apply.sort(), dimensions);
        }

        return current.withNested(true);
    }

    private CompiledTable applyFilter(CompileContext context, CompiledTable table,
                                      ParsedApplyFilter filter, List<FieldKey> dimensions) {
        try {
            CompiledResult arg = context.compileFormula(filter.formula());
            arg = context.promote(arg, dimensions);
            arg = context.align(table, arg);

            CompiledSimpleColumn condition = SimpleColumnValidators.DOUBLE.convert(arg, INCORRECT_FILTER_LAYOUT);
            CompileUtil.verifySameLayout(condition, table, INCORRECT_FILTER_LAYOUT);

            FilterLocal plan = new FilterLocal(table.node(), condition.node());

            Trace trace = new Trace(context.computationId(), Trace.Type.COMPUTE, context.key().key(), filter.span());
            plan.getTraces().add(trace);

            return table.withNode(plan);
        } catch (Throwable e) {
            if (e instanceof CompileError && e.getMessage() != null && e.getMessage().equals(INCORRECT_FILTER_LAYOUT)) {
                throw e;
            }
            throw new CompileError("Can't apply filter. "
                    + "Make sure you do not use overridden columns in filter for a table without keys. "
                    + "Error: " + e.getMessage());
        }
    }

    private CompiledTable applySort(CompileContext context, CompiledTable table,
                                    ParsedApplySort sorting, List<FieldKey> dimensions) {
        try {
            List<Formula> arguments = sorting.formulas();

            List<CompiledSimpleColumn> keyResult = new ArrayList<>();
            boolean[] ascending = new boolean[arguments.size()];
            Arrays.fill(ascending, true);

            for (int i = 0; i < arguments.size(); i++) {
                Formula formula = arguments.get(i);

                if (formula instanceof UnaryOperator unary && unary.operation() == UnaryOperation.NEG) {
                    formula = unary.argument();
                    ascending[i] = false;
                }

                CompiledResult arg = context.compileFormula(formula);
                arg = context.promote(arg, dimensions);
                arg = context.align(table, arg);

                CompiledSimpleColumn key = SimpleColumnValidators.STRING_OR_DOUBLE.convert(arg, INCORRECT_SORT_LAYOUT);
                CompileUtil.verifySameLayout(key, table, INCORRECT_SORT_LAYOUT
                        + (arguments.size() > 1 ? " Erroneous key index: " + (i + 1) : ""));

                keyResult.add(key);
            }

            List<Expression> keys = keyResult.stream().map(CompiledSimpleColumn::node).toList();
            OrderByLocal plan = new OrderByLocal(table.node(), keys, ascending);

            Trace trace = new Trace(context.computationId(), Trace.Type.COMPUTE, context.key().key(), sorting.span());
            plan.getTraces().add(trace);

            return table.withNode(plan);
        } catch (Throwable e) {
            if (e instanceof CompileError && e.getMessage() != null && e.getMessage().startsWith(INCORRECT_SORT_LAYOUT)) {
                throw e;
            }
            throw new CompileError("Can't apply sort. "
                    + "Make sure you do not use overridden columns in sort for a table without keys. "
                    + "Error: " + e.getMessage());
        }
    }

    FieldKey dimension(ParsedTable table) {
        return new FieldKey(table.tableName(), "_apply_dimension_031574268");
    }
}
