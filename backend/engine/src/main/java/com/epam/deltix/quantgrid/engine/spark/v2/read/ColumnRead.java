package com.epam.deltix.quantgrid.engine.spark.v2.read;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.FileUtil;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceUtil;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.hive.ql.exec.vector.BytesColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.DoubleColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.ListColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.StructColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.VectorizedRowBatch;
import org.apache.orc.OrcFile;
import org.apache.orc.Reader;
import org.apache.orc.RecordReader;
import org.apache.orc.TypeDescription;
import org.apache.spark.sql.catalyst.expressions.UnsafeArrayData;
import org.apache.spark.sql.catalyst.expressions.codegen.UnsafeRowWriter;
import org.apache.spark.unsafe.Platform;

import java.io.Closeable;

@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public final class ColumnRead implements Closeable {

    private final Reader reader;
    private final RecordReader recordReader;
    private final VectorizedRowBatch batch;
    private final UnsafeRowWriter psStructWriter = new UnsafeRowWriter(3);

    public static ColumnRead createDouble(Configuration hadoopConf, Path hadoopPath) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.DOUBLE_TYPE);
    }

    public static ColumnRead createString(Configuration hadoopConf, Path hadoopPath) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.STRING_TYPE);
    }

    public static ColumnRead createPeriodSeries(Configuration hadoopConf, Path hadoopPath) {
        return create(hadoopConf, hadoopPath, DataSourceUtil.PS_TYPE);
    }

    @SneakyThrows
    private static ColumnRead create(Configuration hadoopConf, Path hadoopPath, TypeDescription type) {
        OrcFile.ReaderOptions readerOptions = OrcFile.readerOptions(hadoopConf); // cannot be cached
        Reader reader = OrcFile.createReader(hadoopPath, readerOptions);
        Reader.Options options = reader.options().schema(type);
        RecordReader recordReader = reader.rows(options);
        VectorizedRowBatch rowBatch = type.createRowBatch();
        return new ColumnRead(reader, recordReader, rowBatch);
    }

    public void getDouble(int row, UnsafeRowWriter writer, int position) {
        val doubles = (DoubleColumnVector) batch.cols[0];

        int index = row;
        if (doubles.isRepeating) {
            index = 0;
        }

        writer.write(position, doubles.vector[index]);
    }

    public void getString(int row, UnsafeRowWriter writer, int position) {
        val bytes = (BytesColumnVector) batch.cols[0];

        int index = row;
        if (bytes.isRepeating) {
            index = 0;
        }

        if (bytes.noNulls || !bytes.isNull[index]) {
            writer.write(position, bytes.vector[index], bytes.start[index], bytes.length[index]);
        } else {
            writer.setNullAt(position);
        }
    }

    public void getPeriodSeries(int row, UnsafeRowWriter writer, int position) {
        StructColumnVector periodSeries = (StructColumnVector) batch.cols[0];

        if (periodSeries.isRepeating) {
            row = 0;
        }

        if (periodSeries.isNull[row]) {
            writer.setNullAt(position);
            return;
        }

        double offset = getPeriodSeriesOffset(row, periodSeries);
        byte[] period = getPeriodSeriesPeriod(row, periodSeries);
        UnsafeArrayData values = getPeriodSeriesValue(row, periodSeries);

        psStructWriter.resetRowWriter();
        psStructWriter.reset();

        psStructWriter.write(0, offset);
        psStructWriter.write(1, period);
        int cursorBeforeArray = psStructWriter.cursor();
        // UnsafeRowWriter.write(UnsafeArrayData data) do not update offset and cursor out of the box
        // that's why we need to set in manually
        psStructWriter.write(values);
        psStructWriter.setOffsetAndSizeFromPreviousCursor(2, cursorBeforeArray);

        writer.write(position, psStructWriter.getRow());
    }

    private static double getPeriodSeriesOffset(int row, StructColumnVector periodSeries) {
        DoubleColumnVector offset =
                (DoubleColumnVector) periodSeries.fields[DataSourceUtil.PS_OFFSET_COLUMN_INDEX];

        int index = row;
        if (offset.isRepeating) {
            index = 0;
        }

        return offset.vector[index];
    }

    private static byte[] getPeriodSeriesPeriod(int row, StructColumnVector periodSeries) {
        BytesColumnVector period =
                (BytesColumnVector) periodSeries.fields[DataSourceUtil.PS_PERIOD_COLUMN_INDEX];

        int index = row;
        if (period.isRepeating) {
            index = 0;
        }

        return period.vector[index];
    }

    private static UnsafeArrayData getPeriodSeriesValue(int row, StructColumnVector periodSeries) {
        ListColumnVector values = (ListColumnVector) periodSeries.fields[DataSourceUtil.PS_VALUES_COLUMN_INDEX];
        int index = row;
        if (values.isRepeating) {
            index = 0;
        }

        int valuesOffset = Util.toIntIndex(values.offsets[index]);
        int valuesLength = Util.toIntSize(values.lengths[index]);

        DoubleColumnVector childVector = (DoubleColumnVector) values.child;

        int offset = Platform.DOUBLE_ARRAY_OFFSET + valuesOffset * Double.BYTES;
        return UnsafeArrayData.fromPrimitiveArray(childVector.vector, offset, valuesLength, Double.BYTES);
    }


    @SneakyThrows
    public int nextBatch() {
        recordReader.nextBatch(batch);
        return batch.size;
    }

    @Override
    public void close() {
        FileUtil.close(recordReader);
        FileUtil.close(reader);
    }
}
