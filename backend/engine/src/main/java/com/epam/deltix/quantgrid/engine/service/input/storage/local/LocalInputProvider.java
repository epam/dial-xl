package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.CsvColumn;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvInputParser;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvOutputWriter;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputUtils;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.Principal;
import java.util.List;

@Slf4j
@AllArgsConstructor
public class LocalInputProvider implements InputProvider {
    private final Path inputsFolder;

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        InputType inputType = InputType.fromName(input);
        Path inputPath = inputsFolder.resolve(input);

        try (InputStream stream = Files.newInputStream(inputPath)) {
            return switch (inputType) {
                case CSV -> {
                    try (Reader reader = InputUtils.createReader(stream)) {
                        List<CsvColumn> columns = CsvInputParser.inferSchema(reader, true);
                        yield new CsvInputMetadata(inputPath.toString(), null, columns);
                    }
                }
            };
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read input metadata: " + input, e);
        }
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        try (InputStream stream = Files.newInputStream(Path.of(metadata.path()))) {
            if (metadata instanceof CsvInputMetadata csvInputMetadata) {
                return InputUtils.readCsvTable(stream, readColumns, csvInputMetadata.columns());
            }

            throw new IllegalArgumentException("Unsupported input metadata type: " + metadata.getClass());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read input data: " + metadata.path(), e);
        }
    }

    @Override
    @SneakyThrows
    public void writeData(String path, List<String> names, List<StringColumn> values, Principal principal) {
        Path file = Path.of(path);
        Path folder = file.getParent();

        if (folder != null) {
            Files.createDirectories(folder);
        }

        OpenOption[] options = {StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING};

        try (OutputStream stream = Files.newOutputStream(file, options)) {
            CsvOutputWriter.write(names, values, stream);
        }
    }

    @Override
    public String name() {
        return "Local";
    }
}
