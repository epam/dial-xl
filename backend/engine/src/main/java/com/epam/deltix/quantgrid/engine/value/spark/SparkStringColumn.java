package com.epam.deltix.quantgrid.engine.value.spark;

import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import org.apache.commons.lang.NotImplementedException;

public class SparkStringColumn extends SparkColumn implements StringColumn {

    public SparkStringColumn(TablePartition[] partitions) {
        super(partitions);
    }

    @Override
    public String get(long index) {
        throw new NotImplementedException("get(long index) is not implemented for " + this.getClass().getSimpleName());
    }

    @Override
    public String[] toArray() {
        throw new NotImplementedException("toArray() is not implemented for " + this.getClass().getSimpleName());
    }
}
