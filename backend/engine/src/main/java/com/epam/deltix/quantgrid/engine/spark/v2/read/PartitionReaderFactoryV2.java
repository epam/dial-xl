package com.epam.deltix.quantgrid.engine.spark.v2.read;

import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceUtil;
import org.apache.hadoop.conf.Configuration;
import org.apache.spark.broadcast.Broadcast;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.connector.read.InputPartition;
import org.apache.spark.sql.connector.read.PartitionReader;
import org.apache.spark.sql.connector.read.PartitionReaderFactory;
import org.apache.spark.util.SerializableConfiguration;

public class PartitionReaderFactoryV2 implements PartitionReaderFactory {
    private final Broadcast<SerializableConfiguration> hadoopConfBroadcast = DataSourceUtil.configBroadcast();

    @Override
    public PartitionReader<InternalRow> createReader(InputPartition inputPartition) {
        TablePartition partition = (TablePartition) inputPartition;
        Configuration hadoopConf = hadoopConfBroadcast.getValue().value();
        return new PartitionReaderV2(partition, hadoopConf);
    }
}
