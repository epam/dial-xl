package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.service.parser.CsvInputParser;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@AllArgsConstructor
public class LocalMetadataProvider implements MetadataProvider {

    static final String SCHEMA_EXTENSION = ".schema";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Path inputsFolder;

    @VisibleForTesting
    @Getter
    private final AtomicInteger fetchedSchemas = new AtomicInteger();

    @Override
    public InputMetadata read(String input) {
        Path inputPath = inputsFolder.resolve(input);
        InputType inputType = InputType.fromName(input);
        String schemaName = inputPath.getFileName().toString().replace(inputType.getExtension(), SCHEMA_EXTENSION);
        Path schemaPath =
                inputPath.getParent() == null ? Path.of(schemaName) : inputPath.getParent().resolve(schemaName);

        LinkedHashMap<String, ColumnType> columnTypes;
        if (Files.exists(schemaPath)) {
            log.debug("Loading schema from storage {}", schemaPath);
            columnTypes = readSchema(schemaPath);
            fetchedSchemas.incrementAndGet();
        } else {
            // Avoid using Files.newBufferedReader(inputPath) https://stackoverflow.com/a/43446789
            try (Reader reader = new BufferedReader(new InputStreamReader(new FileInputStream(inputPath.toFile())))) {
                columnTypes = switch (inputType) {
                    case CSV -> CsvInputParser.inferSchema(reader, true);
                };
                writeSchema(schemaPath, columnTypes);
            } catch (IOException e) {
                log.error("Failed to parse input file: " + inputPath.toAbsolutePath(), e);
                throw new UncheckedIOException(e);
            }
        }

        return new InputMetadata(input, inputPath.toString(), inputType, columnTypes);
    }

    private LinkedHashMap<String, ColumnType> readSchema(Path schemaPath) {
        try {
            String data = Files.readString(schemaPath);
            return MAPPER.readValue(data, new TypeReference<>() {
            });
        } catch (Exception e) {
            log.error("Failed to read schema %s from disk".formatted(schemaPath), e);
            try {
                Files.delete(schemaPath);
            } catch (IOException ex) {
                log.warn("Failed to clean up schema {}", schemaPath);
                // ignore
            }
            throw new RuntimeException(e);
        }
    }

    private void writeSchema(Path schemaPath, LinkedHashMap<String, ColumnType> schema) {
        try {
            Files.writeString(schemaPath, MAPPER.writeValueAsString(schema));
        } catch (IOException e) {
            log.error("Failed to write schema %s".formatted(schemaPath), e);
            try {
                Files.delete(schemaPath);
            } catch (IOException ex) {
                log.warn("Failed to clean up schema {}", schemaPath);
            }
            // ignore
        }
    }
}
