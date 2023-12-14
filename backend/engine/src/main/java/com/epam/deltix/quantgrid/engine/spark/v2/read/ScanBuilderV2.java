package com.epam.deltix.quantgrid.engine.spark.v2.read;

import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import org.apache.spark.sql.connector.read.Scan;
import org.apache.spark.sql.connector.read.ScanBuilder;
import org.apache.spark.sql.connector.read.SupportsPushDownRequiredColumns;
import org.apache.spark.sql.types.StructType;

public class ScanBuilderV2 implements ScanBuilder, SupportsPushDownRequiredColumns {
    private TablePartition[] partitions;
    private StructType requiredSchema;

    public ScanBuilderV2(TablePartition[] partitions) {
        this.partitions = partitions;
    }

    @Override
    public Scan build() {
        return new ScanV2(requiredSchema, partitions);
    }

    @Override
    public void pruneColumns(StructType requiredSchema) {
        this.requiredSchema = requiredSchema;
        this.partitions = PartitionUtil.selectColumns(partitions, requiredSchema.fieldNames());
    }
}
