package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.jetbrains.annotations.Nullable;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@AllArgsConstructor
public class DialInputProvider implements InputProvider {
    private static final String SCHEMA_EXTENSION = ".schema";
    private static final String SCHEMA_PREFIX = ".";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Charset SCHEMA_CHARSET = StandardCharsets.UTF_8;

    private final DialFileApi fileApi;

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        DialFileApi.Attributes attributes = measure(() -> fileApi.getAttributes(input, principal),
                "Reading attributes: {}", input);

        if (!attributes.permissions().contains("READ")) {
            throw new IllegalArgumentException("No access to %s".formatted(input));
        }

        if (attributes.etag() == null) {
            throw new NullPointerException("Missing ETag for %s".formatted(input));
        }

        InputType inputType = InputType.fromName(input);
        String schemaPath = getSchemaFilePath(input);

        Schema schema = measure(() -> readSchema(schemaPath, principal),
                "Reading cached schema: {}", input);

        if (schema != null && attributes.etag().equals(schema.etag)) {
            log.debug("Using cached schema: {}", schemaPath);

            if (schema.error != null) {
                throw new InvalidInputException(schema.etag, schema.error);
            }

            return new InputMetadata(input, input, schema.etag, inputType, schema.columns);
        }

        try {
            InputMetadata metadata = measure(() -> InputUtils.readMetadata(this::getStream, input, input, inputType, principal),
                            "Inferring schema: {}", input);

            measure(() -> writeSchema(schemaPath, new Schema(metadata.columnTypes(), metadata.etag(), null), principal),
                    "Caching schema for valid input: {}", input);

            return metadata;
        } catch (InvalidInputException e) {
            measure(() -> writeSchema(schemaPath, new Schema(null, e.getEtag(), e.getMessage()), principal),
                    "Caching schema for invalid input: {}", input);
            throw e;
        }
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        return InputUtils.readTable(this::getStream, readColumns, metadata, principal);
    }

    @Override
    public String name() {
        return "Dial";
    }

    private EtaggedStream getStream(String inputPath, Principal principal) throws IOException {
        return fileApi.readFile(inputPath, principal);
    }

    private Schema readSchema(String schemaPath, Principal principal) {
        try (EtaggedStream stream = fileApi.readFile(schemaPath, principal)) {
            String text = IOUtils.toString(stream.stream(), SCHEMA_CHARSET);
            return MAPPER.readValue(text, Schema.class);
        } catch (FileNotFoundException e) {
            log.debug("No schema file: {}", schemaPath);
            return null;
        } catch (Exception e) {
            log.error("Failed to read schema {}", schemaPath, e);
            return null;
        }
    }

    private void writeSchema(String schemaPath, Schema schema, Principal principal) {
        try {
            log.debug("Writing schema {}", schemaPath);
            byte[] bytes = MAPPER.writeValueAsString(schema).getBytes(SCHEMA_CHARSET);
            fileApi.writeFile(schemaPath, bytes, "application/json", principal);
        } catch (Exception e) {
            log.error("Failed to write schema {}", schemaPath, e);
        }
    }

    private static String getSchemaFilePath(String inputPath) {
        int nameIndex = inputPath.lastIndexOf("/") + 1;
        String folder = inputPath.substring(0, nameIndex);
        String name = inputPath.substring(nameIndex);
        return folder + SCHEMA_PREFIX + FilenameUtils.removeExtension(name) + SCHEMA_EXTENSION;
    }

    private record Schema(@Nullable LinkedHashMap<String, ColumnType> columns, String etag, @Nullable String error) {
    }

    private static void measure(Runnable function, String message, Object... args) {
        Supplier<?> runnable = () -> {
            function.run();
            return null;
        };

        measure(runnable, message, args);
    }

    private static <T> T measure(Supplier<T> function, String message, Object arg) {
        boolean enabled = log.isDebugEnabled();
        long start = enabled ? System.currentTimeMillis(): 0;
        T result = function.get();
        long end = enabled ? System.currentTimeMillis(): 0;

        if (enabled) {
            log.debug("Time: " + (end - start) + " ms. " + message, arg);
        }

        return result;
    }
}
