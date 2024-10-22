package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.TableValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.PivotNamesLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFormula;
import com.epam.deltix.quantgrid.parser.Span;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class CompilePivot {

    public final String PIVOT_NAME = "*";
    public final Formula PIVOT_REF = new CurrentField(PIVOT_NAME);

    public FieldKey pivotKey(String table) {
        return new FieldKey(table, PIVOT_NAME);
    }

    public ParsedFormula pivotFieldFormula(String field) {
        return new ParsedFormula(new Span(0, 0), new FieldReference(PIVOT_REF, field), List.of());
    }

    public ParsedField pivotParsedField(FieldKey key) {
        return ParsedField.builder()
                .formula(pivotFieldFormula(key.fieldName()))
                .decorators(List.of())
                .build();
    }

    public CompiledPivotTable compile(CompileContext context) {
        CompiledTable source = context.compileArgument(0, TableValidators.NESTED);

        return source.hasCurrentReference()
                ? compileNestedPivot(context, source)
                : compileSimplePivot(context, source);
    }

    private CompiledPivotTable compileSimplePivot(CompileContext context, CompiledTable source) {
        Expression sourceName = compileNames(context, source).node();
        CompiledTable distinct = source.withNode(new DistinctByLocal(source.node(), List.of(sourceName)));

        Expression distinctName = compileNames(context, distinct).node();
        SelectLocal distinctSelect = new SelectLocal(new RowNumber(distinct.node()));

        JoinAllLocal join = new JoinAllLocal(distinctSelect, source.node(),
                List.of(CompileUtil.projectColumn(new Get(distinctSelect, 0), distinctName)),
                List.of(sourceName));

        SelectLocal group = CompileUtil.selectColumns(join);
        CompiledTable grouped = source.withCurrent(group, source.dimensions());
        CompiledSimpleColumn value = compileValue(context, distinct, grouped);
        SelectLocal result = new SelectLocal(distinctName, value.node());

        SelectLocal namesSelect = new SelectLocal(sourceName);
        DistinctByLocal namesDistinct = new DistinctByLocal(namesSelect, List.of(new Get(namesSelect, 0)));
        PivotNamesLocal names = new PivotNamesLocal(namesDistinct);

        return new CompiledPivotTable(names, 0, result, CompiledTable.REF_NA, 0, 1, source.dimensions());
    }

    private CompiledPivotTable compileNestedPivot(CompileContext context, CompiledTable source) {
        CompileUtil.verify(source.currentReference().getColumn() == 0);

        Expression sourceName = compileNames(context, source).node();
        Get sourceRef = source.currentReference();

        CompiledTable distinct = source.withNode(new DistinctByLocal(source.node(), List.of(sourceRef, sourceName)));
        Expression distinctRef = distinct.currentReference();

        Expression distinctName = compileNames(context, distinct).node();
        SelectLocal distinctSelect = new SelectLocal(new RowNumber(distinct.node()));

        JoinAllLocal join = new JoinAllLocal(distinctSelect, source.node(), List.of(
                CompileUtil.projectColumn(new Get(distinctSelect, 0), distinctRef),
                CompileUtil.projectColumn(new Get(distinctSelect, 0), distinctName)
        ), List.of(sourceRef, sourceName));

        SelectLocal group = selectWithoutOne(join, 1);
        CompiledTable grouped = source.withNode(group);
        CompiledSimpleColumn value = compileValue(context, distinct, grouped);
        SelectLocal result = new SelectLocal(distinctRef, distinctName, value.node());

        SelectLocal namesSelect = new SelectLocal(sourceName);
        DistinctByLocal namesDistinct = new DistinctByLocal(namesSelect, List.of(new Get(namesSelect, 0)));
        PivotNamesLocal names = new PivotNamesLocal(namesDistinct);

        return new CompiledPivotTable(names, 0, result, 0, 1, 2, source.dimensions());
    }

    private static CompiledSimpleColumn compileNames(CompileContext context, CompiledTable source) {
        CompileContext nested = context.with(source, false);
        CompiledSimpleColumn result = context.flattenArgument(nested.compileArgument(1, SimpleOrNestedValidators.STRING));
        CompileUtil.verifySameLayout(source, result, "PIVOT 'field' argument misaligned with 'table'");
        return result;
    }

    private static CompiledSimpleColumn compileValue(CompileContext context, CompiledTable layout, CompiledTable table) {
        checkValueFormula(context.argument(2));
        CompileContext valueContext = context.with(table, true, layout);
        CompiledSimpleColumn result = context.flattenArgument(valueContext.compileArgument(2, SimpleOrNestedValidators.ANY));
        CompileUtil.verifySameLayout(layout, result, "PIVOT 'aggregation' argument misaligned with 'table'");
        return result;
    }

    private static SelectLocal selectWithoutOne(Plan plan, int position) {
        List<Expression> columns = new ArrayList<>();

        for (int i = 0; i < plan.getMeta().getSchema().size(); i++) {
            if (i != position) {
                columns.add(new Get(plan, i));
            }
        }

        return new SelectLocal(columns);
    }

    private void checkValueFormula(Formula valueFormula) {
        List<CurrentField> currentFields = CompileUtil.collectCurrentFields(valueFormula);
        if (!currentFields.isEmpty()) {
            throw new CompileError(
                    "Value formula should not contain references to the current fields: %s.".formatted(currentFields)
                            + " Did you forget to put $ sign before a field: $[field]?");
        }
    }
}
