package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.type.ColumnType;

public record ResultType(String tableName, TableType tableType,
                         ColumnType columnType, ColumnFormat format,
                         ColumnType pivotType, ColumnFormat pivotFormat,
                         boolean isNested, boolean isAssignable) {

    public ResultType(String tableName, TableType tableType,
                      ColumnType columnType, ColumnFormat format,
                      boolean isNested, boolean isAssignable) {
        this(tableName, tableType, columnType, format, null, null, isNested, isAssignable);
    }

    public static ResultType toResultType(CompiledResult result) {
        if (result instanceof CompiledColumn column) {
            return new ResultType(null, null, column.type(), column.format(), column.nested(), true);
        } else if (result instanceof CompiledPivotColumn column) {
            return new ResultType(null, null, ColumnType.STRING, GeneralFormat.INSTANCE,
                    column.pivotType(), column.pivotFormat(), result.nested(), column.assignable());
        } else if (result instanceof CompiledTable table) {
            return new ResultType(table.name(), getTableType(table), null, null, table.nested(), table.assignable());
        } else {
            throw new UnsupportedOperationException(
                    "Unsupported compiled result: " + result.getClass().getSimpleName());
        }
    }

    private static TableType getTableType(CompiledTable table) {
        return table.reference() ? TableType.TABLE_REFERENCE : TableType.TABLE_VALUE;
    }

    public enum TableType {
        TABLE_REFERENCE, TABLE_VALUE
    }
}
