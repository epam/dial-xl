package com.epam.deltix.quantgrid.engine.spark;

import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.val;
import org.apache.commons.lang3.mutable.MutableInt;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchException;

class PartitionUtilTest {

    private static final List<ColumnPartition> COLUMNS_0;
    private static final List<ColumnPartition> COLUMNS_1;
    private static final TablePartition[] PARTITIONS;
    private static final TablePartition[] PARTITIONS_AB;
    private static final long TOTAL_SIZE;

    static {
        String rowNumberName = PartitionUtil.VIRTUAL_ROW_NUMBER_COLUMN + "_someSuffix";

        int size1 = 200;
        int size2 = 100;
        int size3 = 300;
        COLUMNS_0 = List.of(
                new ColumnPartition("A", "/tmp/A0", ColumnType.DOUBLE, size1),
                new ColumnPartition(rowNumberName, null, ColumnType.DOUBLE, size2),
                new ColumnPartition("B", "/tmp/B0", ColumnType.STRING, size3)
        );
        COLUMNS_1 = List.of(
                new ColumnPartition("A", "/tmp/A1", ColumnType.DOUBLE, size1 + 1),
                new ColumnPartition(rowNumberName, null, ColumnType.DOUBLE, size2 + 1),
                new ColumnPartition("B", "/tmp/B1", ColumnType.STRING, size3 + 1)
        );
        PARTITIONS = new TablePartition[] {
                new TablePartition(0, 0, 5, COLUMNS_0),
                new TablePartition(1, 6, 9, COLUMNS_1)
        };
        TOTAL_SIZE = COLUMNS_0.stream().mapToLong(ColumnPartition::getSize).sum()
                + COLUMNS_1.stream().mapToLong(ColumnPartition::getSize).sum();

        PARTITIONS_AB = new TablePartition[] {
                PARTITIONS[0].toBuilder().clearColumns().columns(List.of(COLUMNS_0.get(0), COLUMNS_0.get(2))).build(),
                PARTITIONS[1].toBuilder().clearColumns().columns(List.of(COLUMNS_1.get(0), COLUMNS_1.get(2))).build()
        };
    }

    @Test
    void testRowCountFromRange() {
        int rowCount = PartitionUtil.rowCount(0, 5);
        assertThat(rowCount).isEqualTo(6);
    }

    @Test
    void testRowCountFromPartitions() {
        long rowCount = PartitionUtil.rowCount(PARTITIONS);
        assertThat(rowCount).isEqualTo(10);
    }

    @Test
    void testSelectColumnPartitions() {
        List<TablePartition[]> columnPartitions = List.of(
                PartitionUtil.selectColumn(PARTITIONS, 0),
                PartitionUtil.selectColumn(PARTITIONS, 1),
                PartitionUtil.selectColumn(PARTITIONS, 2)
        );

        TablePartition[] tablePartitions = PartitionUtil.selectColumns(columnPartitions);

        assertThat(tablePartitions).isEqualTo(PARTITIONS);
    }

    @Test
    void testSelectColumnPartitionsWithProcessor() {
        List<TablePartition[]> columnPartitions = List.of(
                PartitionUtil.selectColumn(PARTITIONS, 0),
                PartitionUtil.selectColumn(PARTITIONS, 1),
                PartitionUtil.selectColumn(PARTITIONS, 2)
        );

        // names are indices
        val count = new MutableInt(0);
        UnaryOperator<String> uniqueNames = name -> String.valueOf(count.getAndIncrement());

        TablePartition[] tablePartitions = PartitionUtil.selectColumns(columnPartitions, uniqueNames);

        for (int i = 0; i < tablePartitions.length; i++) {
            TablePartition original = PARTITIONS[i];
            List<ColumnPartition> originalColumns = original.getColumns();
            TablePartition.Builder expectedBuilder = original.toBuilder().clearColumns();
            for (int j = 0; j < originalColumns.size(); j++) {
                ColumnPartition expectedColumn = originalColumns.get(j).toBuilder().name(String.valueOf(j)).build();
                expectedBuilder.column(expectedColumn);
            }
            TablePartition expected = expectedBuilder.build();

            TablePartition partition = tablePartitions[i];
            assertThat(partition).isEqualTo(expected);
        }
    }

    @Test
    void testSelectIncorrectColumnPartitions() {
        TablePartition[] firstCol = PartitionUtil.selectColumn(PARTITIONS, 0);
        TablePartition last = firstCol[firstCol.length - 1];
        firstCol[firstCol.length - 1] = last.toBuilder().endRow(last.getEndRow() - 1).build();

        List<TablePartition[]> columnPartitions = List.of(
                firstCol,
                PartitionUtil.selectColumn(PARTITIONS, 1),
                PartitionUtil.selectColumn(PARTITIONS, 2)
        );

        Exception exception = catchException(() -> PartitionUtil.selectColumns(columnPartitions));
        assertThat(exception).hasMessageStartingWith("Layout mismatch: endRow are different:");
    }

    @Test
    void testSelectColumnsByName() {
        TablePartition[] tablePartitions = PartitionUtil.selectColumns(PARTITIONS, new String[] {"A", "B"});
        assertThat(tablePartitions)
                .hasSize(2)
                .isEqualTo(PARTITIONS_AB);
    }

    @Test
    void testSelectColumnsByIndex() {
        TablePartition[] tablePartitions = PartitionUtil.selectColumns(PARTITIONS, new int[] {0, 2});
        assertThat(tablePartitions)
                .hasSize(2)
                .isEqualTo(PARTITIONS_AB);
    }

    @Test
    void testSelectColumnByIndex() {
        TablePartition[] tablePartitions = PartitionUtil.selectColumn(PARTITIONS, 1);
        assertThat(tablePartitions).hasSize(2);
        assertThat(tablePartitions[0].getColumns())
                .containsExactly(PARTITIONS[0].getColumns().get(1));
        assertThat(tablePartitions[1].getColumns())
                .containsExactly(PARTITIONS[1].getColumns().get(1));
    }

    @Test
    void testRequireColumn() {
        TablePartition[] tablePartitions = PartitionUtil.selectColumn(PARTITIONS, 0);
        assertThat(PartitionUtil.requireColumn(tablePartitions)).isSameAs(tablePartitions);
    }

    @Test
    void testIsRowNumber() {
        assertThat(PartitionUtil.isRowNumber(PARTITIONS[0], 1)).isTrue();
    }

    @Test
    void testDropColumns() {
        TablePartition partition = PartitionUtil.dropColumns(PARTITIONS[0], new int[] {1});
        assertThat(partition).isEqualTo(PARTITIONS_AB[0]);

        assertThat(PartitionUtil.dropColumns(PARTITIONS[0], new int[0])).isSameAs(PARTITIONS[0]);
    }

    @Test
    void testSizeOf() {
        assertThat(PartitionUtil.sizeOf(PARTITIONS)).isEqualTo(TOTAL_SIZE);
    }
}