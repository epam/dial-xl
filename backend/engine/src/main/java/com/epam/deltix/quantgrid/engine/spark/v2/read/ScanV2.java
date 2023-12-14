package com.epam.deltix.quantgrid.engine.spark.v2.read;

import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import lombok.RequiredArgsConstructor;
import org.apache.spark.sql.connector.read.Batch;
import org.apache.spark.sql.connector.read.InputPartition;
import org.apache.spark.sql.connector.read.PartitionReaderFactory;
import org.apache.spark.sql.connector.read.Scan;
import org.apache.spark.sql.connector.read.Statistics;
import org.apache.spark.sql.connector.read.SupportsReportStatistics;
import org.apache.spark.sql.types.StructType;

import java.io.Serializable;
import java.util.OptionalLong;

@RequiredArgsConstructor
class ScanV2 implements Scan, Batch, SupportsReportStatistics, Serializable {

    private final StructType requiredSchema;
    private final TablePartition[] partitions;

    @Override
    public StructType readSchema() {
        return requiredSchema;
    }

    @Override
    public Batch toBatch() {
        return this;
    }

    @Override
    public InputPartition[] planInputPartitions() {
        return partitions;
    }

    @Override
    public PartitionReaderFactory createReaderFactory() {
        return new PartitionReaderFactoryV2();
    }

    @Override
    public Statistics estimateStatistics() {
        return new Statistics() {
            @Override
            public OptionalLong sizeInBytes() {
                return OptionalLong.of(PartitionUtil.sizeOf(partitions));
            }

            @Override
            public OptionalLong numRows() {
                return OptionalLong.of(PartitionUtil.rowCount(partitions));
            }
        };
    }
}
