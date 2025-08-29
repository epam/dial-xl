package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileViewport {

    public ViewportLocal compileViewport(CompileContext context, ResultType resultType,
                                         CompiledResult unexploded, List<FieldKey> dimensions,
                                         Viewport viewport) {
        CompiledSimpleColumn displayColumn;
        if (unexploded instanceof CompiledSimpleColumn column) {
            displayColumn = column;
        } else if (unexploded instanceof CompiledPivotColumn column) {
            // we don't need to promote pivot names, that's why we specify full dimension list here
            displayColumn = new CompiledSimpleColumn(column.nameColumn(), dimensions, GeneralFormat.INSTANCE);
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
            expression = new Text(expression, viewport.raw() ? null : promotedDisplayColumn.format());
        }

        ViewportLocal plan = new ViewportLocal(expression, resultType, viewport.key(), viewport.start(), viewport.end(),
                viewport.content(), viewport.raw(), context.computationId(), viewport.flag()
        );

        plan.getTraces().addAll(unexploded.node().getTraces());
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
