package com.epam.deltix.quantgrid.engine.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.UnaryOperator;

@UtilityClass
public class PartitionUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Name of the virtual row number column that is being generated on the fly.
     */
    public static final String VIRTUAL_ROW_NUMBER_COLUMN = "_rn";

    public static int rowCount(long startRow, long endRow) {
        return Util.toIntSize(endRow - startRow + 1);
    }

    public static long rowCount(TablePartition[] partitions) {
        TablePartition last = partitions[partitions.length - 1];
        return rowCount(0, last.getEndRow());
    }

    public static long sizeOf(TablePartition[] partitions) {
        long sum = 0;
        for (TablePartition p : partitions) {
            for (ColumnPartition col : p.getColumns()) {
                sum += col.getSize();
            }
        }
        return sum;
    }

    /**
     * Zips multiple column partitions into a single table with multiple columns.
     */
    public static TablePartition[] selectColumns(List<TablePartition[]> columns) {
        return selectColumns(columns, UnaryOperator.identity());
    }

    public static TablePartition[] selectColumns(List<TablePartition[]> columns, UnaryOperator<String> nameGenerator) {
        Util.verify(!columns.isEmpty(), "Selecting empty list of columns is prohibited");
        verifyLayout(columns);

        // build rename map once, validating columns
        @Nullable String[] rename = new String[columns.size()];
        for (int i = 0; i < columns.size(); i++) {
            TablePartition[] partitions = requireColumn(columns.get(i));
            String oldName = partitions[0].getColumns().get(0).getName();
            String newName = nameGenerator.apply(oldName);
            if (!oldName.equals(newName)) {
                rename[i] = newName;
            }
        }

        TablePartition[] firstColumn = columns.get(0);

        // collect columns into this partitions array
        int partitionCount = firstColumn.length;
        TablePartition[] newPartitions = new TablePartition[partitionCount];

        for (int part = 0; part < partitionCount; part++) {
            TablePartition.Builder builder = firstColumn[part].toBuilder().clearColumns();

            // collecting all columns for the same partition index 'p'
            for (int col = 0; col < columns.size(); col++) {
                TablePartition[] columnPartitions = columns.get(col);
                ColumnPartition column = columnPartitions[part].getColumns().get(0);
                String newName = rename[col];
                ColumnPartition newColumn = newName != null
                        ? column.toBuilder().name(newName).build()
                        : column;
                builder.column(newColumn);
            }

            newPartitions[part] = builder.build();
        }
        return newPartitions;
    }

    public static TablePartition[] selectColumns(TablePartition[] partitions, String[] columnNames) {
        List<ColumnPartition> columns = partitions[0].getColumns();

        int[] columnIndices = new int[columnNames.length];
        for (int i = 0; i < columnNames.length; i++) {
            String columnName = columnNames[i];

            for (int j = 0; j < columns.size(); j++) {
                if (columns.get(j).getName().equals(columnName)) {
                    columnIndices[i] = j;
                }
            }
        }

        return selectColumns(partitions, columnIndices);
    }

    public static TablePartition[] selectColumns(TablePartition[] partitions, int[] columnIndices) {
        if (columnIndices.length == 0) {
            return selectNone(partitions);
        }

        int size = partitions[0].getColumns().size();
        if (columnIndices.length == size && isIdentityMapping(columnIndices)) {
            return partitions;
        }

        TablePartition[] newPartitions = new TablePartition[partitions.length];
        for (int i = 0; i < partitions.length; i++) {
            TablePartition p = partitions[i];
            newPartitions[i] = p.toBuilder().clearColumns()
                    .columns(select(p.getColumns(), columnIndices))
                    .build();
        }
        return newPartitions;
    }

    private static boolean isIdentityMapping(int[] columnIndices) {
        for (int i = 0; i < columnIndices.length; i++) {
            if (columnIndices[i] != i) {
                return false;
            }
        }
        return true;
    }

    public static TablePartition[] selectColumn(TablePartition[] partitions, int columnIndex) {
        return selectColumns(partitions, new int[] {columnIndex});
    }

    private static TablePartition[] selectNone(TablePartition[] partitions) {
        TablePartition[] newPartitions = new TablePartition[partitions.length];
        for (int i = 0; i < partitions.length; i++) {
            newPartitions[i] = partitions[i].toBuilder().clearColumns().build();
        }
        return newPartitions;
    }

    private static <T> List<T> select(List<T> list, int[] indices) {
        List<T> newList = new ArrayList<>(indices.length);
        for (int i : indices) {
            newList.add(list.get(i));
        }
        return newList;
    }

    public static TablePartition dropColumns(TablePartition partition, int[] dropIndices) {
        int dropLen = dropIndices.length;
        if (dropLen == 0) {
            return partition;
        }

        TablePartition.Builder builder = partition.toBuilder().clearColumns();

        int dropIndex = 0;
        for (int colIndex = 0; colIndex < partition.colCount(); colIndex++) {
            if (dropIndex >= dropLen || colIndex != dropIndices[dropIndex]) {
                builder.column(partition.getColumns().get(colIndex));
            } else {
                dropIndex++;
            }
        }

        return builder.build();
    }

    /**
     * Ensures that partitions represent a single column. It also validates that:
     * 1) there is at least 1 partition 2) all partitions have the same column name and type.
     */
    public static TablePartition[] requireColumn(TablePartition[] partitions) {
        Util.verify(partitions.length > 0, "Expect at least one partition in any table");

        ColumnPartition firstColumn = null;
        for (TablePartition partition : partitions) {
            List<ColumnPartition> columns = partition.getColumns();

            if (columns.size() != 1) {
                throw new IllegalStateException(
                        "Expect a single column, but was " + columns.size() + " in partition " + partition);
            }

            ColumnPartition column = columns.get(0);
            if (firstColumn != null) {
                Util.verify(firstColumn.getType() == column.getType(),
                        "Column type should match across partitions");
                Util.verify(firstColumn.getName().equals(column.getName()),
                        "Column name should match accross partitions");
            } else {
                firstColumn = column;
            }
        }
        return partitions;
    }

    public static ColumnPartition generateRowNumber(long rowCount) {
        long sizeBytes = rowCount * Double.BYTES;
        return new ColumnPartition(VIRTUAL_ROW_NUMBER_COLUMN, null, ColumnType.DOUBLE, sizeBytes);
    }

    public static TablePartition[] generateRowNumber(TablePartition[] partitions) {
        TablePartition[] newPartitions = new TablePartition[partitions.length];
        for (int i = 0; i < partitions.length; i++) {
            TablePartition partition = partitions[i];

            ColumnPartition rowNumber = generateRowNumber(partition.rowCount());
            newPartitions[i] = partition.toBuilder().clearColumns().column(rowNumber).build();
        }
        return newPartitions;
    }

    public static boolean isRowNumber(TablePartition partition, int position) {
        ColumnPartition column = partition.getColumns().get(position);
        // uses `startsWith`, because we may add suffix while creating aliases
        return column.getPath() == null && column.getName().startsWith(VIRTUAL_ROW_NUMBER_COLUMN);
    }

    private void verifyLayout(List<TablePartition[]> columns) {
        TablePartition[] firstColumn = columns.get(0);
        for (TablePartition[] column : columns) {
            if (column.length != firstColumn.length) {
                throw new IllegalStateException("Columns should have the same number of partitions: %d != %d"
                        .formatted(column.length, firstColumn.length));
            }

            for (int j = 0; j < column.length; j++) {
                long firstStartRow = firstColumn[j].getStartRow();
                long startRow = column[j].getStartRow();
                if (firstStartRow != startRow) {
                    throw new IllegalStateException("Layout mismatch: startRow are different: %s != %s"
                            .formatted(firstColumn[j], column[j]));
                }

                long firstEndRow = firstColumn[j].getEndRow();
                long endRow = column[j].getEndRow();
                if (firstEndRow != endRow) {
                    throw new IllegalStateException("Layout mismatch: endRow are different: %s != %s"
                            .formatted(firstColumn[j], column[j]));
                }
            }
        }
    }

    /**
     * Finds index of a partition that contains a record with a specified row number using a binary search.
     */
    public static int findPartition(long rowNum, TablePartition[] partitions) {
        int lo = 0;
        int hi = partitions.length - 1;

        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;

            TablePartition p = partitions[mid];
            if (p.getEndRow() < rowNum) {
                lo = mid + 1;
            } else if (rowNum < p.getStartRow()) {
                hi = mid - 1;
            } else {
                return mid;
            }
        }

        TablePartition lastPart = partitions[partitions.length - 1];
        throw new IllegalArgumentException("Searching for non-existent row number " + rowNum
                + ", when max row number is " + lastPart.getEndRow() + " in " + lastPart);
    }

    @SneakyThrows
    public static String toJson(TablePartition[] partitions) {
        return OBJECT_MAPPER.writeValueAsString(partitions);
    }

    @SneakyThrows
    public static TablePartition[] fromJson(String partitions) {
        return OBJECT_MAPPER.readValue(partitions, TablePartition[].class);
    }

    /**
     * Returns end row number of each partition.
     * Start row number can be restored by looking at the previous partition end row.
     */
    public static long[] ranges(TablePartition[] partitions) {
        return Arrays.stream(partitions).mapToLong(TablePartition::getEndRow).toArray();
    }
}
