package com.epam.deltix.quantgrid.engine.service.input.storage.local;

import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCell;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.InputType;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvInputParser;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvOutputWriter;
import com.epam.deltix.quantgrid.engine.service.input.storage.ExcelInputParser;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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
    public List<ExcelCell> preview(String input, Range range, Principal principal) {
        throw new UnsupportedOperationException("Preview is not supported for local input provider");
    }

    @Override
    public ExcelCatalog readExcelCatalog(String path, Principal principal) {
        InputType inputType = InputType.fromName(path);
        if (inputType != InputType.XLSX) {
            throw new IllegalArgumentException("Excel catalog is supported only for XLSX files, but was: " + path);
        }

        try (InputStream stream = Files.newInputStream(Path.of(path))) {
            return ExcelInputParser.readCatalog(stream);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read excel catalog: " + path, e);
        }
    }

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        String[] pair = parseInputString(input);
        Path path = inputsFolder.resolve(pair[0]);
        String query = pair[1];
        InputType inputType = InputType.fromName(pair[0]);

        try (InputStream stream = Files.newInputStream(path)) {
            return switch (inputType) {
                case CSV -> {
                    CsvInputMetadata.CsvTable table = CsvInputParser.inferSchema(stream, true);
                    yield new CsvInputMetadata(path.toString(), null, table);
                }
                case XLSX -> {
                    ExcelTableKey tableKey = ExcelTableKey.fromQuery(query);
                    ExcelInputMetadata.ExcelTable table = ExcelInputParser.inferSchema(stream, tableKey);
                    yield new ExcelInputMetadata(path.toString(), null, tableKey, table);
                }
            };
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read input metadata: " + input, e);
        }
    }

    @Override
    public LocalTable readData(List<String> readColumns, InputMetadata metadata, Principal principal) {
        try (InputStream stream = Files.newInputStream(Path.of(metadata.path()))) {
            if (metadata instanceof CsvInputMetadata csvMetadata) {
                return CsvInputParser.parseCsvInput(stream, csvMetadata.table(), readColumns);
            }

            if (metadata instanceof ExcelInputMetadata excelMetadata) {
                return ExcelInputParser.parseExcelInput(stream, excelMetadata.table(), readColumns);
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

    private static String[] parseInputString(String input) {
        int queryIndex = input.indexOf('?');
        if (queryIndex != StringUtils.INDEX_NOT_FOUND) {
            String path = input.substring(0, queryIndex);
            String query = input.substring(queryIndex + 1);
            return new String[]{path, query};
        } else {
            return new String[]{input, ""};
        }
    }
}
