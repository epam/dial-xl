package com.epam.deltix.quantgrid.engine.spark.v2.write;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.FileUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceUtil;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.hive.ql.exec.vector.VectorizedRowBatch;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.connector.write.DataWriter;
import org.apache.spark.sql.connector.write.WriterCommitMessage;
import org.apache.spark.unsafe.Platform;
import org.apache.spark.unsafe.types.UTF8String;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Slf4j
@RequiredArgsConstructor
public class DataWriterV2 implements DataWriter<InternalRow> {
    public static final int BATCH_MAX_SIZE = VectorizedRowBatch.DEFAULT_SIZE;

    private final Configuration hadoopConf;
    private final int partitionId;

    private final int[] doublePositions;
    private final int[] stringPositions;
    private final int[] psPositions;

    private final Path[] columnPaths;
    private final long[] totalBytes;

    private final ColumnWrite[] doubleColumns;
    private final ColumnWrite[] stringColumns;
    private final ColumnWrite[] psColumns;
    private int row;
    private final int maxSize;
    private boolean open;

    private final FileSystem fileSystem;
    private int rowCount;

    @SneakyThrows
    public DataWriterV2(
            Configuration hadoopConf,
            String[] columnNames,
            ColumnType[] columnTypes,
            String tablePath,
            int partitionId,
            long taskId) {
        this.hadoopConf = hadoopConf;
        this.partitionId = partitionId;

        SchemaUtil.TypedPositions typedPositions = SchemaUtil.groupTypes(columnTypes);
        this.doublePositions = typedPositions.getDoubles();
        this.stringPositions = typedPositions.getStrings();
        this.psPositions = typedPositions.getPeriodSeries();
        this.totalBytes = new long[columnTypes.length];
        this.rowCount = 0;

        this.columnPaths = Arrays.stream(columnNames)
                .map(column -> DataSourceUtil.columnPathOf(tablePath, column, partitionId, taskId))
                .map(p -> new Path(p.toUri()))
                .toArray(Path[]::new);
        Util.verify(columnPaths.length > 0, "Column paths are empty");

        this.fileSystem = columnPaths[0].getFileSystem(hadoopConf);

        this.doubleColumns = new ColumnWrite[doublePositions.length];
        this.stringColumns = new ColumnWrite[stringPositions.length];
        this.psColumns = new ColumnWrite[psPositions.length];
        this.open = false; // ensures that empty partitions do not create empty files
        this.row = 0;
        this.maxSize = BATCH_MAX_SIZE;
    }

    @Override
    public void write(InternalRow internalRow) throws IOException {
        if (!open) {
            open = true;
            openColumns();
        }

        if (row == maxSize) {
            flush();
        }

        // write doubles
        for (int i = 0; i < doublePositions.length; i++) {
            double value = internalRow.getDouble(doublePositions[i]);
            doubleColumns[i].setDouble(row, value);
        }

        // write strings
        for (int i = 0; i < stringPositions.length; i++) {
            int position = stringPositions[i];
            ColumnWrite column = stringColumns[i];
            totalBytes[position] += writeString(internalRow, position, column, row);
        }

        // write period series
        for (int i = 0; i < psPositions.length; i++) {
            int position = psPositions[i];
            ColumnWrite column = psColumns[i];
            totalBytes[position] += writePeriodSeries(internalRow, position, column, row);
        }

        row++;
        rowCount++;
    }

    @SneakyThrows
    private void flush() {
        flush(doubleColumns, row);
        flush(stringColumns, row);
        flush(psColumns, row);
        row = 0;
    }

    private static void flush(ColumnWrite[] columns, int size) throws IOException {
        for (ColumnWrite column : columns) {
            column.flush(size);
        }
    }

    private void openColumns() {
        for (int i = 0; i < doublePositions.length; i++) {
            int position = doublePositions[i];
            Path hadoopPath = columnPaths[position];
            doubleColumns[i] = ColumnWrite.createDouble(hadoopConf, hadoopPath, maxSize);
        }
        for (int i = 0; i < stringPositions.length; i++) {
            int position = stringPositions[i];
            Path hadoopPath = columnPaths[position];
            stringColumns[i] = ColumnWrite.createString(hadoopConf, hadoopPath, maxSize);
        }
        for (int i = 0; i < psPositions.length; i++) {
            int position = psPositions[i];
            Path hadoopPath = columnPaths[position];
            psColumns[i] = ColumnWrite.createPeriodSeries(hadoopConf, hadoopPath, maxSize);
        }
    }

    private static int writeString(InternalRow internalRow, int position, ColumnWrite columnWrite, int row) {
        if (internalRow.isNullAt(position)) {
            columnWrite.setStringNull(row);
            return Integer.BYTES;
        }

        UTF8String utf8String = internalRow.getUTF8String(position);

        // size
        int size = utf8String.numBytes();

        // bytes
        Object base = utf8String.getBaseObject();
        if (base instanceof byte[] array) {
            int arrayOffset = (int) (utf8String.getBaseOffset() - Platform.BYTE_ARRAY_OFFSET);
            columnWrite.setStringVal(row, array, arrayOffset, size);
        } else {
            byte[] array = internalRow.getBinary(position);
            columnWrite.setStringRef(row, array);
        }

        return Integer.BYTES + size;
    }

    private static int writePeriodSeries(InternalRow internalRow, int position, ColumnWrite columnWrite, int row) {
        boolean isNullablePeriodSeries = internalRow.isNullAt(position);
        if (isNullablePeriodSeries) {
            columnWrite.setPeriodSeriesNull(row);
            return Integer.BYTES;
        }

        InternalRow periodSeries = internalRow.getStruct(position, 3);

        double offset = periodSeries.getDouble(DataSourceUtil.PS_OFFSET_COLUMN_INDEX);
        byte[] period = periodSeries.getString(DataSourceUtil.PS_PERIOD_COLUMN_INDEX)
                .getBytes(StandardCharsets.UTF_8);
        double[] values = periodSeries.getArray(DataSourceUtil.PS_VALUES_COLUMN_INDEX).toDoubleArray();

        columnWrite.setPeriodSeries(row, offset, period, values);

        return Double.BYTES + Integer.BYTES + period.length + Integer.BYTES + (Double.BYTES * values.length);
    }

    @Override
    public WriterCommitMessage commit() {
        close();

        long doubleColumnBytes = (long) rowCount * Double.BYTES;
        for (int position : doublePositions) {
            totalBytes[position] = doubleColumnBytes;
        }

        String[] paths = Arrays.stream(columnPaths).map(Path::toString).toArray(String[]::new);

        return new PartitionWrite(partitionId, rowCount, totalBytes, paths);
    }

    @Override
    public void abort() {
        close();
        for (Path columnPath : columnPaths) {
            deleteQuietly(columnPath);
        }
    }

    private void deleteQuietly(Path columnPath) {
        try {
            if (columnPath != null) {
                fileSystem.delete(columnPath, false);
            }
        } catch (Exception e) {
            log.warn("Could not close file");
        }
    }

    @Override
    public void close() {
        try {
            if (row > 0) {
                flush();
            }
        } finally {
            FileUtil.close(doubleColumns);
            FileUtil.close(stringColumns);
            FileUtil.close(psColumns);
        }
    }

    @Value
    public static class PartitionWrite implements WriterCommitMessage {
        int partitionId;
        int rowCount;
        long[] sizeBytes;
        String[] path;
    }
}
