package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.type.ColumnType;

public record ResultType(String tableName, TableType tableType, ColumnType columnType, ColumnFormat format, boolean isNested) {

    public static ResultType toResultType(CompiledResult result) {
        if (result instanceof CompiledSimpleColumn column) {
            return new ResultType(null, null, column.type(), column.format(), false);
        } else if (result instanceof CompiledNestedColumn nestedColumn) {
            return new ResultType(null, null, nestedColumn.type(), nestedColumn.format(), true);
        } else if (result instanceof CompiledPivotColumn) {
            return new ResultType(null, null, ColumnType.STRING, null, false);
        } else if (result instanceof CompiledTable table) {
            return new ResultType(table.name(), getTableType(table), null, null, table.nested());
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result: " + result.getClass().getSimpleName());
        }
    }

    public static ResultType toResultType(Expression expression) {
        return new ResultType(null, null, expression.getType(), null, false);
    }

    private static TableType getTableType(CompiledTable table) {
        return table.reference() ? TableType.TABLE_REFERENCE : TableType.TABLE_VALUE;
    }

    public enum TableType {
        TABLE_REFERENCE, TABLE_VALUE
    }
}
