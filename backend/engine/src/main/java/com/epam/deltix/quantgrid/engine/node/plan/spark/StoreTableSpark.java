package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.v2.DataSourceV2;
import com.epam.deltix.quantgrid.engine.spark.v2.write.BatchWriteV2;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;

public class StoreTableSpark extends Plan1<SparkValue, SparkTable> {

    private final String tablePath;

    public StoreTableSpark(Plan input, String tablePath) {
        super(input);
        this.tablePath = tablePath;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    protected SparkTable execute(SparkValue input) {
        Dataset<Row> dataset = input.getDataset();
        TablePartition[] partitions = save(dataset, tablePath);
        return new SparkTable(partitions);
    }

    public static TablePartition[] save(Dataset<Row> dataset, String tablePath) {
        // Append mode is used for now, because Catalog is not implemented for our data source.
        // Other modes require additional features implemented:
        // 1) check existence (Overwrite, ErrorIfExists)
        // 2) ability to truncate the table (Overwrite)
        dataset.write().format(DataSourceV2.class.getName())
                .mode(SaveMode.Append)
                .save(tablePath);

        // We should fix this. Perhaps by using a Catalog, we can start with InMemoryCatalog
        return BatchWriteV2.WRITTEN_PARTITIONS.get();
    }
}
