package com.epam.deltix.quantgrid.engine.spark;

import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;
import org.apache.spark.sql.connector.read.InputPartition;
import org.jetbrains.annotations.Nullable;

import java.io.Serializable;
import java.util.List;

/**
 * Immutable implementation of Spark's partition that allows to represent a portion of the tabular data.
 * It represents contiguous range of rows [startRow, endRow] (both included).
 * Each row contains one or multiple columns.
 */
@Value
@Builder(builderClassName = "Builder", toBuilder = true)
@Jacksonized
public class TablePartition implements InputPartition {
    int index;
    long startRow;
    long endRow;
    @Singular // makes list unmodifiable
    List<ColumnPartition> columns;

    public int colCount() {
        return columns.size();
    }

    public long rowCount() {
        return PartitionUtil.rowCount(startRow, endRow);
    }

    /**
     * Metadata about a column partition.
     */
    @Value
    @lombok.Builder(builderClassName = "Builder", toBuilder = true)
    @Jacksonized
    public static class ColumnPartition implements Serializable {
        // Name of the column.
        String name;

        // Path to read a column partition.
        @Nullable
        String path;

        // Type of the data encoded into partition.
        ColumnType type;

        // Size in bytes of the column partition when it's fully loaded into memory.
        long size;

        @Override
        public String toString() {
            return "Column(name=" + name
                    + ", path=" + path
                    + ", type=" + type
                    + ", size=" + size
                    + ')';
        }
    }
}
