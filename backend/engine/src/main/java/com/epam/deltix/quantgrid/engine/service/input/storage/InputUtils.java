package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.util.ParserException;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;

@Slf4j
@UtilityClass
public class InputUtils {
    public static LocalTable readTable(StreamFactory streamFactory, List<String> readColumns, InputMetadata metadata, Principal principal) {
        // Avoid using Files.newBufferedReader(inputPath) https://stackoverflow.com/a/43446789
        try (EtaggedStream stream = streamFactory.getInputStream(metadata.path(), principal);
             Reader reader = new BufferedReader(new InputStreamReader(stream.stream()))) {
            if (!Objects.equals(stream.etag(), metadata.etag())) {
                throw new IllegalStateException("File %s has been modified. Expected ETag: %s, but was %s".formatted(
                        metadata.path(), metadata.etag(), stream.etag()));
            }

            return switch (metadata.type()) {
                case CSV -> toLocalTable(
                        CsvInputParser.parseCsvInput(reader, readColumns, metadata.columnTypes()));
            };
        } catch (IOException e) {
            log.error("Failed to read input file: {}", metadata.path(), e);
            throw new UncheckedIOException("Failed to read input file: " + metadata.name(), e);
        }
    }

    public static InputMetadata readMetadata(StreamFactory streamFactory, String name, String path, InputType type, Principal principal) {
        // Avoid using Files.newBufferedReader(inputPath) https://stackoverflow.com/a/43446789
        try (EtaggedStream stream = streamFactory.getInputStream(path, principal);
             Reader reader = new BufferedReader(new InputStreamReader(stream.stream()))) {

            try {
                LinkedHashMap<String, ColumnType> columnTypes = switch (type) {
                    case CSV -> CsvInputParser.inferSchema(reader);
                };

                return new InputMetadata(name, path, stream.etag(), type, columnTypes);
            } catch (ParserException e) {
                throw new InvalidInputException(stream.etag(), e);
            }

        } catch (IOException e) {
            log.error("Failed to read input file: {}", path, e);
            throw new UncheckedIOException("Failed to read input file: " + name, e);
        }
    }

    private static LocalTable toLocalTable(Object[] values) {
        Column[] columns = new Column[values.length];
        for (int i = 0; i < values.length; i++) {
            Object value = values[i];
            if (value instanceof DoubleArrayList doubles) {
                columns[i] = new DoubleDirectColumn(doubles);
            } else if (value instanceof ObjectArrayList strings) {
                columns[i] = new StringDirectColumn(strings);
            } else {
                throw new UnsupportedOperationException("Unsupported values: " + value.getClass().getSimpleName());
            }
        }

        return new LocalTable(columns);
    }

    public interface StreamFactory {
        EtaggedStream getInputStream(String path, Principal principal) throws IOException;
    }
}
