package com.epam.deltix.quantgrid.engine.spark.v2;

import lombok.SneakyThrows;
import org.apache.spark.sql.connector.catalog.Table;
import org.apache.spark.sql.connector.catalog.TableProvider;
import org.apache.spark.sql.connector.expressions.Transform;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.sql.util.CaseInsensitiveStringMap;

import java.util.Map;

public class DataSourceV2 implements TableProvider {
    public static final String PARTITIONS_OPTION = "partitions";

    @Override
    public StructType inferSchema(CaseInsensitiveStringMap options) {
        throw new IllegalStateException("Please specify read schema: spark.read().schema(readSchema)");
    }

    @Override
    @SneakyThrows
    public Table getTable(StructType schema, Transform[] partitioning, Map<String, String> properties) {
        return new TableV2(schema);
    }

    @Override
    public boolean supportsExternalMetadata() {
        return true;
    }
}
