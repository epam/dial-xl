package com.epam.deltix.quantgrid.engine.value.spark;

import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceV2;
import com.epam.deltix.quantgrid.engine.value.Column;
import lombok.Getter;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructType;

public abstract class SparkColumn implements Column {
    @Getter
    private final TablePartition[] partitions;
    @Getter
    private final Dataset<Row> dataset;

    protected SparkColumn(TablePartition[] partitions) {
        this.partitions = PartitionUtil.requireColumn(partitions);

        StructType structType = SchemaUtil.toStructType(partitions[0].getColumns());
        String partitionsJson = PartitionUtil.toJson(partitions);
        this.dataset = Spark.session().read()
                .format(DataSourceV2.class.getName())
                .schema(structType)
                .option(DataSourceV2.PARTITIONS_OPTION, partitionsJson)
                .load();
    }

    @Override
    public long size() {
        return PartitionUtil.rowCount(partitions);
    }
}
