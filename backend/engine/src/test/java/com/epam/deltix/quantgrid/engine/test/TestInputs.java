package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalInputProvider;
import lombok.experimental.UtilityClass;

import java.nio.file.Path;

@UtilityClass
public class TestInputs {
    public static final Path INPUTS_PATH = Path.of("build/resources/test/inputs");

    public static final String CPI_CSV = "CPI.csv";
    public static final String ALL_TYPES_CSV = "all-types-with-null.csv";
    public static final String COUNTRY_INDICATORS_CSV = "country-indicators.csv";
    public static final String COUNTRY_INDICATORS_SORTED_CSV = "country-indicators-sorted.csv"; // by country, indicator
    public static final String USA_GDP_SORTED_CSV = "usa-gdp-sorted.csv";
    public static final String COUNTRY_STATS_CSV = "country-stats.csv";
    public static final String EMPTY_AND_ANONYMOUS_COLUMNS_CSV = "empty-and-anonymous-columns.csv";

    public static final String DATE_TIME_CSV = "date-time.csv";

    public static InputMetadata readMetadata(String inputName) {
        InputProvider inputProvider = new LocalInputProvider(INPUTS_PATH);
        return inputProvider.readMetadata(inputName, null);
    }

    public static InputLocal createLocalInput(String inputName) {
        InputMetadata metadata = TestInputs.readMetadata(inputName);
        InputProvider inputProvider = new LocalInputProvider(INPUTS_PATH);
        return new InputLocal(metadata, inputProvider, null);
    }
}
