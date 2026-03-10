package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.Result;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv.CsvSchemaFile;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.excel.ExcelSchemaFile;
import com.epam.deltix.quantgrid.util.BodyWriter;
import com.epam.deltix.quantgrid.util.DialFileApi;
import com.epam.deltix.quantgrid.util.EtaggedStream;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DatabindException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.ConcurrentModificationException;
import java.util.LinkedHashMap;
import java.util.function.UnaryOperator;
import javax.annotation.PostConstruct;

@Slf4j
@RequiredArgsConstructor
public class DialSchemaStore {
    private static final TypeReference<CsvSchemaFile> CSV_TYPE_REFERENCE = new TypeReference<>() {
    };
    private static final int MAX_WRITE_ATTEMPTS = 3;
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false);

    private final Clock clock;
    private final DialFileApi fileApi;
    private final Principal principal;
    private final String folder;
    private final Duration updateAfter;
    private final Duration deleteAfter;
    private String basePath;

    @PostConstruct
    public void init() throws IOException {
        basePath = "files/" + fileApi.getBucket(principal) + "/" + StringUtils.strip(folder, "/") + "/";
    }

    public CsvInputMetadata.CsvTable loadCsvSchema(String path) {
        String fullPath = getFullPath(path);
        try {
            CsvSchemaFile file = loadWithEtag(fullPath, CsvSchemaFile.EMPTY).getValue();
            Result<CsvInputMetadata.CsvTable> entry = file.entry();
            if (entry != null) {
                long now = clock.millis();
                if (now > entry.timestamp() + updateAfter.toMillis()) {
                    storeSchemaFile(path, CsvSchemaFile.EMPTY, existing -> existing.withEntry(entry.withTimestamp(now)));
                }

                return entry.getValueOrThrow();
            }
        } catch (Exception e) {
            log.error("Failed to load schema file: {}", fullPath, e);
        }

        return null;
    }

    public void storeCsvSchema(String path, CsvInputMetadata.CsvTable schema) {
        Result<CsvInputMetadata.CsvTable> entry = Result.value(schema, clock.millis());
        storeSchemaFile(path, CsvSchemaFile.EMPTY, existing -> existing.withEntry(entry));
    }

    public void storeCsvSchemaError(String path, String error) {
        Result<CsvInputMetadata.CsvTable> result = Result.error(error, clock.millis());
        storeSchemaFile(path, CsvSchemaFile.EMPTY, existing -> existing.withEntry(result));
    }

    public ExcelCatalog loadExcelCatalog(String path) {
        String fullPath = getFullPath(path);
        try {
            ExcelSchemaFile file = loadWithEtag(fullPath, ExcelSchemaFile.EMPTY).getValue();
            Result<ExcelCatalog> catalog = file.catalog();
            if (catalog != null) {
                long now = clock.millis();
                if (now > catalog.timestamp() + updateAfter.toMillis()) {
                    storeSchemaFile(path, ExcelSchemaFile.EMPTY, existing -> existing.withCatalog(catalog.withTimestamp(now)));
                }
                return catalog.getValueOrThrow();
            }
        } catch (Exception e) {
            log.error("Failed to load schema file: {}", fullPath, e);
        }

        return null;
    }

    public void storeExcelCatalog(String path, ExcelCatalog catalog) {
        Result<ExcelCatalog> result = Result.value(catalog, clock.millis());
        storeSchemaFile(path, ExcelSchemaFile.EMPTY, existing -> existing.withCatalog(result));
    }

    public void storeExcelCatalogError(String path, String error) {
        Result<ExcelCatalog> result = Result.error(error, clock.millis());
        storeSchemaFile(path, ExcelSchemaFile.EMPTY, existing -> existing.withCatalog(result));
    }

    public ExcelInputMetadata.ExcelTable loadExcelSchema(String path, ExcelTableKey key) {
        String fullPath = getFullPath(path);
        try {
            ExcelSchemaFile file = loadWithEtag(fullPath, ExcelSchemaFile.EMPTY).getValue();
            Result<ExcelInputMetadata.ExcelTable> entry = file.entries().get(key.format());
            if (entry != null) {
                long now = clock.millis();
                if (now > entry.timestamp() + updateAfter.toMillis()) {
                    storeExcelSchemaFile(path, existing -> existing.withEntry(key.format(), entry.withTimestamp(now)));
                }

                return entry.getValueOrThrow();
            }
        } catch (Exception e) {
            log.error("Failed to load schema file: {}", fullPath, e);
        }

        return null;
    }

    public void storeExcelSchema(String path, ExcelTableKey key, ExcelInputMetadata.ExcelTable schema) {
        Result<ExcelInputMetadata.ExcelTable> entry = new Result<>(schema, null, clock.millis());
        storeExcelSchemaFile(path, existing -> existing.withEntry(key.format(), entry));
    }

    public void storeExcelSchemaError(String path, ExcelTableKey key, String error) {
        Result<ExcelInputMetadata.ExcelTable> entry = new Result<>(null, error, clock.millis());
        storeExcelSchemaFile(path, existing -> existing.withEntry(key.format(), entry));
    }

    private void storeExcelSchemaFile(String path, UnaryOperator<ExcelSchemaFile> resolver) {
        storeSchemaFile(path, ExcelSchemaFile.EMPTY, existing -> resolver.apply(cleanupExcelEntries(existing)));
    }

    private ExcelSchemaFile cleanupExcelEntries(ExcelSchemaFile existing) {
        long now = clock.millis();
        LinkedHashMap<String, Result<ExcelInputMetadata.ExcelTable>> entries = new LinkedHashMap<>();
        existing.entries().forEach((key, value) -> {
            if (now <= value.timestamp() + deleteAfter.toMillis()) {
                entries.put(key, value);
            }
        });
        return new ExcelSchemaFile(existing.catalog(), entries);
    }

    private <T> void storeSchemaFile(String path, T defaultValue, UnaryOperator<T> resolver) {
        String fullPath = getFullPath(path);
        try {
            for (int i = 0; i < MAX_WRITE_ATTEMPTS; ++i) {
                try {
                    Pair<String, T> pair = loadWithEtag(fullPath, defaultValue);
                    T schema = resolver.apply(pair.getValue());
                    log.info("Writing schema to {}", fullPath);
                    BodyWriter bodyWriter = stream -> MAPPER.writeValue(stream, schema);
                    fileApi.writeFile(fullPath, pair.getKey(), bodyWriter, "application/json", principal);
                    return;
                } catch (ConcurrentModificationException e) {
                    log.info("Failed to write schema to {}. Attempt {} of {}.", fullPath, i + 1, MAX_WRITE_ATTEMPTS, e);
                }
            }
            log.info("Failed to write schema to {} after {} attempts.", fullPath, MAX_WRITE_ATTEMPTS);
        } catch (Exception e) {
            log.error("Failed to store schema file: {}", fullPath, e);
        }
    }

    private <T> Pair<String, T> loadWithEtag(String fullPath, T defaultValue)
            throws IOException {
        try (EtaggedStream stream = fileApi.readFile(fullPath, principal)) {
            log.info("Loading schema file: {}", fullPath);
            try {
                @SuppressWarnings("unchecked")
                T schemaFile = MAPPER.readValue(stream.stream(), (Class<T>) defaultValue.getClass());
                return Pair.of(stream.etag(), schemaFile);
            } catch (DatabindException e) {
                log.warn("Failed to deserialize schema file: {}. Returning empty schema file.", fullPath, e);
                return Pair.of(stream.etag(), defaultValue);
            }
        } catch (FileNotFoundException e) {
            log.debug("Schema file not found: {}. Returning empty schema file.", fullPath);
            return Pair.of(null, defaultValue);
        }
    }

    private String getFullPath(String path) {
        return basePath + path;
    }

    public void cleanup() {
        try {
            log.info("Starting cleanup of schema files older than {}", deleteAfter);
            for (DialFileApi.Attributes attributes : fileApi.listAttributes(basePath, principal)) {
                if (clock.millis() > attributes.updatedAt() + deleteAfter.toMillis()) {
                    delete(attributes.fullPath(), attributes.etag());
                }
            }
            log.info("Completed cleanup of expired schema files");
        } catch (Throwable e) {
            log.error("Failed to cleanup expired schema files in {}", basePath, e);
        }
    }

    private void delete(String path, String etag) {
        try {
            fileApi.deleteFile(path, etag, principal);
        } catch (FileNotFoundException e) {
            log.debug("Schema file already deleted: {}", path);
        } catch (Throwable e) {
            log.error("Failed to delete expired schema file at {}", path, e);
        }
    }
}