package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

@UtilityClass
public class CompileUtil {

    public void verify(boolean condition) {
        if (!condition) {
            throw new CompileError();
        }
    }

    public void verify(boolean condition, String error) {
        if (!condition) {
            throw new CompileError(error);
        }
    }

    public void verify(boolean condition, String errorFormat, Object arg) {
        if (!condition) {
            throw new CompileError(errorFormat.formatted(arg));
        }
    }

    public void verify(boolean condition, String errorFormat, Object... args) {
        if (!condition) {
            throw new CompileError(errorFormat.formatted(args));
        }
    }

    public void verifyReferences(int currentRef, int queryRef) {
        CompileUtil.verify(currentRef <= queryRef, "currentRef(%s) > queryRef(%s)", currentRef, queryRef);
    }

    public Period periodOf(String periodText) {
        try {
            return Period.valueOf(periodText);
        } catch (Throwable e) {
            throw new CompileError("Period argument should be one of: " + Arrays.toString(Period.values())
                    + ", but was " + periodText);
        }
    }

    public CompiledColumn projectColumn(Expression key, Expression column, List<FieldKey> dimensions) {
        Expression projected = projectColumn(key, column);
        return new CompiledColumn(projected, dimensions);
    }

    public Expression projectColumn(Expression key, Expression column) {
        return new Projection(key, column);
    }

    public Plan projectFlatTable(Plan table, Expression key) {
        int size = table.getMeta().getSchema().size();
        List<Expression> columns = new ArrayList<>();

        for (int i = 0; i < size; i++) {
           Projection projection = new Projection(key,  new Get(table, i));
           columns.add(projection);
        }

        return new SelectLocal(columns);
    }

    public Plan projectNestedTable(Plan project, Expression carryKey, Get projectKey) {
        verify(projectKey.plan() == project);
        verify(projectKey.getColumn() == 0);

        if (isRowNumber(carryKey)) { // needs to be proved that it is correct
            return project;
        }

        Plan carry = new SelectLocal(new RowNumber(carryKey.getLayout()), carryKey);
        carryKey = new Get(carry, 1);

        Plan projection = new JoinAllLocal(carry, project, List.of(carryKey), List.of(projectKey));
        List<Expression> columns = new ArrayList<>();
        Schema schema = projection.getMeta().getSchema();

        for (int i = 0; i < schema.size(); i++) {
            if (i != 1 && i != 2) {
                columns.add(new Get(projection, i));
            }
        }

        return new SelectLocal(columns);
    }

    public SelectLocal selectColumns(Plan table) {
        return selectColumns(table, 0);
    }

    public SelectLocal selectColumns(Plan table, int from) {
        int size = table.getMeta().getSchema().size();
        List<Expression> columns = new ArrayList<>(size - from);

        for (int i = from; i < size; i++) {
            Get column = new Get(table, i);
            columns.add(column);
        }

        return new SelectLocal(columns);
    }

    public SelectLocal selectColumns(Get first, Plan last) {
        List<Expression> expressions = new ArrayList<>();
        expressions.add(first);
        expressions.addAll(selectColumns(last, 0).getExpressions());
        return new SelectLocal(expressions);
    }

    public List<CurrentField> collectCurrentFields(Formula formula) {
        List<CurrentField> currentFields = new ArrayList<>();

        collect(formula, f -> {
            if (f instanceof CurrentField currentField) {
                currentFields.add(currentField);
            }
        });

        return currentFields;
    }

    private void collect(Formula formula, Consumer<Formula> collector) {
        collector.accept(formula);
        for (Formula argument : formula.arguments()) {
            collect(argument, collector);
        }
    }

    static boolean isContextNode(CompiledTable layout, CompiledTable table, CompiledTable source) {
        verify(table != null);
        verify(layout != null);

        if (!source.hasCurrentReference()) {
            return false;
        }

        Plan sourcePlan = source.node();
        int currentRef = source.currentReference().getColumn();

        // checks that source originates from the context table or layout
        return isContextNode(layout.node(), table.node(), sourcePlan, currentRef);
    }

    private static boolean isContextNode(Plan layout, Plan table, Plan source, int currentRef) {
        if (source == table) {
            return true;
        }

        if (source instanceof SelectLocal select) {
            Expression expression = select.getExpression(currentRef);

            if (expression instanceof Get get) {
                return isContextNode(layout, table, get.plan(), get.getColumn());
            } else if (expression instanceof RowNumber rowNumber) {
                return rowNumber.plan() == layout;
            } else {
                throw new CompileError("Unexpected row reference expression: %s".formatted(expression));
            }
        }

        Schema schema = source.getMeta().getSchema();
        verify(schema.hasInput(currentRef), "Current reference is not in the chain");
        Plan plan = source.plan(schema.getInput(currentRef));
        int column = schema.getColumn(currentRef);
        return isContextNode(layout, table, plan, column);
    }

    private static boolean isRowNumber(Expression expression) {
        while (true) {
            if (expression instanceof RowNumber) {
                return true;
            }

            if (expression instanceof Get get && get.plan() instanceof SelectLocal select) {
                expression = get.getExpression(select);
                continue;
            }

            return false;
        }
    }
}
