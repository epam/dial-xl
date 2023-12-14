package com.epam.deltix.quantgrid.engine.value.spark;

import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import org.apache.commons.lang.NotImplementedException;

public class SparkDoubleColumn extends SparkColumn implements DoubleColumn {

    public SparkDoubleColumn(TablePartition[] partitions) {
        super(partitions);
    }

    @Override
    public double get(long index) {
        throw new NotImplementedException("get(long index) is not implemented for " + this.getClass().getSimpleName());
    }

    @Override
    public double[] toArray() {
        throw new NotImplementedException("toArray() is not implemented for " + this.getClass().getSimpleName());
    }
}
