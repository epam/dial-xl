package com.epam.deltix.quantgrid.engine.value.spark;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceV2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.Getter;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

public class SparkTable implements Table, SparkValue {

    @Getter
    private final TablePartition[] partitions;
    private final Dataset<Row> dataset;
    private final StructType structType;

    public SparkTable(TablePartition[] partitions) {
        Util.verify(partitions.length > 0, "At least one partition is expected");
        this.partitions = partitions;
        this.structType = SchemaUtil.toStructType(partitions[0].getColumns());

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

    @Override
    public int getColumnCount() {
        return structType.size();
    }

    @Override
    public Column[] getColumns() {
        Column[] columns = new Column[getColumnCount()];
        for (int i = 0; i < columns.length; i++) {
            columns[i] = getColumn(i);
        }
        return columns;
    }

    @Override
    public SparkColumn getColumn(int index) {
        DataType type = structType.fields()[index].dataType();
        return type == DataTypes.DoubleType ? getDoubleColumn(index) : getStringColumn(index);
    }

    @Override
    public SparkDoubleColumn getDoubleColumn(int index) {
        TablePartition[] columnPartitions = PartitionUtil.selectColumn(partitions, index);
        return new SparkDoubleColumn(columnPartitions);
    }

    @Override
    public SparkStringColumn getStringColumn(int index) {
        TablePartition[] columnPartitions = PartitionUtil.selectColumn(partitions, index);
        return new SparkStringColumn(columnPartitions);
    }

    @Override
    public PeriodSeriesColumn getPeriodSeriesColumn(int index) {
        throw new UnsupportedOperationException("period series is not yet supported");
    }

    @Override
    public Dataset<Row> getDataset() {
        return dataset;
    }

    @Override
    public boolean isEmpty() {
        return size() == 0;
    }
}
