package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.engine.service.input.storage.SparkInputProvider;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verifyWithHeader;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.ALL_TYPES_CSV;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.CPI_CSV;

class SparkInputProviderTest extends SharedLocalSparkTest {

    @Test
    void testFullReadCpi() {
        InputMetadata metadata = TestInputs.readMetadata(CPI_CSV);
        List<String> readColumns = List.copyOf(metadata.columnTypes().keySet());

        SparkValue value = new SparkInputProvider().read(readColumns, metadata);
        Dataset<Row> dataset = value.getDataset();

        verifyWithHeader(dataset, """
                +--------------+-----------+------------+-------------------+-------+-----------+---------+-------+
                |DATA_DOMAIN.id|REF_AREA.id|INDICATOR.id|COUNTERPART_AREA.id|FREQ.id|TIME_PERIOD|OBS_VALUE|COMMENT|
                +--------------+-----------+------------+-------------------+-------+-----------+---------+-------+
                |CPI           |111.0      |GDP         |W1                 |A      |43101.0    |105.57   |null   |
                |CPI           |111.0      |GDP         |W1                 |A      |43466.0    |104.67   |null   |
                |CPI           |111.0      |GDP         |W1                 |A      |43831.0    |99.87    |null   |
                |CPI           |111.0      |GDP         |W1                 |Q      |43101.0    |135.987  |null   |
                |CPI           |111.0      |GDP         |W1                 |Q      |43191.0    |145.4    |null   |
                +--------------+-----------+------------+-------------------+-------+-----------+---------+-------+
                """);
    }

    @Test
    void testPartialReadCpi() {
        InputMetadata metadata = TestInputs.readMetadata(CPI_CSV);

        List<String> readColumns = List.of("TIME_PERIOD", "DATA_DOMAIN.id");
        SparkValue value = new SparkInputProvider().read(readColumns, metadata);

        Dataset<Row> dataset = value.getDataset();

        verifyWithHeader(dataset, """
                +-----------+--------------+
                |TIME_PERIOD|DATA_DOMAIN.id|
                +-----------+--------------+
                |43101.0    |CPI           |
                |43466.0    |CPI           |
                |43831.0    |CPI           |
                |43101.0    |CPI           |
                |43191.0    |CPI           |
                +-----------+--------------+
                """);
    }

    @Test
    void testReadAllTypesWithNull() {
        InputMetadata metadata = TestInputs.readMetadata(ALL_TYPES_CSV);
        List<String> readColumns = List.copyOf(metadata.columnTypes().keySet());
        SparkValue value = new SparkInputProvider().read(readColumns, metadata);

        Dataset<Row> dataset = value.getDataset();

        verifyWithHeader(dataset, """
                +-----+-----+------+-------+-----+
                |STR.1|DBL.2|BOOL.3|DATE.4 |INT.5|
                +-----+-----+------+-------+-----+
                |CPI  |1.1  |0.0   |43101.0|105.0|
                |null |1.2  |1.0   |NaN    |104.0|
                |CPI  |NaN  |NaN   |43831.0|NaN  |
                |null |NaN  |NaN   |43101.0|135.0|
                |null |NaN  |NaN   |NaN    |NaN  |
                |CPI  |1.5  |1.0   |43191.0|145.0|
                +-----+-----+------+-------+-----+
                """);
    }
}
