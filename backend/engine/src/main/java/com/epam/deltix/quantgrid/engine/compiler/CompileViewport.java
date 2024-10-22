package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPeriodPointTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.DisplayPeriodPoint;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileViewport {

    public ViewportLocal compileViewport(CompileContext context, ResultType resultType,
                                         CompiledResult unexploded, List<FieldKey> dimensions, Viewport viewport) {
        CompiledSimpleColumn displayColumn;
        if (unexploded instanceof CompiledSimpleColumn column) {
            displayColumn = column;
        } else if (unexploded instanceof CompiledPivotTable pivotTable) {
            // we don't need to promote pivot names, that's why we specify full dimension list here
            displayColumn = new CompiledSimpleColumn(pivotTable.pivotNamesKey(), dimensions);
        } else if (unexploded instanceof CompiledTable table) {
            displayColumn = compileDisplayTable(context, table);
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result " + unexploded.getClass().getSimpleName());
        }

        CompiledSimpleColumn
                promotedDisplayColumn = context.promote(displayColumn, dimensions).cast(CompiledSimpleColumn.class);
        Expression expression = promotedDisplayColumn.node();

        if (expression.getType().isDouble()) {
            expression = new Text(expression, expression.getType(), null);
        }

        return new ViewportLocal(expression, resultType, viewport.key(),
                viewport.start(), viewport.end(), viewport.content());
    }

    public List<ViewportLocal> compilePivotViewports(FieldKey field, CompiledPivotTable table) {
        Get name = table.pivotName();
        Get value = table.pivotValue();

        return List.of(
                new ViewportLocal(value, ResultType.toResultType(name), field),
                new ViewportLocal(value, ResultType.toResultType(value), field)
        );
    }

    private CompiledSimpleColumn compileDisplayTable(CompileContext context, CompiledTable original) {
        if (original.nested()) {
            return CompileFunction.compileCount(context, original, true);
        } else if (original instanceof CompiledPeriodPointTable table) {
            DisplayPeriodPoint display = new DisplayPeriodPoint(table.period(), table.timestamp(), table.value());
            return new CompiledSimpleColumn(display, original.dimensions());
        } else {
            Expression display = CompileUtil.plus(context, original, original.queryReference(), 1);
            return new CompiledSimpleColumn(display, original.dimensions());
        }
    }
}
