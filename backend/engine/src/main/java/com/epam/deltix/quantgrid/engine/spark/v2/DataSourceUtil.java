package com.epam.deltix.quantgrid.engine.spark.v2;

import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;
import org.apache.orc.TypeDescription;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.broadcast.Broadcast;
import org.apache.spark.sql.execution.datasources.orc.OrcUtils;
import org.apache.spark.util.SerializableConfiguration;

import java.nio.file.Path;
import java.util.List;

@UtilityClass
public class DataSourceUtil {

    public static final int PS_OFFSET_COLUMN_INDEX = 0;
    public static final int PS_PERIOD_COLUMN_INDEX = 1;
    public static final int PS_VALUES_COLUMN_INDEX = 2;

    public static final TypeDescription STRING_TYPE = TypeDescription.createString();
    public static final TypeDescription DOUBLE_TYPE = TypeDescription.createDouble();
    public static final TypeDescription PS_TYPE = TypeDescription.createStruct()
            .addField("PS", OrcUtils.orcTypeDescription(SchemaUtil.sparkDataType(ColumnType.PERIOD_SERIES)));

    public Broadcast<SerializableConfiguration> configBroadcast() {
        JavaSparkContext javaContext = Spark.javaContext();
        SerializableConfiguration hadoopConfSer = new SerializableConfiguration(javaContext.hadoopConfiguration());
        return javaContext.broadcast(hadoopConfSer);
    }

    /**
     * Partitions are written independently, without knowledge about number of records in the previous partitions.
     * That's why each partition starts with 0 (startRow) and endRow is rowCount - 1.
     *
     * @return array of partitions that have been sequentially indexed and their row numbers made continuous
     */
    public static TablePartition[] convertToGlobalRowNumbers(List<TablePartition> partitions) {
        TablePartition[] result = new TablePartition[partitions.size()];
        long nextStartRow = 0;
        for (int i = 0; i < result.length; ++i) {
            TablePartition p = partitions.get(i);
            if (p.getStartRow() != 0) {
                throw new IllegalStateException("startRow is expected to be 0, but was " + p.getStartRow());
            }

            result[i] = p.toBuilder()
                    .index(i)
                    .startRow(nextStartRow)
                    .endRow(nextStartRow + p.getEndRow())
                    .build();

            nextStartRow = result[i].getEndRow() + 1;
        }
        return result;
    }

    public static Path columnPathOf(String tablePath, String column, int partitionId, long taskId) {
        return Path.of(tablePath, column, "part-" + partitionId + "-" + taskId);
    }
}
