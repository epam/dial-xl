package com.epam.deltix.quantgrid.engine.spark.v2.write;

import com.epam.deltix.quantgrid.engine.spark.FileUtil;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceUtil;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.hive.ql.exec.vector.BytesColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.DoubleColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.ListColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.StructColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.VectorizedRowBatch;
import org.apache.orc.OrcFile;
import org.apache.orc.TypeDescription;
import org.apache.orc.Writer;

import java.io.Closeable;
import java.io.IOException;

@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public final class ColumnWrite implements Closeable {

    private final Writer writer;
    private final VectorizedRowBatch batch;

    public static ColumnWrite createDouble(Configuration hadoopConf, Path hadoopPath, int maxSize) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.DOUBLE_TYPE, maxSize);
    }

    public static ColumnWrite createString(Configuration hadoopConf, Path hadoopPath, int maxSize) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.STRING_TYPE, maxSize);
    }

    public static ColumnWrite createPeriodSeries(Configuration hadoopConf, Path hadoopPath, int maxSize) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.PS_TYPE, maxSize);
    }

    private static ColumnWrite create(Configuration hadoopConf, Path hadoopPath, TypeDescription type, int maxSize) {
        Writer writer = createWriter(hadoopConf, hadoopPath, type);
        VectorizedRowBatch batch = type.createRowBatch(maxSize);
        return new ColumnWrite(writer, batch);
    }

    @SneakyThrows
    private static Writer createWriter(Configuration hadoopConf, Path hadoopPath, TypeDescription type) {
        FileSystem fs = hadoopPath.getFileSystem(hadoopConf);

        OrcFile.WriterOptions options = OrcFile.writerOptions(hadoopConf)
                .setSchema(type)
                .fileSystem(fs);

        return OrcFile.createWriter(hadoopPath, options);
    }

    public void setDouble(int row, double value) {
        val col = (DoubleColumnVector) batch.cols[0];
        col.vector[row] = value;
    }

    public void setStringNull(int row) {
        val col = (BytesColumnVector) batch.cols[0];
        col.noNulls = false;
        col.isNull[row] = true;
    }

    public void setStringVal(int row, byte[] array, int arrayOffset, int size) {
        val col = (BytesColumnVector) batch.cols[0];
        col.setVal(row, array, arrayOffset, size);
    }

    public void setStringRef(int row, byte[] array) {
        val col = (BytesColumnVector) batch.cols[0];
        col.setRef(row, array, 0, array.length);
    }

    public void setPeriodSeries(int row, double offset, byte[] period, double[] values) {
        StructColumnVector periodSeries = (StructColumnVector) batch.cols[0];

        setPeriodSeriesOffset(row, offset, periodSeries);
        setPeriodSeriesPeriod(row, period, periodSeries);
        setPeriodSeriesValues(row, values, periodSeries);
    }

    private static void setPeriodSeriesOffset(int row, double offset, StructColumnVector periodSeries) {
        ((DoubleColumnVector) periodSeries.fields[DataSourceUtil.PS_OFFSET_COLUMN_INDEX]).vector[row] = offset;
    }

    private static void setPeriodSeriesPeriod(int row, byte[] period, StructColumnVector periodSeries) {
        ((BytesColumnVector) periodSeries.fields[DataSourceUtil.PS_PERIOD_COLUMN_INDEX]).setVal(row, period);
    }

    private static void setPeriodSeriesValues(int row, double[] values, StructColumnVector periodSeries) {
        ListColumnVector valuesVector =
                ((ListColumnVector) periodSeries.fields[DataSourceUtil.PS_VALUES_COLUMN_INDEX]);
        valuesVector.lengths[row] = values.length;
        valuesVector.offsets[row] = valuesVector.childCount;
        valuesVector.childCount += values.length;
        valuesVector.ensureSize(valuesVector.childCount, true);
        DoubleColumnVector childVector = (DoubleColumnVector) valuesVector.child;

        long valuesOffset = valuesVector.offsets[row];
        System.arraycopy(values, 0, childVector.vector, (int) valuesOffset, values.length);
    }

    public void setPeriodSeriesNull(int row) {
        StructColumnVector periodSeries = (StructColumnVector) batch.cols[0];
        periodSeries.noNulls = false;
        periodSeries.isNull[row] = true;
    }

    public void flush(int size) throws IOException {
        batch.size = size;
        writer.addRowBatch(batch);
        batch.reset();
    }

    @Override
    public void close() {
        FileUtil.close(writer);
    }
}
