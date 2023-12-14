package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPeriodPointTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.type.ColumnType;

public record ResultType(String tableReference, ColumnType columnType, boolean isNested) {

    public static ResultType toResultType(CompiledResult result) {
        if (result instanceof CompiledColumn column) {
            return new ResultType(null, column.type(), false);
        } else if (result instanceof CompiledNestedColumn nestedColumn) {
            return new ResultType(null, nestedColumn.type(), true);
        } else if (result instanceof CompiledPivotTable) {
            return new ResultType(null, ColumnType.STRING, false);
        } else if (result instanceof CompiledPeriodPointTable) {
            return new ResultType(null, ColumnType.STRING, false);
        } else if (result instanceof CompiledTable table) {
            return new ResultType(table.name(), null, table.nested());
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result: " + result.getClass().getSimpleName());
        }
    }

    public static ResultType toResultType(Expression expression) {
        return new ResultType(null, expression.getType(), false);
    }
}
