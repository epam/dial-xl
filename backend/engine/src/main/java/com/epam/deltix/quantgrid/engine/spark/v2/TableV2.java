package com.epam.deltix.quantgrid.engine.spark.v2;

import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.v2.read.ScanBuilderV2;
import com.epam.deltix.quantgrid.engine.spark.v2.write.BatchWriteV2;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.SneakyThrows;
import org.apache.spark.sql.connector.catalog.SupportsRead;
import org.apache.spark.sql.connector.catalog.SupportsWrite;
import org.apache.spark.sql.connector.catalog.Table;
import org.apache.spark.sql.connector.catalog.TableCapability;
import org.apache.spark.sql.connector.read.ScanBuilder;
import org.apache.spark.sql.connector.write.BatchWrite;
import org.apache.spark.sql.connector.write.LogicalWriteInfo;
import org.apache.spark.sql.connector.write.Write;
import org.apache.spark.sql.connector.write.WriteBuilder;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.sql.util.CaseInsensitiveStringMap;

import java.util.EnumSet;
import java.util.Set;

public class TableV2 implements Table, SupportsRead, SupportsWrite {

    private static final EnumSet<TableCapability> CAPABILITIES = EnumSet.of(
            TableCapability.BATCH_READ, TableCapability.BATCH_WRITE);

    private final StructType schema;
    private final String name;

    public TableV2(StructType schema) {
        this.schema = schema;
        this.name = "AnonymousTable";
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public StructType schema() {
        return schema;
    }

    @Override
    public Set<TableCapability> capabilities() {
        return CAPABILITIES;
    }

    @Override
    public ScanBuilder newScanBuilder(CaseInsensitiveStringMap options) {
        TablePartition[] partitions = parsePartitions(options);
        return new ScanBuilderV2(partitions);
    }

    @Override
    public WriteBuilder newWriteBuilder(LogicalWriteInfo info) {
        StructType writeSchema = info.schema();
        String[] columnNames = writeSchema.fieldNames();
        ColumnType[] columnTypes = SchemaUtil.toColumnTypes(writeSchema);

        String tablePath = info.options().get("path");

        return new WriteBuilder() {

            @Override
            public Write build() {
                return new Write() {
                    @Override
                    public BatchWrite toBatch() {
                        return new BatchWriteV2(columnNames, columnTypes, tablePath);
                    }
                };
            }
        };
    }

    @SneakyThrows
    private static TablePartition[] parsePartitions(CaseInsensitiveStringMap options) {
        String partitionsJson = options.get(DataSourceV2.PARTITIONS_OPTION);
        return PartitionUtil.fromJson(partitionsJson);
    }
}
