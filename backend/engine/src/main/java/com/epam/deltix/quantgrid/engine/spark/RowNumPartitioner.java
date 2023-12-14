package com.epam.deltix.quantgrid.engine.spark;

import lombok.Getter;
import org.apache.spark.Partitioner;

import java.util.Arrays;
import java.util.Objects;

/**
 * Partitioning strategy by row number ranges.
 *
 * <p>Each partition represents contiguous range of rows, for instance, part-0 from [0, 10], part-1 from [11, 20], etc.
 *
 * <p>Partitioner expects to receive a row number (long) that will be used to search for a partition it belongs to.
 * For example, let's use ranges specified above and let's imagine partitioner receives rowNumber=5
 * which belongs to the range [0, 10]. As a result partitioner returns partition index 0 that represents this range.
 */
public class RowNumPartitioner extends Partitioner {
    @Getter
    private final TablePartition[] partitions;

    public RowNumPartitioner(TablePartition[] partitions) {
        this.partitions = Objects.requireNonNull(partitions);
    }

    @Override
    public int getPartition(Object key) {
        long rowNum = (Long) key;
        return PartitionUtil.findPartition(rowNum, partitions);
    }

    @Override
    public int numPartitions() {
        return partitions.length;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        RowNumPartitioner that = (RowNumPartitioner) o;
        return Arrays.equals(partitions, that.partitions);
    }

    @Override
    public int hashCode() {
        int result = 1;
        for (TablePartition partition : partitions) {
            long element = partition.getEndRow();
            result = 31 * result + Long.hashCode(element);
        }
        return result;
    }

}
