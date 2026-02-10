package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.type.InputColumnType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.util.LinkedHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class LocalInputProviderTest {

    private LocalInputProvider metadataProvider;
    private final String inputCsv = TestInputs.CPI_CSV;
    private final String inputSchema = inputCsv.replace(InputType.CSV.getExtension(), LocalInputProvider.SCHEMA_EXTENSION);

    @BeforeEach
    public void init() throws IOException {
        metadataProvider = new LocalInputProvider(TestInputs.INPUTS_PATH);
        // remove schema if any
        Files.deleteIfExists(TestInputs.INPUTS_PATH.resolve(inputSchema));
    }

    @Test
    void testSchemaFetched() {
        InputMetadata expectedMetadata = expectedCPIMetadata();
        // assert no schema fetched
        assertEquals(0, metadataProvider.getFetchedSchemas().get());

        InputMetadata metadata1 = metadataProvider.readMetadata(inputCsv, null);

        // assert no schema fetched
        assertEquals(0, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata1);

        InputMetadata metadata2 = metadataProvider.readMetadata(inputCsv, null);

        // assert schema fetched once
        assertEquals(1, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata2);

        InputMetadata metadata3 = metadataProvider.readMetadata(inputCsv, null);

        // assert schema fetched once
        assertEquals(2, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata3);
    }

    private InputMetadata expectedCPIMetadata() {
        LinkedHashMap<String, InputColumnType> columnTypes = new LinkedHashMap<>();
        columnTypes.put("DATA_DOMAIN.id", InputColumnType.STRING);
        columnTypes.put("REF_AREA.id", InputColumnType.DOUBLE);
        columnTypes.put("INDICATOR.id", InputColumnType.STRING);
        columnTypes.put("COUNTERPART_AREA.id", InputColumnType.STRING);
        columnTypes.put("FREQ.id", InputColumnType.STRING);
        columnTypes.put("TIME_PERIOD", InputColumnType.DATE);
        columnTypes.put("OBS_VALUE", InputColumnType.DOUBLE);
        columnTypes.put("COMMENT", InputColumnType.DOUBLE);

        String path = TestInputs.INPUTS_PATH.resolve(inputCsv).toString();
        return new InputMetadata(inputCsv, path, null, InputType.CSV, columnTypes);
    }
}
