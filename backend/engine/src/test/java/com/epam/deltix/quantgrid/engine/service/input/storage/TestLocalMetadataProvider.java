package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.util.LinkedHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class TestLocalMetadataProvider {

    private LocalMetadataProvider metadataProvider;
    private final String inputCsv = TestInputs.CPI_CSV;
    private final String inputSchema = inputCsv.replace(InputType.CSV.getExtension(), LocalMetadataProvider.SCHEMA_EXTENSION);

    @BeforeEach
    public void init() throws IOException {
        metadataProvider = new LocalMetadataProvider(TestInputs.INPUTS_PATH);
        // remove schema if any
        Files.deleteIfExists(TestInputs.INPUTS_PATH.resolve(inputSchema));
    }

    @Test
    void testSchemaFetched() {
        InputMetadata expectedMetadata = expectedCPIMetadata();
        // assert no schema fetched
        assertEquals(0, metadataProvider.getFetchedSchemas().get());

        InputMetadata metadata1 = metadataProvider.read(inputCsv);

        // assert no schema fetched
        assertEquals(0, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata1);

        InputMetadata metadata2 = metadataProvider.read(inputCsv);

        // assert schema fetched once
        assertEquals(1, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata2);

        InputMetadata metadata3 = metadataProvider.read(inputCsv);

        // assert schema fetched once
        assertEquals(2, metadataProvider.getFetchedSchemas().get());
        assertEquals(expectedMetadata, metadata3);
    }

    private InputMetadata expectedCPIMetadata() {
        LinkedHashMap<String, ColumnType> columnTypes = new LinkedHashMap<>();
        columnTypes.put("DATA_DOMAIN.id", ColumnType.STRING);
        columnTypes.put("REF_AREA.id", ColumnType.DOUBLE);
        columnTypes.put("INDICATOR.id", ColumnType.STRING);
        columnTypes.put("COUNTERPART_AREA.id", ColumnType.STRING);
        columnTypes.put("FREQ.id", ColumnType.STRING);
        columnTypes.put("TIME_PERIOD", ColumnType.DATE);
        columnTypes.put("OBS_VALUE", ColumnType.DOUBLE);
        columnTypes.put("COMMENT", ColumnType.STRING);

        String path = TestInputs.INPUTS_PATH.resolve(inputCsv).toString();
        return new InputMetadata(inputCsv, path, InputType.CSV, columnTypes);
    }
}
