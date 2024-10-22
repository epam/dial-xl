package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.ToString;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.encoders.RowEncoder;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.Aggregator;
import org.apache.spark.sql.types.StructType;

import java.util.Arrays;

@RequiredArgsConstructor
@ToString
public class PeriodSeriesAggregator extends Aggregator<Row, PeriodSeriesAggregator.TimeSeriesPoints, Row> {

    private final Period period;

    @Override
    public PeriodSeriesAggregator.TimeSeriesPoints zero() {
        return new PeriodSeriesAggregator.TimeSeriesPoints();
    }

    @Override
    public PeriodSeriesAggregator.TimeSeriesPoints reduce(PeriodSeriesAggregator.TimeSeriesPoints b, Row a) {
        double timestamp = a.getDouble(0);
        double value = a.getDouble(1);
        double offset = period.getOffset(timestamp);

        b.addOffset(offset);
        b.addValue(value);
        return b;
    }

    @Override
    public PeriodSeriesAggregator.TimeSeriesPoints merge(PeriodSeriesAggregator.TimeSeriesPoints b1,
                                                         PeriodSeriesAggregator.TimeSeriesPoints b2) {
        b1.merge(b2);
        return b1;
    }

    @Override
    public GenericRow finish(PeriodSeriesAggregator.TimeSeriesPoints reduction) {
        return reduction.toRow(period);
    }

    @Override
    public Encoder<PeriodSeriesAggregator.TimeSeriesPoints> bufferEncoder() {
        return Encoders.bean(PeriodSeriesAggregator.TimeSeriesPoints.class);
    }

    @Override
    public Encoder<Row> outputEncoder() {
        return RowEncoder.apply((StructType) SchemaUtil.sparkDataType(ColumnType.PERIOD_SERIES));
    }

    @NoArgsConstructor
    public static class TimeSeriesPoints {
        private DoubleArrayList offsets = new DoubleArrayList();
        private DoubleArrayList values = new DoubleArrayList();

        public TimeSeriesPoints merge(TimeSeriesPoints points) {
            offsets.addAll(points.offsets);
            values.addAll(points.values);
            return this;
        }

        public GenericRow toRow(Period period) {
            Util.verify(values.size() == offsets.size(), "Offsets must be same size as values");

            // empty period series
            if (offsets.isEmpty()) {
                return new GenericRow(new Object[] {Doubles.ERROR_NA, period.name(), new double[0]});
            }

            double minOffset = Double.MAX_VALUE;
            double maxOffset = -1;
            for (double offset : offsets) {
                if (offset > maxOffset) {
                    maxOffset = offset;
                }

                if (offset < minOffset) {
                    minOffset = offset;
                }
            }

            int resultLength = (int) (maxOffset - minOffset) + 1;
            double[] result = new double[resultLength];
            Arrays.fill(result, Doubles.ERROR_NA);
            for (int i = 0; i < offsets.size(); i++) {
                double offset = offsets.getDouble(i);
                double value = values.getDouble(i);

                result[(int) (offset - minOffset)] = value;
            }

            return new GenericRow(new Object[] {minOffset, period.name(), result});
        }

        public void addOffset(double offset) {
            offsets.add(offset);
        }

        public void addValue(double value) {
            values.add(value);
        }

        // getters and setters below are used for encoding/decoding
        public double[] getOffsets() {
            return offsets.toDoubleArray();
        }

        public double[] getValues() {
            return values.toDoubleArray();
        }

        public void setOffsets(double[] offsets) {
            this.offsets = DoubleArrayList.of(offsets);
        }

        public void setValues(double[] values) {
            this.values = DoubleArrayList.of(values);
        }
    }
}
