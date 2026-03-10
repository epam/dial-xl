package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.type.InputColumnType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class LocalInputProviderTest {

    private LocalInputProvider metadataProvider;
    private final String inputCsv = TestInputs.CPI_CSV;

    @BeforeEach
    public void init() {
        metadataProvider = new LocalInputProvider(TestInputs.INPUTS_PATH);
    }

    @Test
    void testSchemaFetched() {
        InputMetadata expectedMetadata = expectedCPIMetadata();

        InputMetadata actualMetadata = metadataProvider.readMetadata(inputCsv, null);

        assertEquals(expectedMetadata, actualMetadata);
    }

    private InputMetadata expectedCPIMetadata() {
        CsvInputMetadata.CsvTable table = new CsvInputMetadata.CsvTable(List.of(
                new ColumnMetadata("DATA_DOMAIN.id", 0, InputColumnType.STRING),
                new ColumnMetadata("REF_AREA.id", 1, InputColumnType.DOUBLE),
                new ColumnMetadata("INDICATOR.id", 2, InputColumnType.STRING),
                new ColumnMetadata("COUNTERPART_AREA.id", 3, InputColumnType.STRING),
                new ColumnMetadata("FREQ.id", 4, InputColumnType.STRING),
                new ColumnMetadata("TIME_PERIOD", 5, InputColumnType.DATE),
                new ColumnMetadata("OBS_VALUE", 6, InputColumnType.DOUBLE),
                new ColumnMetadata("COMMENT", 7, InputColumnType.DOUBLE)));

        String path = TestInputs.INPUTS_PATH.resolve(inputCsv).toString();
        return new CsvInputMetadata(path, null, table);
    }
}
