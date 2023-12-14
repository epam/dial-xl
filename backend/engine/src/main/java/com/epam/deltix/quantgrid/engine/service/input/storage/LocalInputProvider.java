package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.service.parser.CsvInputParser;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.List;

@Slf4j
public class LocalInputProvider implements InputProvider {

    @Override
    public LocalTable read(List<String> readColumns, InputMetadata metadata) {
        Path inputPath = Path.of(metadata.path());

        // Avoid using Files.newBufferedReader(inputPath) https://stackoverflow.com/a/43446789
        try (Reader reader = new BufferedReader(new InputStreamReader(new FileInputStream(inputPath.toFile())))) {
            return switch (metadata.type()) {
                case CSV -> toLocalTable(CsvInputParser.parseCsvInput(reader, readColumns, metadata.columnTypes()));
            };
        } catch (IOException e) {
            log.error("Failed to parse input file: " + inputPath.toAbsolutePath(), e);
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public String name() {
        return "Local";
    }

    private LocalTable toLocalTable(Object[] values) {
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
}
