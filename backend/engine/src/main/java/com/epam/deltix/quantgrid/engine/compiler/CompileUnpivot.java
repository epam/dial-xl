package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledUnpivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.NestedColumnValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryOperator;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ListLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.UnpivotLocal;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

@UtilityClass
class CompileUnpivot {

    CompiledResult compile(CompileContext context) {
        CompiledTable table = context.compileArgument(0, TableValidators.NESTED_TABLE);
        List<String> all = table.fields(context);
        List<String> leaves = compileListArgument(context, 1);
        Set<String> includes = new TreeSet<>(all);
        Set<String> excludes = new TreeSet<>(leaves);

        includes.removeAll(leaves);
        includes.remove(CompiledPivotColumn.PIVOT_NAME);

        if (context.argumentCount() == 3) {
            includes = new TreeSet<>(compileListArgument(context, 2));
            excludes = null;  // not used
        } else if (context.argumentCount() == 4) {
            List<String> exclusion = compileListArgument(context, 3);
            includes.removeAll(exclusion);
            excludes.addAll(exclusion);
        }

        CompiledPivotColumn pivot = (excludes != null && all.contains(CompiledPivotColumn.PIVOT_NAME))
                ? table.field(context, CompiledPivotColumn.PIVOT_NAME).cast(CompiledPivotColumn.class)
                : null;

        IncludeValues includeValues = compileIncludeValues(context, table, includes, pivot);
        ColumnFormat format = includeValues.format();
        ColumnType type = includeValues.type();
        List<Expression> values = includeValues.values();

        UnpivotLocal unpivot;

        if (pivot == null) {
            unpivot = new UnpivotLocal(table.node(), values, includes.toArray(String[]::new), type);
        } else {
            Plan names = compileIncludeNames(context, table, excludes);
            unpivot = new UnpivotLocal(table.node(), values, includes.toArray(String[]::new), type,
                    names, new Get(names, 0));
        }

        int shift = table.node().getMeta().getSchema().size();
        CompiledTable result = table.withNode(unpivot, true);

        return new CompiledUnpivotTable(result, leaves,
                uniqueName(leaves, "name"), shift,
                uniqueName(leaves, "value"), shift + 1, format);
    }

    private List<String> compileListArgument(CompileContext context, int index) {
        List<String> list = context.constStringListArgument(index);
        if (list.contains(CompiledPivotColumn.PIVOT_NAME)) {
            throw new CompileError("list of columns names must not contain *");
        }
        return list;
    }

    private IncludeValues compileIncludeValues(CompileContext context,
                                               CompiledTable table,
                                               Collection<String> names,
                                               CompiledPivotColumn pivot) {
        if (names.isEmpty()) {
            CompileUtil.verify(pivot != null, "No columns to unpivot");
            return new IncludeValues(pivot.pivotFormat(), pivot.pivotType(), List.of(pivot.pivotColumn()));
        }

        List<CompiledColumn> columns = new ArrayList<>();
        ColumnType type = (pivot == null) ? null : pivot.pivotType();

        for (String field : names) {
            CompiledColumn column = NestedColumnValidators.ANY.convert(table.field(context, field));
            if (!ColumnType.isCommon(type, column.type())) {
                throw new CompileError("Column: " + field + " has different type:" + column.type()
                        + " with the other columns: " + type
                        + ". Remove it from include_list or add it to exclude_list");
            }

            type = ColumnType.common(type, column.type());
            columns.add(column);
        }

        ResultValidator<CompiledNestedColumn> converter = NestedColumnValidators.forType(type);
        List<Expression> values = new ArrayList<>();
        List<ColumnFormat> formats = new ArrayList<>();

        for (CompiledColumn column : columns) {
            CompiledNestedColumn result = converter.convert(column);
            values.add(result.expression());
            formats.add(result.format());
        }

        if (pivot != null) {
            boolean convert = (pivot.pivotType() == type);
            Get column = pivot.pivotColumn();
            ColumnFormat format = pivot.pivotFormat();
            formats.add(format);
            values.add(convert ? column : new Text(column, format));
        }

        ColumnFormat format = FormatResolver.resolveListFormat(type, formats);
        return new IncludeValues(format, type, values);
    }

    private Plan compileIncludeNames(CompileContext context, CompiledTable table, Set<String> excludes) {
        CompiledNestedColumn names = CompileFunction.compileFields(context, table);
        List<Expression> constants = excludes.stream().map(Constant::new)
                .map(constant -> (Expression) constant).toList();

        ListLocal list = new ListLocal(context.scalarLayout().node(), constants);
        InLocal isExclude = new InLocal(List.of(names.expression()), List.of(new Get(list, 0)));
        UnaryOperator isNotExclude = new UnaryOperator(isExclude, UnaryOperation.NOT);

        FilterLocal filtered = new FilterLocal(names.node(), isNotExclude);
        DistinctByLocal unique = new DistinctByLocal(filtered, List.of(new Get(filtered, 0)));
        return new OrderByLocal(unique, List.of(new Get(unique, 0)), Util.boolArray(1, true));
    }

    private String uniqueName(List<String> names, String name) {
        String unique = name;
        for (int i = 1; ; i++) {
            if (!names.contains(unique)) {
                return unique;
            }
            unique = name + i;
        }
    }

    private record IncludeValues(ColumnFormat format, ColumnType type, List<Expression> values) {
    }
}