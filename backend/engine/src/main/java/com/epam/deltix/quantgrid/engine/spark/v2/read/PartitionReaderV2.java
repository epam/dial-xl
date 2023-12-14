package com.epam.deltix.quantgrid.engine.spark.v2.read;


import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.FileUtil;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil.TypedPositions;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.catalyst.expressions.UnsafeRow;
import org.apache.spark.sql.catalyst.expressions.codegen.UnsafeRowWriter;
import org.apache.spark.sql.connector.read.PartitionReader;

import java.util.List;

@Slf4j
public final class PartitionReaderV2 implements PartitionReader<InternalRow> {
    private final TablePartition partition;
    private final boolean hasColumnsOnDisk;
    private final TypedPositions typedPositions;
    private final int[] rowReferencePositions;

    private long next;
    private final long endRow;

    private final ColumnRead[] doubleColumns;
    private final ColumnRead[] stringColumns;
    private final ColumnRead[] psColumns;
    private int row;
    private int size;

    private final UnsafeRowWriter unsafeRowWriter;
    private UnsafeRow currentRow;

    public PartitionReaderV2(TablePartition fullPartition, Configuration conf) {
        this.rowReferencePositions = findRowReferenceColumns(fullPartition);
        this.partition = PartitionUtil.dropColumns(fullPartition, rowReferencePositions);
        this.hasColumnsOnDisk = this.partition.colCount() > 0;
        this.next = fullPartition.getStartRow();
        this.endRow = fullPartition.getEndRow();
        this.unsafeRowWriter = new UnsafeRowWriter(fullPartition.colCount());
        unsafeRowWriter.resetRowWriter(); // makes sure writer buffer has enough space for fixed-length data

        this.typedPositions = SchemaUtil.groupColumnsByType(fullPartition.getColumns());
        this.doubleColumns = new ColumnRead[typedPositions.getDoubles().length];
        this.stringColumns = new ColumnRead[typedPositions.getStrings().length];
        this.psColumns = new ColumnRead[typedPositions.getPeriodSeries().length];
        if (hasColumnsOnDisk && fullPartition.rowCount() > 0) {
            openColumns(conf, fullPartition.getColumns());
        }
    }

    @SneakyThrows
    private void openColumns(Configuration conf, List<ColumnPartition> columns) {
        int[] doublePositions = typedPositions.getDoubles();
        for (int i = 0; i < doublePositions.length; i++) {
            int position = doublePositions[i];

            if (ArrayUtils.contains(rowReferencePositions, position)) {
                // keep row number column with null
                continue;
            }

            Path hadoopPath = hadoopPath(columns.get(position));
            doubleColumns[i] = ColumnRead.createDouble(conf, hadoopPath);
        }

        int[] stringPositions = typedPositions.getStrings();
        for (int i = 0; i < stringPositions.length; i++) {
            int position = stringPositions[i];
            Path hadoopPath = hadoopPath(columns.get(position));
            stringColumns[i] = ColumnRead.createString(conf, hadoopPath);
        }

        int[] periodSeriesPositions = typedPositions.getPeriodSeries();
        for (int i = 0; i < periodSeriesPositions.length; i++) {
            int position = periodSeriesPositions[i];
            Path hadoopPath = hadoopPath(columns.get(position));
            psColumns[i] = ColumnRead.createPeriodSeries(conf, hadoopPath);
        }
    }

    private static Path hadoopPath(ColumnPartition column) {
        Util.verify(column.getPath() != null, "Column path could not be null: %s", column);
        return new Path(column.getPath());
    }

    @Override
    public boolean next() {
        if (next > endRow) {
            return false;
        }

        if (hasColumnsOnDisk && row == size) {
            nextBatch();
        }

        long number = next++;
        currentRow = nextRow(number);
        row++;
        return true;
    }

    @Override
    public UnsafeRow get() {
        return currentRow;
    }

    private void nextBatch() {
        row = 0;
        size = -1;
        size = columnNextBatch(doubleColumns, size);
        size = columnNextBatch(stringColumns, size);
        size = columnNextBatch(psColumns, size);
    }

    private static int columnNextBatch(ColumnRead[] columns, int size) {
        for (ColumnRead column : columns) {
            if (column == null) {
                continue;
            }
            int colSize = column.nextBatch();
            if (size == -1) {
                size = colSize;
            } else {
                Util.verify(size == colSize, "Read columns with different speed");
            }
        }
        return size;
    }

    private UnsafeRow nextRow(long number) {
        unsafeRowWriter.reset(); // only resets a cursor in a buffer to the start

        // required, clears out null bits, without it a null value from a previous row will take precedence
        unsafeRowWriter.zeroOutNullBytes();

        int[] doublePositions = typedPositions.getDoubles();
        for (int index = 0; index < doublePositions.length; index++) {
            int position = doublePositions[index];
            ColumnRead column = doubleColumns[index];

            if (column == null) { // null is used for a row number
                unsafeRowWriter.write(position, (double) number);
                continue;
            }

            column.getDouble(row, unsafeRowWriter, position);
        }

        int[] stringPositions = typedPositions.getStrings();
        for (int index = 0; index < stringPositions.length; index++) {
            int position = stringPositions[index];
            stringColumns[index].getString(row, unsafeRowWriter, position);
        }

        int[] periodSeriesPositions = typedPositions.getPeriodSeries();
        for (int index = 0; index < periodSeriesPositions.length; index++) {
            int position = periodSeriesPositions[index];
            psColumns[index].getPeriodSeries(row, unsafeRowWriter, position);
        }

        return unsafeRowWriter.getRow();
    }

    @Override
    public void close() {
        FileUtil.close(doubleColumns);
        FileUtil.close(stringColumns);
        FileUtil.close(psColumns);
    }

    private static int[] findRowReferenceColumns(TablePartition partition) {
        IntList positions = new IntArrayList();

        for (int position = 0; position < partition.colCount(); position++) {
            if (PartitionUtil.isRowNumber(partition, position)) {
                positions.add(position);
            }
        }

        return positions.toIntArray();
    }
}
