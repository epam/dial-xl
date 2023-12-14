package com.epam.deltix.quantgrid.engine.value.spark;

import lombok.Value;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

@Value
public class SparkDatasetTable implements SparkValue {

    Dataset<Row> dataset;

    @Override
    public boolean isEmpty() {
        return dataset.isEmpty();
    }
}
