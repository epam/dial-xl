package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledUnpivotTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.UnpivotDynamicLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.UnpivotLocal;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.Pair;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

@UtilityClass
class CompileUnpivot {

    CompiledResult compile(CompileContext context, List<Formula> arguments) {
        int args = arguments.size();
        CompileUtil.verify(args == 3 || args == 4, "UNPIVOT has 4 args, but only %s supplied", args);
        CompileUtil.verify(arguments.get(1) instanceof ConstText, "UNPIVOT supports only string in 2 arg");
        CompileUtil.verify(arguments.get(2) instanceof ConstText, "UNPIVOT supports only string in 3 arg");

        CompiledTable source = context.compile(arguments.get(0)).cast(CompiledTable.class);
        CompileUtil.verify(source.nested());

        String name = ((ConstText) arguments.get(1)).text();
        String value = ((ConstText) arguments.get(2)).text();
        Formula condition = (args == 4) ? arguments.get(3) : null;
        String[] fields = filterFields(context, source, condition);

        Pair<ColumnType, List<Expression>> values = compileValues(context, source, fields);
        List<Expression> columns = values.right();
        ColumnType type = values.left();

        CompiledPivotTable pivot = source.fields(context).contains(CompilePivot.PIVOT_NAME)
                ? source.field(context, CompilePivot.PIVOT_NAME).cast(CompiledPivotTable.class)
                : null;

        if (type == null) {
            type = (pivot == null) ? ColumnType.DOUBLE : pivot.pivotType();
        }

        if (pivot != null && ColumnType.closest(pivot.pivotType(), type) == null) {
            pivot = null;
        }

        Plan plan;

        if (pivot == null) {
            plan = new UnpivotLocal(source.node(), columns, fields);
        } else {
            CompiledNestedColumn allNames = CompileFunction.compileFields(context, source, true);
            Plan allName = filterFields(allNames.node(), condition, 0);
            Expression allNameKey = new Get(allName, 0);

            Plan pivotValues = filterFields(pivot.node(), condition, pivot.pivotName().getColumn());
            Expression pivotKey = pivot.hasCurrentReference() ? new Get(pivotValues, pivot.currentRef()) : null;
            Expression pivotName = new Get(pivotValues, pivot.pivotName().getColumn());
            Expression pivotValue = new Get(pivotValues, pivot.pivotValue().getColumn());

            plan = new UnpivotDynamicLocal(
                    source.node(), source.queryReference(), columns,
                    allName, allNameKey,
                    pivotValues, pivotKey, pivotName, pivotValue,
                    fields);
        }

        int shift = source.node().getMeta().getSchema().size();
        CompiledTable newSource = source.withNode(plan, true);
        return new CompiledUnpivotTable(newSource, name, shift, value, shift + 1);
    }

    private Pair<ColumnType, List<Expression>> compileValues(CompileContext context,
                                                             CompiledTable table,
                                                             String[] fields) {
        CompiledTable flat = table.withNested(false);
        List<Expression> columns = new ArrayList<>();
        ColumnType type = null;

        for (String field : fields) {
            CompiledColumn column = flat.field(context, field).cast(CompiledColumn.class);
            type = ColumnType.closest(type, column.type());
            CompileUtil.verify(type != null, "UNPIVOT supports only fields with same type");
            Expression expression = column.node();
            columns.add(expression);
        }

        return Pair.of(type, columns);
    }

    private String[] filterFields(CompileContext context, CompiledTable table, @Nullable Formula condition) {
        try {
            CompiledNestedColumn column = CompileFunction.compileFields(context, table, false);
            Plan filter = filterFields(column.node(), condition, 0);
            Table result = (Table) filter.execute();
            CompileUtil.verify(result.getColumnCount() == 1);
            return result.getStringColumn(0).toArray();
        } catch (Throwable e) {
            throw new CompileError("UNPIVOT has bad 4 arg (field condition)", e);
        }
    }

    private Plan filterFields(Plan fields, @Nullable Formula condition, int position) {
        if (condition == null) {
            return fields;
        }

        CompiledNestedColumn column = new CompiledNestedColumn(fields, position);

        Compiler compiler = new Compiler(null);
        CompileContext context = new CompileFormulaContext(compiler).with(column, false);

        CompiledColumn predicate = context.compile(condition).cast(CompiledColumn.class);
        predicate = context.promote(predicate, List.of()).cast(CompiledColumn.class);

        CompileUtil.verify(predicate.type().isDouble());
        return new FilterLocal(fields, predicate.node());
    }
}