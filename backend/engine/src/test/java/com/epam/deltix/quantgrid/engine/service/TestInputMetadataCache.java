package com.epam.deltix.quantgrid.engine.service;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalMetadataProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.LinkedHashMap;

class TestInputMetadataCache {
    private InputMetadataCache inputMetadataCache;
    private final Path inputsPath = TestInputs.INPUTS_PATH;

    @BeforeEach
    public void init() {
        MetadataProvider metadataProvider = new LocalMetadataProvider(inputsPath);
        inputMetadataCache = new InputMetadataCache(metadataProvider);
    }

    @Test
    void testInputMetadata() {
        String countriesInput = TestInputs.CPI_CSV;

        Assertions.assertTrue(inputMetadataCache.metadataCache.isEmpty());

        LinkedHashMap<String, ColumnType> columnTypes = new LinkedHashMap<>();
        columnTypes.put("DATA_DOMAIN.id", ColumnType.STRING);
        columnTypes.put("REF_AREA.id", ColumnType.DOUBLE);
        columnTypes.put("INDICATOR.id", ColumnType.STRING);
        columnTypes.put("COUNTERPART_AREA.id", ColumnType.STRING);
        columnTypes.put("FREQ.id", ColumnType.STRING);
        columnTypes.put("TIME_PERIOD", ColumnType.DATE);
        columnTypes.put("OBS_VALUE", ColumnType.DOUBLE);
        columnTypes.put("COMMENT", ColumnType.STRING);

        String path = inputsPath.resolve(countriesInput).toString();
        InputMetadata expected = new InputMetadata(countriesInput, path, InputType.CSV, columnTypes);

        InputMetadata countriesMetadata = inputMetadataCache.getInputMetadata(countriesInput);
        Assertions.assertEquals(1, inputMetadataCache.metadataCache.size());
        Assertions.assertEquals(expected, countriesMetadata);
    }
}
