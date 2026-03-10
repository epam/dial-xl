package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

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
import com.epam.deltix.quantgrid.engine.service.input.storage.InputUtils;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelWorkbook;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.epam.deltix.quantgrid.util.ParserException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.mutable.MutableObject;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.Objects;

@Slf4j
@AllArgsConstructor
public class DialInputProvider implements InputProvider {
    public static final int MAX_WORKBOOK_LOAD_RETRIES = 3;
    private final DialFileApi fileApi;
    private final DialSchemaStore schemaStore;
    private final Cache<String, ExcelWorkbook> workbookCache = Caffeine.newBuilder()
            .softValues()
            .build();

    @Override
    public List<ExcelCell> preview(String input, Range range, Principal principal) {
        URI uri = URI.create(input);
        String path = uri.getRawPath();
        InputType type = InputType.fromName(path);
        if (type != InputType.XLSX) {
            throw new IllegalArgumentException("Preview is supported for XLSX files only.");
        }

        ExcelWorkbook workbook = loadWorkbook(path, principal);
        ExcelTableKey key = ExcelTableKey.fromQuery(uri.getRawQuery());
        return workbook.lookupCells(key, range);
    }

    private ExcelWorkbook loadWorkbook(String path, Principal principal) {
        MutableObject<String> etag = new MutableObject<>(readEtag(path, principal));
        for (int i = 0; i < MAX_WORKBOOK_LOAD_RETRIES; ++i) {
            try {
                return workbookCache.get(path + "@" + etag, k -> {
                    log.info("Loading workbook: {}", path);
                    try (EtaggedStream stream = fileApi.readFile(path, principal)) {
                        if (!Objects.equals(stream.etag(), etag.get())) {
                            throw new EtagMismatchException(stream.etag());
                        }
                        return ExcelInputParser.loadWorkbook(stream.stream());
                    } catch (IOException e) {
                        throw new UncheckedIOException("Failed to load workbook: " + path, e);
                    }
                });
            } catch (EtagMismatchException e) {
                log.warn("Concurrent modification detected while loading workbook: {}. Retrying...", path);
                etag.setValue(e.getEtag());
            }
        }

        throw new IllegalStateException("Failed to load workbook due to concurrent modifications: " + path);
    }

    @Override
    public ExcelCatalog readExcelCatalog(String path, Principal principal) {
        InputType type = InputType.fromName(path);
        if (type != InputType.XLSX) {
            throw new IllegalArgumentException("Excel catalog is supported only for XLSX files, but was: " + path);
        }

        String etag = readEtag(path, principal);
        String schemaPath = InputUtils.getSchemaPath(path, etag);
        ExcelCatalog catalog = schemaStore.loadExcelCatalog(schemaPath);
        if (catalog != null) {
            return catalog;
        }

        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            schemaPath = InputUtils.getSchemaPath(path, stream.etag());
            try {
                catalog = ExcelInputParser.readCatalog(stream.stream());
                schemaStore.storeExcelCatalog(schemaPath, catalog);
                return catalog;
            } catch (ParserException e) {
                schemaStore.storeExcelCatalogError(schemaPath, e.getMessage());
                throw e;
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read Excel file catalog: " + path, e);
        }
    }

    @Override
    public InputMetadata readMetadata(String input, Principal principal) {
        URI uri = URI.create(input);
        String path = uri.getRawPath();
        String etag = readEtag(path, principal);

        InputType type = InputType.fromName(path);
        try {
            return switch (type) {
                case CSV -> readCsvMetadata(path, etag, principal);
                case XLSX -> readExcelMetadata(
                        path, etag, ExcelTableKey.fromQuery(uri.getRawQuery()), principal);
            };
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read input metadata: " + path, e);
        }
    }

    private InputMetadata readCsvMetadata(String path, String etag, Principal principal) throws IOException {
        String schemaPath = InputUtils.getSchemaPath(path, etag);
        CsvInputMetadata.CsvTable table = schemaStore.loadCsvSchema(schemaPath);
        if (table != null) {
            return new CsvInputMetadata(path, etag, table);
        }

        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            schemaPath = InputUtils.getSchemaPath(path, stream.etag());
            try {
                table = CsvInputParser.inferSchema(stream.stream(), true);
                schemaStore.storeCsvSchema(schemaPath, table);
                return new CsvInputMetadata(path, etag, table);
            } catch(ParserException e){
                schemaStore.storeCsvSchemaError(schemaPath, e.getMessage());
                throw e;
            }
        }
    }

    private InputMetadata readExcelMetadata(String path, String etag, ExcelTableKey key, Principal principal) throws IOException {
        String schemaPath = InputUtils.getSchemaPath(path, etag);
        ExcelInputMetadata.ExcelTable table = schemaStore.loadExcelSchema(schemaPath, key);
        if (table != null) {
            return new ExcelInputMetadata(path, etag, key, table);
        }

        try (EtaggedStream stream = fileApi.readFile(path, principal)) {
            schemaPath = InputUtils.getSchemaPath(path, stream.etag());
            try {
                table = ExcelInputParser.inferSchema(stream.stream(), key);
                schemaStore.storeExcelSchema(schemaPath, key, table);
                return new ExcelInputMetadata(path, etag, key, table);
            } catch (ParserException e) {
                schemaStore.storeExcelSchemaError(schemaPath, key, e.getMessage());
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

            if (metadata instanceof CsvInputMetadata csvMetadata) {
                return CsvInputParser.parseCsvInput(stream.stream(), csvMetadata.table(), readColumns);
            }

            if (metadata instanceof ExcelInputMetadata excelMetadata) {
                return ExcelInputParser.parseExcelInput(stream.stream(), excelMetadata.table(), readColumns);
            }

            throw new IllegalStateException("Unsupported input metadata type: " + metadata.getClass());
        } catch (IOException e) {
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

    private String readEtag(String path, Principal principal) {
        try {
            DialFileApi.Attributes attributes = fileApi.getAttributes(path, true, false, null, principal);
            if (!attributes.permissions().contains("READ")) {
                throw new IllegalArgumentException("No access to %s".formatted(path));
            }

            if (attributes.etag() == null) {
                throw new NullPointerException("Missing ETag for %s".formatted(path));
            }

            return attributes.etag();
        } catch (IOException e) {
            throw  new UncheckedIOException("Failed to read metadata for " + path, e);
        }
    }

    public static class EtagMismatchException extends RuntimeException {
        @Getter
        private final String etag;

        public EtagMismatchException(String etag) {
            this.etag = etag;
        }
    }
}
