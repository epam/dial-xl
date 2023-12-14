package com.epam.deltix.quantgrid.engine.value.spark;

import com.epam.deltix.quantgrid.engine.value.Value;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public interface SparkValue extends Value {

    Dataset<Row> getDataset();

    boolean isEmpty();
}
