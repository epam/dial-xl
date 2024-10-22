package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledInputTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPeriodPointTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.type.ColumnType;

public record ResultType(String tableReference, TableType tableType, ColumnType columnType, boolean isNested) {

    public static ResultType toResultType(CompiledResult result) {
        if (result instanceof CompiledSimpleColumn column) {
            return new ResultType(null, null, column.type(), false);
        } else if (result instanceof CompiledNestedColumn nestedColumn) {
            return new ResultType(null, null, nestedColumn.type(), true);
        } else if (result instanceof CompiledPivotTable) {
            return new ResultType(null, null, ColumnType.STRING, false);
        } else if (result instanceof CompiledTable table) {
            return new ResultType(table.name(), getTableType(table), null, table.nested());
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result: " + result.getClass().getSimpleName());
        }
    }

    public static ResultType toResultType(Expression expression) {
        return new ResultType(null, null, expression.getType(), false);
    }

    private static TableType getTableType(CompiledTable table) {
        if (table instanceof CompiledPeriodPointTable) {
            return TableType.PERIOD_SERIES_POINT;
        } else if (table instanceof CompiledInputTable) {
            return TableType.INPUT;
        } else {
            return TableType.TABLE;
        }
    }

    public enum TableType {
        INPUT, PERIOD_SERIES_POINT, TABLE
    }
}
