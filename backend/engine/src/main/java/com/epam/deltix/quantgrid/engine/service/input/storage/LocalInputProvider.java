package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@AllArgsConstructor
public class LocalInputProvider implements InputProvider {
    static final String SCHEMA_EXTENSION = ".schema";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Path inputsFolder;

    @VisibleForTesting
    @Getter
    private final AtomicInteger fetchedSchemas = new AtomicInteger();

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
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

            return new InputMetadata(input, inputPath.toString(), null, inputType, columnTypes);
        }

        InputMetadata metadata = InputUtils.readMetadata(
                LocalInputProvider::getStream, input, inputPath.toString(), inputType, principal);
        writeSchema(schemaPath, metadata.columnTypes());

        return metadata;
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        return InputUtils.readTable(LocalInputProvider::getStream, readColumns, metadata, principal);
    }

    private static EtaggedStream getStream(String path, Principal principal) throws IOException {
        InputStream stream = Files.newInputStream(Path.of(path));
        return new EtaggedStream(stream, stream, null);
    }

    @Override
    public String name() {
        return "Local";
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
