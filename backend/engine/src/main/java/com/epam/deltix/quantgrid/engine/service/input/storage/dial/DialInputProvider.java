package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvInputParser;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvOutputWriter;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputUtils;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvTable;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.util.ParserException;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

@Slf4j
@AllArgsConstructor
public class DialInputProvider implements InputProvider {
    private final DialFileApi fileApi;
    private final DialSchemaStore schemaStore;

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        URI uri = URI.create(input);
        String path = uri.getRawPath();
        DialFileApi.Attributes attributes = getFileAttributes(principal, path);

        if (!attributes.permissions().contains("READ")) {
            throw new IllegalArgumentException("No access to %s".formatted(input));
        }

        if (attributes.etag() == null) {
            throw new NullPointerException("Missing ETag for %s".formatted(input));
        }

        InputType type = InputType.fromName(path);
        try {
            return switch (type) {
                case CSV -> readCsvMetadata(path, attributes.etag(), principal);
            };
        } catch (IOException e) {
            log.error("Failed to read input metadata for {}", path, e);
            throw new UncheckedIOException("Failed to read input metadata: " + path, e);
        }
    }

    private InputMetadata readCsvMetadata(String path, String etag, Principal principal) throws IOException {
        String schemaPath = InputUtils.getSchemaPath(path, etag);
        CsvTable schema = schemaStore.loadCsvSchema(schemaPath);
        if (schema != null) {
            return new CsvInputMetadata(path, etag, schema.columns());
        }

        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            schemaPath = InputUtils.getSchemaPath(path, stream.etag());
            try (Reader reader = InputUtils.createReader(stream.stream())) {
                List<CsvColumn> columns = measure(
                        () -> CsvInputParser.inferSchema(reader, true),
                        "Inferring csv schema: {}", path);
                schemaStore.storeCsvSchema(schemaPath, new CsvTable(columns));
                return new CsvInputMetadata(path, etag, columns);
            } catch (ParserException e) {
                schemaStore.storeCsvError(schemaPath, e.getMessage());
                throw e;
            }
        }
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        try (EtaggedStream stream = fileApi.readFile(metadata.path(), principal)) {
            if (!Objects.equals(stream.etag(), metadata.etag())) {
                throw new IllegalStateException("File %s has been modified. Expected ETag: %s, but was %s".formatted(
                        metadata.path(), metadata.etag(), stream.etag()));
            }

            if (metadata instanceof CsvInputMetadata csvInputMetadata) {
                return InputUtils.readCsvTable(stream.stream(), readColumns, csvInputMetadata.columns());
            }

            throw new IllegalStateException("Unsupported input metadata type: " + metadata.getClass());
        } catch (IOException e) {
            log.error("Failed to read input file: {}", metadata.path(), e);
            throw new UncheckedIOException("Failed to read input file: " + metadata.path(), e);
        }
    }

    @Override
    @SneakyThrows
    public void writeData(String path, List<String> names, List<StringColumn> values, Principal principal) {
        BodyWriter writer = out -> CsvOutputWriter.write(names, values, out);
        fileApi.writeFile(path, "*", writer, "text/csv", principal);
    }

    @Override
    public String name() {
        return "Dial";
    }

    private DialFileApi.Attributes getFileAttributes(Principal principal, String path) {
        return measure(() -> {
            try {
                return fileApi.getAttributes(path, true, false, null, principal);
            } catch (IOException e) {
                log.error("Cannot check file permissions: {}", path, e);
                return new DialFileApi.Attributes(
                        null, null, null, null, List.of(), null, List.of());
            }
        }, "Reading attributes: {}", path);
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
