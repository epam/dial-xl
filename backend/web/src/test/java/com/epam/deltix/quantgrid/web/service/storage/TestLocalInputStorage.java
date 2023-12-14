package com.epam.deltix.quantgrid.web.service.storage;

import org.epam.deltix.proto.Api;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

class TestLocalInputStorage {

    private static final Path testInputFilesDirectory = Path.of("build/resources/test/test-inputs");
    private static final Path emptyInputFileDirectory = Path.of("build/storage/inputs");

    private LocalInputStorage inputStorage;

    @Test
    void testLocalInputs() {
        inputStorage = new LocalInputStorage(testInputFilesDirectory);
        Api.InputList inputList = inputStorage.getInputList();
        List<Api.InputFile> actualInputs = inputList.getInputsList();

        Api.InputFile test1Input = Api.InputFile.newBuilder()
                .setInputName("test1.csv")
                .build();

        Api.InputFile countryCsv = Api.InputFile.newBuilder()
                .addPaths("countries")
                .setInputName("country.csv")
                .build();

        Api.InputFile cityCsv = Api.InputFile.newBuilder()
                .addPaths("countries")
                .addPaths("cities")
                .setInputName("city.csv")
                .build();

        MatcherAssert.assertThat(actualInputs, Matchers.containsInAnyOrder(test1Input, countryCsv, cityCsv));
    }

    @Test
    void testEmptyInputFileDirectory() {
        inputStorage = new LocalInputStorage(emptyInputFileDirectory);

        Api.InputList inputList = inputStorage.getInputList();
        List<Api.InputFile> actualInputs = inputList.getInputsList();

        MatcherAssert.assertThat(actualInputs, Matchers.empty());
    }
}
