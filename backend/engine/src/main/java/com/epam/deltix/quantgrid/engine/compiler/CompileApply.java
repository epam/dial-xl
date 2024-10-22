package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedApply;
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
            = "Filter condition expected to be list of booleans of the same length as table.";
    final String INCORRECT_SORT_LAYOUT
            = "Sort key expected to list of numbers of the same length as table.";

    CompiledResult compile(ParsedApply apply, CompileContext context, List<FieldKey> dimensions) {
        CompiledTable current = context.currentTable(dimensions);
        // Current is not nested now. We need to make it nested.
        current = current.withNested(true);

        if (apply.getFilter() != null) {
            current = applyFilter(context, current, apply.getFilter(), dimensions);
        }

        if (apply.getSort() != null) {
            current = applySort(context, current, apply.getSort(), dimensions);
        }

        return current;
    }

    private CompiledTable applyFilter(CompileContext context, CompiledTable table,
                                      Formula argument, List<FieldKey> dimensions) {
        try {
            CompileContext nested = context.with(table, false);
            CompiledResult arg = nested.compileFormula(argument);
            CompiledSimpleColumn condition = SimpleColumnValidators.BOOLEAN.convert(nested.promote(arg, dimensions),
                    INCORRECT_FILTER_LAYOUT);
            CompileUtil.verifySameLayout(condition, table, INCORRECT_FILTER_LAYOUT);

            FilterLocal filter = new FilterLocal(table.node(), condition.node());
            return table.withNode(filter);
        } catch (Throwable e) {
            if (e instanceof CompileError && e.getMessage().equals(INCORRECT_FILTER_LAYOUT)) {
                throw e;
            }
            throw new CompileError("Can't apply filter. "
                    + "Make sure you do not use overridden fields in filter for a table without keys. "
                    + "Error: " + e.getMessage());
        }
    }

    private CompiledTable applySort(CompileContext context, CompiledTable table,
                                    List<Formula> arguments, List<FieldKey> dimensions) {
        try {
            CompileContext nested = context.with(table, false);
            List<CompiledSimpleColumn> keyResult = new ArrayList<>();
            boolean[] ascending = new boolean[arguments.size()];
            Arrays.fill(ascending, true);

            for (int i = 0; i < arguments.size(); i++) {
                Formula formula = arguments.get(i);

                if (formula instanceof UnaryOperator unary && unary.operation() == UnaryOperation.NEG) {
                    formula = unary.argument();
                    ascending[i] = false;
                }

                CompiledResult arg = nested.compileFormula(formula);
                CompiledSimpleColumn key = SimpleColumnValidators.STRING_OR_DOUBLE.convert(nested.promote(arg, dimensions),
                        INCORRECT_SORT_LAYOUT);
                CompileUtil.verifySameLayout(key, table,
                        INCORRECT_SORT_LAYOUT + (arguments.size() > 1 ? " Erroneous key index: " + (i + 1) : ""));

                keyResult.add(key);
            }
            List<Expression> keys = keyResult.stream().map(CompiledSimpleColumn::node).toList();

            OrderByLocal sort = new OrderByLocal(table.node(), keys, ascending);
            return table.withNode(sort);
        } catch (Throwable e) {
            if (e instanceof CompileError && e.getMessage().startsWith(INCORRECT_SORT_LAYOUT)) {
                throw e;
            }
            throw new CompileError("Can't apply sort. "
                    + "Make sure you do not use overridden fields in sort for a table without keys. "
                    + "Error: " + e.getMessage());
        }
    }

    FieldKey dimension(ParsedTable table) {
        return new FieldKey(table.tableName(), "_apply_dimension_031574268");
    }
}
