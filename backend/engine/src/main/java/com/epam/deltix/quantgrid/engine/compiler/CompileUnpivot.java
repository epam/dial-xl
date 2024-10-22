package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledUnpivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.UnpivotDynamicLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.UnpivotLocal;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.Pair;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
class CompileUnpivot {

    CompiledResult compile(CompileContext context) {
        CompiledTable source = context.compileArgument(0, TableValidators.NESTED_TABLE);

        String name = context.constStringArgument(1);
        String value = context.constStringArgument(2);
        String[] fields = filterFields(context, source);

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
            Plan allName = filterFields(allNames.node(), context.function(), 0);
            Expression allNameKey = new Get(allName, 0);

            Plan pivotValues = filterFields(pivot.node(), context.function(), pivot.pivotName().getColumn());
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
            CompiledSimpleColumn column = flat.field(context, field)
                    .cast(CompiledSimpleColumn.class, (expected, actual) ->
                            "UNPIVOT cannot be applied to field '%s' of %s type".formatted(field, actual));
            type = ColumnType.closest(type, column.type());
            CompileUtil.verify(type != null, "UNPIVOT supports only fields with same type");
            Expression expression = column.node();
            columns.add(expression);
        }

        return Pair.of(type, columns);
    }

    private String[] filterFields(CompileContext context, CompiledTable table) {
        CompiledNestedColumn column = CompileFunction.compileFields(context, table, false);
        Plan filter = filterFields(column.node(), context.function(), 0);
        try {
            Table result = (Table) filter.execute();
            CompileUtil.verify(result.getColumnCount() == 1);
            return result.getStringColumn(0).toArray();
        } catch (Throwable e) {
            throw new CompileError("UNPIVOT has bad 4 arg (field condition)", e);
        }
    }

    private Plan filterFields(Plan fields, Function function, int position) {
        if (function.arguments().size() != 4) {
            return fields;
        }

        CompiledNestedColumn column = new CompiledNestedColumn(fields, position);

        Compiler compiler = new Compiler(null, null);
        CompileContext context = new CompileFormulaContext(compiler)
                .with(column, false)
                .withFunction(function);

        CompiledResult predicate = context.compileArgument(3, SimpleOrNestedValidators.DOUBLE);
        predicate = context.promote(predicate, List.of());
        CompileUtil.verifySameLayout(predicate, fields, "UNPIVOT 'field_condition' misaligned with `table`.");

        return new FilterLocal(fields, context.flattenArgument(predicate).node());
    }
}