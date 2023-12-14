package com.epam.deltix.quantgrid.engine.spark.v2.write;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.spark.Spark;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceUtil;
import com.epam.deltix.quantgrid.engine.spark.v2.write.DataWriterV2.PartitionWrite;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.spark.broadcast.Broadcast;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.connector.write.BatchWrite;
import org.apache.spark.sql.connector.write.DataWriter;
import org.apache.spark.sql.connector.write.DataWriterFactory;
import org.apache.spark.sql.connector.write.PhysicalWriteInfo;
import org.apache.spark.sql.connector.write.WriterCommitMessage;
import org.apache.spark.util.SerializableConfiguration;

import java.util.ArrayList;
import java.util.List;

/**
 * {@see OrcWrite}
 */
@Slf4j
@RequiredArgsConstructor
public class BatchWriteV2 implements BatchWrite {
    private final String[] columnNames;
    private final ColumnType[] columnTypes;
    private final String tablePath;

    public static final ThreadLocal<TablePartition[]> WRITTEN_PARTITIONS = new ThreadLocal<>();

    @Override
    public DataWriterFactory createBatchWriterFactory(PhysicalWriteInfo info) {
        return new WriterFactory(columnNames, columnTypes, tablePath);
    }

    @Override
    public void commit(WriterCommitMessage[] messages) {
        // ideally, only now the data should be visible to the readers
        List<TablePartition> partitions = new ArrayList<>(messages.length);

        for (int partitionId = 0; partitionId < messages.length; partitionId++) {
            val commit = (PartitionWrite) messages[partitionId];
            Util.verify(commit.getPartitionId() == partitionId, "PartitionId is out of order");

            if (commit.getRowCount() == 0) {
                // do not create empty TablePartition if no records were written
                continue;
            }

            partitions.add(buildTablePartition(commit));
        }

        TablePartition[] globalPartitions = DataSourceUtil.convertToGlobalRowNumbers(partitions);

        if (globalPartitions.length == 0) {
            // create empty partition metadata
            val message = (PartitionWrite) messages[0];
            globalPartitions = new TablePartition[] {buildTablePartition(message)};
        }

        WRITTEN_PARTITIONS.set(globalPartitions);
    }

    private TablePartition buildTablePartition(PartitionWrite commit) {
        String[] paths = commit.getPath();

        TablePartition.Builder partition = TablePartition.builder()
                .index(commit.getPartitionId())
                .startRow(0)
                .endRow((long) commit.getRowCount() - 1);

        long[] sizeBytes = commit.getSizeBytes();
        for (int col = 0; col < paths.length; col++) {
            ColumnPartition columnPartition = ColumnPartition.builder()
                    .name(columnNames[col])
                    .type(columnTypes[col])
                    .path(paths[col])
                    .size(sizeBytes[col])
                    .build();

            partition.column(columnPartition);
        }
        return partition.build();
    }

    @Override
    public void abort(WriterCommitMessage[] messages) {
        Configuration hadoopConf = Spark.context().hadoopConfiguration();
        for (WriterCommitMessage message : messages) {
            if (message != null) {
                val partitionWrite = (PartitionWrite) message;
                String[] paths = partitionWrite.getPath();
                for (String path : paths) {
                    delete(hadoopConf, path);
                }
            }
        }
    }

    @SneakyThrows
    private static void delete(Configuration hadoopConf, String path) {
        try {
            val haoopPath = new org.apache.hadoop.fs.Path(path);
            FileSystem fs = haoopPath.getFileSystem(hadoopConf);
            fs.delete(haoopPath, false);
        } catch (Exception e) {
            log.warn("Could not delete column file from aborted commit: {}", path);
        }
    }

    @RequiredArgsConstructor
    private static class WriterFactory implements DataWriterFactory {

        private final Broadcast<SerializableConfiguration> hadoopConfBroadcast = DataSourceUtil.configBroadcast();
        private final String[] columnNames;
        private final ColumnType[] columnTypes;
        private final String tablePath;

        @Override
        public DataWriter<InternalRow> createWriter(int partitionId, long taskId) {
            // taskId has to be added to guaranty correct speculative execution
            Configuration hadoopConf = hadoopConfBroadcast.value().value();
            return new DataWriterV2(hadoopConf, columnNames, columnTypes, tablePath, partitionId, taskId);
        }
    }

    @Override
    public boolean useCommitCoordinator() {
        return false;
    }
}
