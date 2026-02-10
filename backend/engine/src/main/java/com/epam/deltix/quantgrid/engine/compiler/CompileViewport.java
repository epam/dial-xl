package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileViewport {

    public ViewportLocal compileViewport(CompileContext context, ResultType type,
                                         CompiledResult result, List<FieldKey> dimensions,
                                         Viewport viewport) {
        if (result instanceof CompiledPivotColumn column) {
            return compilePivot(context, type, result, dimensions, viewport, column);
        }

        CompiledSimpleColumn display;
        if (result instanceof CompiledSimpleColumn column) {
            display = column;
        } else if (result instanceof CompiledTable table) {
            display = compileDisplayTable(context, table);
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result " + result.getClass().getSimpleName());
        }

        display = context.promote(display, dimensions).cast(CompiledSimpleColumn.class);
        Expression expression = display.node();

        if (expression.getType().isDouble()) {
            expression = new Text(expression, viewport.raw() ? null : display.format());
        }

        ViewportLocal plan = new ViewportLocal(expression, type, viewport.key(),
                viewport.startRow(), viewport.endRow(), viewport.startCol(), viewport.endCol(),
                viewport.content(), viewport.raw(), context.computationId(), viewport.flag()
        );

        plan.getTraces().addAll(result.node().getTraces());
        return plan;
    }

    private ViewportLocal compilePivot(CompileContext context, ResultType type, CompiledResult result,
                                       List<FieldKey> dimensions, Viewport viewport,
                                       CompiledPivotColumn column) {

        Expression expression;

        if (column.nested()) {
            Plan layout = context.layout(column.dimensions()).node().getLayout();
            expression = column.pivotColumn();

            Expression key = column.hasCurrentReference() ? column.currentReference() : null;
            Plan aggregate = new AggregateLocal(AggregateType.COUNT_ALL, layout, column.node(), key, expression);

            expression = new Get(aggregate, 0);

            CompiledSimpleColumn count = new CompiledSimpleColumn(expression, column.dimensions(),
                    GeneralFormat.INSTANCE);
            count = context.promote(count, dimensions).cast(CompiledSimpleColumn.class);

            expression = new Text(expression, viewport.raw() ? null : count.format());
        } else {
            column = context.promote(column, dimensions).cast(CompiledPivotColumn.class);
            expression = column.pivotColumn();

            if (column.pivotType().isDouble()) {
                expression = new Text(expression, viewport.raw() ? null : column.pivotFormat());
            }
        }

        ViewportLocal plan = new ViewportLocal(expression, type, viewport.key(),
                viewport.startRow(), viewport.endRow(), viewport.startCol(), viewport.endCol(),
                viewport.content(), viewport.raw(), context.computationId(), viewport.flag()
        );

        plan.getTraces().addAll(result.node().getTraces());
        return plan;
    }

    private CompiledSimpleColumn compileDisplayTable(CompileContext context, CompiledTable original) {
        if (original.nested()) {
            return CompileFunction.compileCount(context, original, true);
        } else {
            Expression display = CompileUtil.plus(original.queryReference(), 1);
            return new CompiledSimpleColumn(display, original.dimensions(), GeneralFormat.INSTANCE);
        }
    }
}
