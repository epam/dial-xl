package com.epam.deltix.quantgrid.engine.node.plan.spark.util;

import lombok.experimental.UtilityClass;
import org.apache.hadoop.shaded.com.google.common.collect.Streams;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.Arrays;

@UtilityClass
public class DatasetUtil {

    public String[] concatWithSuffix(String[] left, String[] right) {
        return Streams.concat(
                Arrays.stream(left).map(s -> s + "_l"),
                Arrays.stream(right).map(s -> s + "_r")
        ).toArray(String[]::new);
    }

    public Column escapedCol(Dataset<Row> dataset, String colName) {
        // column `DATA.id` is treated as single column, while DATA.id is a column id in a DATA struct
        return dataset.col("`" + colName + "`");
    }

}
